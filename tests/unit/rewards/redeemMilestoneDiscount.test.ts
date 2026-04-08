/**
 * Tests for rewards.ts server actions:
 *   - redeemMilestoneDiscount
 *   - redeemProRetentionDiscount
 *   - redeemActivityDiscount        (NEW: activity rank-up flow)
 *   - applyDiscountToSubscription   (NEW: variant-switch flow for PRO subscribers)
 *
 * Key behaviors under test:
 * - Auth guards (UNAUTHORIZED, NOT_FOUND, NOT_EARNED, ALREADY_USED)
 * - Idempotency: second call returns existing code/state without re-hitting provider
 * - Coupon code format: crypto.randomBytes hex prefix, not Math.random base36
 * - applyDiscountToSubscription: calls switchSubscriptionVariant and stores
 *   pending_variant_revert in feature_flags; auto-revert is handled by webhook
 * - redeemActivityDiscount: server-side count gate (300 threshold) + coupon flow
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks (hoisted before any imports) ───────────────────────────────────────

vi.mock('@/lib/server/session');
vi.mock('@/lib/server/settings');
vi.mock('@/lib/billing');
vi.mock('@/lib/server/subscription');
vi.mock('@/lib/server/feedActivity');
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/constants/discountedVariants', () => ({ getDiscountedVariantId: vi.fn() }));
vi.mock('@/lib/server/supabaseAdmin');
vi.mock('@/constants/tiers', () => ({
  TIER_DEFINITIONS: {
    pro: {
      id: 'pro',
      pricing: {
        monthly: { productId: 'PRO-MONTHLY-NORMAL' },
        annual:  { productId: 'PRO-ANNUAL-NORMAL' },
      },
    },
    starter: { id: 'starter', pricing: {} },
  },
}));

import { getCachedUserSession } from '@/lib/server/session';
import { getFeatureFlags, updateFeatureFlags } from '@/lib/server/settings';
import { getPaymentProvider } from '@/lib/billing';
import { resolveSubscription } from '@/lib/server/subscription';
import { getUserActivityCount } from '@/lib/server/feedActivity';
import { createClient } from '@/utils/supabase/server';
import { getDiscountedVariantId } from '@/constants/discountedVariants';
import { createAdminClient as createAdminClientForActivity } from '@/lib/server/supabaseAdmin';
import {
  redeemMilestoneDiscount,
  redeemProRetentionDiscount,
  redeemActivityDiscount,
  applyDiscountToSubscription,
} from '@/lib/server/rewards';

// ── Typed mocks ───────────────────────────────────────────────────────────────

const mockedGetSession                    = vi.mocked(getCachedUserSession);
const mockedGetFlags                      = vi.mocked(getFeatureFlags);
const mockedUpdateFlags                   = vi.mocked(updateFeatureFlags);
const mockedGetProvider                   = vi.mocked(getPaymentProvider);
const mockedResolveSubscription           = vi.mocked(resolveSubscription);
const mockedGetActivityCount              = vi.mocked(getUserActivityCount);
const mockedCreateClient                  = vi.mocked(createClient);
const mockedGetDiscountedId               = vi.mocked(getDiscountedVariantId);
const mockedCreateAdminClientForActivity  = vi.mocked(createAdminClientForActivity);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Builds a mock payment provider. createDiscountCode resolves to { code }. */
function makeProvider(code = 'GENERATED-CODE') {
  return {
    createDiscountCode:       vi.fn().mockResolvedValue({ code }),
    switchSubscriptionVariant: vi.fn().mockResolvedValue(undefined),
  };
}

function nMonthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

/**
 * Builds a chainable Supabase mock for the subscriptions query inside
 * applyDiscountToSubscription:
 *   .from('subscriptions').select(...).eq(...).in(...).order(...).limit(1).maybeSingle()
 */
function buildSupabaseMock(row: Record<string, unknown> | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row });
  const limit  = vi.fn().mockReturnValue({ maybeSingle });
  const order  = vi.fn().mockReturnValue({ limit });
  const inFn   = vi.fn().mockReturnValue({ order });
  const eq     = vi.fn().mockReturnValue({ in: inFn });
  const select = vi.fn().mockReturnValue({ eq });
  return { from: vi.fn().mockReturnValue({ select }) };
}

/** A valid active PRO subscription row returned from Supabase. */
const PRO_MONTHLY_ROW = {
  tier: 'pro',
  billing_period: 'monthly',
  provider: 'lemonsqueezy',
  provider_subscription_id: 'sub-abc',
};

// ─────────────────────────────────────────────────────────────────────────────
// redeemMilestoneDiscount
// ─────────────────────────────────────────────────────────────────────────────

describe('redeemMilestoneDiscount', () => {
  let testUserId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testUserId = `user-${Math.random().toString(36).slice(2, 10)}`;
    mockedGetSession.mockResolvedValue({ user: { id: testUserId, email: 'test@example.com' } } as Awaited<ReturnType<typeof getCachedUserSession>>);
    mockedUpdateFlags.mockResolvedValue(undefined);
  });

  // ─── Auth guards ──────────────────────────────────────────────────────────

  it('returns UNAUTHORIZED when there is no user session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);

    expect(await redeemMilestoneDiscount('rookie_trader')).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns NOT_FOUND for an unknown milestone id', async () => {
    expect(await redeemMilestoneDiscount('nonexistent_trader' as never)).toMatchObject({ code: 'NOT_FOUND' });
  });

  // ─── Eligibility guards ───────────────────────────────────────────────────

  it('returns NOT_EARNED when available_discounts is empty', async () => {
    mockedGetFlags.mockResolvedValue({ available_discounts: [] });

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'NOT_EARNED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  it('returns NOT_EARNED when the specific milestone is absent from available_discounts', async () => {
    mockedGetFlags.mockResolvedValue({
      available_discounts: [{ milestoneId: 'skilled_trader', discountPct: 10, used: false }],
    });

    expect(await redeemMilestoneDiscount('rookie_trader')).toMatchObject({ code: 'NOT_EARNED' });
  });

  it('returns ALREADY_USED when the discount entry has used: true', async () => {
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: true, couponCode: 'SPENT' },
      ],
    });

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'ALREADY_USED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  // ─── Idempotency ──────────────────────────────────────────────────────────

  it('returns existing couponCode without calling the provider when already generated', async () => {
    const provider = makeProvider();
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false, couponCode: 'ROOKIE-ALREADY-THERE' },
      ],
    });
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ couponCode: 'ROOKIE-ALREADY-THERE' });
    expect(provider.createDiscountCode).not.toHaveBeenCalled();
    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });

  it('returns EXPIRED when cached couponCode has past expiresAt', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // yesterday
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false, couponCode: 'ROOKIE-EXPIRED', expiresAt: pastDate },
      ],
    });

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'EXPIRED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  it('returns the coupon code when expiresAt is in the future', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // +7 days
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false, couponCode: 'ROOKIE-VALID', expiresAt: futureDate },
      ],
    });

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ couponCode: 'ROOKIE-VALID' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  // ─── Successful first redemption ──────────────────────────────────────────

  it('calls provider with correct discountPct and persists couponCode on first redemption', async () => {
    const provider = makeProvider('ROOKIE-FRESH');
    mockedGetFlags.mockResolvedValue({
      available_discounts: [{ milestoneId: 'rookie_trader', discountPct: 5, used: false }],
    });
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ couponCode: 'ROOKIE-FRESH' });
    expect(provider.createDiscountCode).toHaveBeenCalledOnce();
    expect(provider.createDiscountCode).toHaveBeenCalledWith(expect.objectContaining({ discountPct: 5 }));
    expect(mockedUpdateFlags).toHaveBeenCalledOnce();

    const savedFlags = mockedUpdateFlags.mock.calls[0][1] as { available_discounts: Array<Record<string, unknown>> };
    const saved = savedFlags.available_discounts.find((d) => d.milestoneId === 'rookie_trader');
    expect(saved?.couponCode).toBe('ROOKIE-FRESH');
    expect(saved?.generatedAt).toBeDefined();
  });

  it('preserves all other discounts in available_discounts when saving a new couponCode', async () => {
    const provider = makeProvider('EXPERT-NEW');
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: true, couponCode: 'ROOKIE-USED' },
        { milestoneId: 'skilled_trader', discountPct: 10, used: false, couponCode: 'SKILLED-ACTIVE' },
        { milestoneId: 'expert_trader', discountPct: 15, used: false },
      ],
    });
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    await redeemMilestoneDiscount('expert_trader');

    const discounts = (mockedUpdateFlags.mock.calls[0][1] as { available_discounts: Array<Record<string, unknown>> }).available_discounts;

    expect(discounts.find((d) => d.milestoneId === 'rookie_trader')?.couponCode).toBe('ROOKIE-USED');
    expect(discounts.find((d) => d.milestoneId === 'skilled_trader')?.couponCode).toBe('SKILLED-ACTIVE');
    expect(discounts.find((d) => d.milestoneId === 'expert_trader')?.couponCode).toBe('EXPERT-NEW');
  });

  // ─── Coupon code format ───────────────────────────────────────────────────

  it('generates a code starting with the uppercase milestone tier prefix', async () => {
    const provider = makeProvider('CAPTURED');
    mockedGetFlags.mockResolvedValue({
      available_discounts: [{ milestoneId: 'rookie_trader', discountPct: 5, used: false }],
    });
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    await redeemMilestoneDiscount('rookie_trader');

    expect(provider.createDiscountCode.mock.calls[0][0].code as string).toMatch(/^ROOKIE/);
  });

  it('uses hex characters in the suffix (crypto.randomBytes, not Math.random base36)', async () => {
    const provider = makeProvider('CAPTURED');
    mockedGetFlags.mockResolvedValue({
      available_discounts: [{ milestoneId: 'alpha_trader', discountPct: 25, used: false }],
    });
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    await redeemMilestoneDiscount('alpha_trader');

    const code = provider.createDiscountCode.mock.calls[0][0].code as string;
    // randomBytes(6).toString('hex').toUpperCase() → 12 chars, 0-9 and A-F only
    expect(code.replace(/^ALPHA/, '')).toMatch(/^[0-9A-F]+$/);
  });

  // ─── Provider errors ──────────────────────────────────────────────────────

  it('returns PROVIDER_ERROR and does not update flags when provider throws', async () => {
    const provider = {
      createDiscountCode: vi.fn().mockRejectedValue(new Error('LS is down')),
      switchSubscriptionVariant: vi.fn(),
    };
    mockedGetFlags.mockResolvedValue({
      available_discounts: [{ milestoneId: 'rookie_trader', discountPct: 5, used: false }],
    });
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'PROVIDER_ERROR' });
    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// redeemProRetentionDiscount
// ─────────────────────────────────────────────────────────────────────────────

describe('redeemProRetentionDiscount', () => {
  let testUserId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testUserId = `user-${Math.random().toString(36).slice(2, 10)}`;
    mockedGetSession.mockResolvedValue({ user: { id: testUserId, email: 'test@example.com' } } as Awaited<ReturnType<typeof getCachedUserSession>>);
    mockedUpdateFlags.mockResolvedValue(undefined);
  });

  // ─── Auth ─────────────────────────────────────────────────────────────────

  it('returns UNAUTHORIZED when no user session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);

    expect(await redeemProRetentionDiscount()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  // ─── Eligibility ──────────────────────────────────────────────────────────

  it('returns NOT_EARNED when user is on starter tier', async () => {
    mockedResolveSubscription.mockResolvedValue({
      isActive: true, tier: 'starter', createdAt: null,
    } as Awaited<ReturnType<typeof resolveSubscription>>);

    expect(await redeemProRetentionDiscount()).toMatchObject({ code: 'NOT_EARNED' });
  });

  it('returns NOT_EARNED when subscription is not active', async () => {
    mockedResolveSubscription.mockResolvedValue({
      isActive: false, tier: 'pro', createdAt: nMonthsAgo(6),
    } as Awaited<ReturnType<typeof resolveSubscription>>);

    expect(await redeemProRetentionDiscount()).toMatchObject({ code: 'NOT_EARNED' });
  });

  it('returns NOT_EARNED when user has been PRO for less than 3 months', async () => {
    mockedResolveSubscription.mockResolvedValue({
      isActive: true, tier: 'pro', createdAt: nMonthsAgo(1),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({});

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ code: 'NOT_EARNED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  // ─── 3+ months PRO ───────────────────────────────────────────────────────

  it('returns ALREADY_USED when pro_retention_discount.used is true', async () => {
    mockedResolveSubscription.mockResolvedValue({
      isActive: true, tier: 'pro', createdAt: nMonthsAgo(4),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({
      pro_retention_discount: { used: true, couponCode: 'PROLOYALTY-SPENT' },
    });

    expect(await redeemProRetentionDiscount()).toMatchObject({ code: 'ALREADY_USED' });
  });

  it('returns existing couponCode without calling provider (idempotency)', async () => {
    const provider = makeProvider();
    mockedResolveSubscription.mockResolvedValue({
      isActive: true, tier: 'pro', createdAt: nMonthsAgo(4),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({
      pro_retention_discount: { used: false, couponCode: 'PROLOYALTY-EXISTING' },
    });
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ couponCode: 'PROLOYALTY-EXISTING' });
    expect(provider.createDiscountCode).not.toHaveBeenCalled();
    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });

  it('returns EXPIRED when pro_retention_discount.couponCode has past expiresAt', async () => {
    const pastDate = new Date(Date.now() - 1).toISOString();
    mockedResolveSubscription.mockResolvedValue({
      isActive: true, tier: 'pro', createdAt: nMonthsAgo(4),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({
      pro_retention_discount: { used: false, couponCode: 'PROLOYALTY-EXPIRED', expiresAt: pastDate },
    });

    expect(await redeemProRetentionDiscount()).toMatchObject({ code: 'EXPIRED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  it('calls provider with 10% discount and persists couponCode for eligible user (4+ months PRO)', async () => {
    const provider = makeProvider('PROLOYALTY-NEW');
    mockedResolveSubscription.mockResolvedValue({
      isActive: true, tier: 'pro', createdAt: nMonthsAgo(5),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({});
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ couponCode: 'PROLOYALTY-NEW' });
    expect(provider.createDiscountCode).toHaveBeenCalledWith(expect.objectContaining({ discountPct: 10 }));
    expect(mockedUpdateFlags).toHaveBeenCalledOnce();

    const saved = (mockedUpdateFlags.mock.calls[0][1] as { pro_retention_discount: Record<string, unknown> }).pro_retention_discount;
    expect(saved.couponCode).toBe('PROLOYALTY-NEW');
    expect(saved.used).toBe(false);
    expect(saved.generatedAt).toBeDefined();
  });

  it('generated code starts with PROLOYALTY prefix', async () => {
    const provider = makeProvider('CAPTURED');
    mockedResolveSubscription.mockResolvedValue({
      isActive: true, tier: 'pro', createdAt: nMonthsAgo(4),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({});
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    await redeemProRetentionDiscount();

    expect(provider.createDiscountCode.mock.calls[0][0].code as string).toMatch(/^PROLOYALTY/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// redeemActivityDiscount
// ─────────────────────────────────────────────────────────────────────────────

describe('redeemActivityDiscount', () => {
  let testUserId: string;
  let mockAdminDb: ReturnType<typeof buildActivityAdminMock>;

  function buildActivityAdminMock(profileData: { id: string } | null) {
    return {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: profileData }),
          }),
        }),
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    testUserId = `user-${Math.random().toString(36).slice(2, 10)}`;
    mockedGetSession.mockResolvedValue({ user: { id: testUserId, email: 'test@example.com' } } as Awaited<ReturnType<typeof getCachedUserSession>>);
    mockedUpdateFlags.mockResolvedValue(undefined);

    // Default: admin client returns a valid profile for the session user
    mockAdminDb = buildActivityAdminMock({ id: 'profile-from-session' });
    mockedCreateAdminClientForActivity.mockReturnValue(mockAdminDb as unknown as ReturnType<typeof createAdminClientForActivity>);
  });

  // ─── Auth ─────────────────────────────────────────────────────────────────

  it('returns UNAUTHORIZED when no user session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);

    expect(await redeemActivityDiscount()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns NOT_FOUND when user has no social profile', async () => {
    mockAdminDb = buildActivityAdminMock(null);
    mockedCreateAdminClientForActivity.mockReturnValue(mockAdminDb as unknown as ReturnType<typeof createAdminClientForActivity>);

    expect(await redeemActivityDiscount()).toMatchObject({ code: 'NOT_FOUND' });
  });

  // ─── Activity count gate ──────────────────────────────────────────────────

  it('returns NOT_EARNED when total activity count is below 300', async () => {
    mockedGetActivityCount.mockResolvedValue({ posts: 150, comments: 100, total: 250 });

    const result = await redeemActivityDiscount();

    expect(result).toMatchObject({ code: 'NOT_EARNED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  it('returns NOT_EARNED at exactly 299 (boundary)', async () => {
    mockedGetActivityCount.mockResolvedValue({ posts: 200, comments: 99, total: 299 });

    expect(await redeemActivityDiscount()).toMatchObject({ code: 'NOT_EARNED' });
  });

  it('allows redemption at exactly 300 (boundary)', async () => {
    mockedGetActivityCount.mockResolvedValue({ posts: 200, comments: 100, total: 300 });
    mockedGetFlags.mockResolvedValue({});
    mockedGetProvider.mockReturnValue(makeProvider('RANKUP-300') as unknown as ReturnType<typeof getPaymentProvider>);

    expect(await redeemActivityDiscount()).toMatchObject({ couponCode: 'RANKUP-300' });
  });

  // ─── Eligibility guards ───────────────────────────────────────────────────

  it('returns ALREADY_USED when activity_rank_up_discount.used is true', async () => {
    mockedGetActivityCount.mockResolvedValue({ posts: 200, comments: 150, total: 350 });
    mockedGetFlags.mockResolvedValue({
      activity_rank_up_discount: { used: true, couponCode: 'RANKUP-SPENT' },
    });

    const result = await redeemActivityDiscount();

    expect(result).toMatchObject({ code: 'ALREADY_USED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  // ─── Idempotency ──────────────────────────────────────────────────────────

  it('returns existing couponCode without calling provider (idempotency)', async () => {
    const provider = makeProvider();
    mockedGetActivityCount.mockResolvedValue({ posts: 200, comments: 150, total: 350 });
    mockedGetFlags.mockResolvedValue({
      activity_rank_up_discount: { used: false, couponCode: 'RANKUP-EXISTING', expiresAt: '2026-12-31T00:00:00Z' },
    });
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemActivityDiscount();

    expect(result).toMatchObject({ couponCode: 'RANKUP-EXISTING' });
    expect(provider.createDiscountCode).not.toHaveBeenCalled();
    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });

  it('returns EXPIRED when activity_rank_up_discount.couponCode has past expiresAt', async () => {
    const pastDate = new Date(Date.now() - 1).toISOString();
    mockedGetActivityCount.mockResolvedValue({ posts: 200, comments: 150, total: 350 });
    mockedGetFlags.mockResolvedValue({
      activity_rank_up_discount: { used: false, couponCode: 'RANKUP-EXPIRED', expiresAt: pastDate },
    });

    expect(await redeemActivityDiscount()).toMatchObject({ code: 'EXPIRED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  // ─── Successful first redemption ──────────────────────────────────────────

  it('calls provider with 15% discount and persists couponCode on first redemption', async () => {
    const provider = makeProvider('RANKUP-NEW');
    mockedGetActivityCount.mockResolvedValue({ posts: 200, comments: 150, total: 350 });
    mockedGetFlags.mockResolvedValue({});
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemActivityDiscount();

    expect(result).toMatchObject({ couponCode: 'RANKUP-NEW' });
    expect(provider.createDiscountCode).toHaveBeenCalledOnce();
    expect(provider.createDiscountCode).toHaveBeenCalledWith(expect.objectContaining({ discountPct: 15 }));
    expect(mockedUpdateFlags).toHaveBeenCalledOnce();

    const saved = (mockedUpdateFlags.mock.calls[0][1] as { activity_rank_up_discount: Record<string, unknown> }).activity_rank_up_discount;
    expect(saved.couponCode).toBe('RANKUP-NEW');
    expect(saved.used).toBe(false);
    expect(saved.generatedAt).toBeDefined();
    expect(saved.expiresAt).toBeDefined();
  });

  it('generated code starts with RANKUP prefix', async () => {
    const provider = makeProvider('CAPTURED');
    mockedGetActivityCount.mockResolvedValue({ posts: 200, comments: 150, total: 350 });
    mockedGetFlags.mockResolvedValue({});
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    await redeemActivityDiscount();

    expect(provider.createDiscountCode.mock.calls[0][0].code as string).toMatch(/^RANKUP/);
  });

  // ─── Provider errors ──────────────────────────────────────────────────────

  it('returns PROVIDER_ERROR and does not update flags when provider throws', async () => {
    const provider = {
      createDiscountCode: vi.fn().mockRejectedValue(new Error('LS is down')),
      switchSubscriptionVariant: vi.fn(),
    };
    mockedGetActivityCount.mockResolvedValue({ posts: 200, comments: 150, total: 350 });
    mockedGetFlags.mockResolvedValue({});
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemActivityDiscount();

    expect(result).toMatchObject({ code: 'PROVIDER_ERROR' });
    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applyDiscountToSubscription
// ─────────────────────────────────────────────────────────────────────────────

describe('applyDiscountToSubscription', () => {
  let testUserId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testUserId = `user-${Math.random().toString(36).slice(2, 10)}`;
    mockedGetSession.mockResolvedValue({ user: { id: testUserId, email: 'test@example.com' } } as Awaited<ReturnType<typeof getCachedUserSession>>);
    const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false, couponCode: 'ROOKIE-VALID', expiresAt: futureExpiry },
      ],
      pro_retention_discount: { used: false, couponCode: 'RETENTION-VALID', expiresAt: futureExpiry },
      activity_rank_up_discount: { used: false, couponCode: 'ACTIVITY-VALID', expiresAt: futureExpiry },
    });
    mockedUpdateFlags.mockResolvedValue(undefined);
    // Default: active PRO monthly subscription
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock(PRO_MONTHLY_ROW) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    // Default: discounted variant exists
    mockedGetDiscountedId.mockReturnValue('PRO-MONTHLY-DISC-5');
  });

  // ─── Auth ─────────────────────────────────────────────────────────────────

  it('returns error when no user session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);

    expect(await applyDiscountToSubscription('rookie_trader')).toMatchObject({
      error: expect.stringContaining('authenticated'),
    });
  });

  // ─── Discount resolution ──────────────────────────────────────────────────

  it('returns error for an unknown milestone id', async () => {
    expect(await applyDiscountToSubscription('nonexistent_trader' as never)).toMatchObject({
      error: expect.stringContaining('Unknown milestone'),
    });
  });

  // ─── Subscription lookup ──────────────────────────────────────────────────

  it('returns error when no active subscription exists in DB', async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    expect(await applyDiscountToSubscription('rookie_trader')).toMatchObject({
      error: expect.stringContaining('No active Lemon Squeezy subscription'),
    });
  });

  it('returns error when provider is not lemonsqueezy', async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({ ...PRO_MONTHLY_ROW, provider: 'stripe' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    expect(await applyDiscountToSubscription('rookie_trader')).toMatchObject({
      error: expect.stringContaining('No active Lemon Squeezy subscription'),
    });
  });

  it('returns error when provider_subscription_id is missing', async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({ ...PRO_MONTHLY_ROW, provider_subscription_id: null }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    expect(await applyDiscountToSubscription('rookie_trader')).toMatchObject({
      error: expect.stringContaining('Subscription ID not found'),
    });
  });

  it('returns error when billing_period is null', async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({ ...PRO_MONTHLY_ROW, billing_period: null }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    expect(await applyDiscountToSubscription('rookie_trader')).toMatchObject({
      error: expect.stringContaining('billing period'),
    });
  });

  // ─── Variant resolution ───────────────────────────────────────────────────

  it('returns error when no discounted variant is configured (env var missing)', async () => {
    mockedGetDiscountedId.mockReturnValue(null);
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await applyDiscountToSubscription('rookie_trader');

    expect(result).toMatchObject({ error: expect.stringContaining('not configured') });
    expect(provider.switchSubscriptionVariant).not.toHaveBeenCalled();
  });

  // ─── Provider ─────────────────────────────────────────────────────────────

  it('returns error and does not store pending_variant_revert when switchSubscriptionVariant throws', async () => {
    const provider = {
      createDiscountCode: vi.fn(),
      switchSubscriptionVariant: vi.fn().mockRejectedValue(new Error('LS API error')),
    };
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await applyDiscountToSubscription('rookie_trader');

    expect(result).toMatchObject({ error: expect.stringContaining('Failed to apply discount') });
    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });

  // ─── Coupon validation guard ──────────────────────────────────────────────

  it('returns error when coupon not yet claimed (no couponCode in flags)', async () => {
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false },
        // no couponCode — not yet claimed
      ],
    });
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await applyDiscountToSubscription('rookie_trader');

    expect(result).toMatchObject({ error: expect.stringContaining('not yet claimed') });
    expect(provider.switchSubscriptionVariant).not.toHaveBeenCalled();
  });

  it('returns error when coupon is already used', async () => {
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: true, couponCode: 'ROOKIE-SPENT' },
      ],
    });
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await applyDiscountToSubscription('rookie_trader');

    expect(result).toMatchObject({ error: expect.stringContaining('already used') });
    expect(provider.switchSubscriptionVariant).not.toHaveBeenCalled();
  });

  it('returns error when coupon is expired (past expiresAt)', async () => {
    const pastDate = new Date(Date.now() - 1).toISOString();
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false, couponCode: 'ROOKIE-EXPIRED', expiresAt: pastDate },
      ],
    });
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await applyDiscountToSubscription('rookie_trader');

    expect(result).toMatchObject({ error: expect.stringContaining('expired') });
    expect(provider.switchSubscriptionVariant).not.toHaveBeenCalled();
  });

  it('allows apply when coupon is valid (has code, not used, not expired)', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false, couponCode: 'ROOKIE-VALID', expiresAt: futureDate },
      ],
    });
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await applyDiscountToSubscription('rookie_trader');

    expect(result).toMatchObject({ success: true });
    expect(provider.switchSubscriptionVariant).toHaveBeenCalledOnce();
  });

  it('validates retention discount: returns error when not claimed', async () => {
    mockedGetFlags.mockResolvedValue({
      pro_retention_discount: { used: false }, // no couponCode
    });
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await applyDiscountToSubscription('retention');

    expect(result).toMatchObject({ error: expect.stringContaining('not yet claimed') });
    expect(provider.switchSubscriptionVariant).not.toHaveBeenCalled();
  });

  // ─── Happy path ───────────────────────────────────────────────────────────

  it('calls switchSubscriptionVariant with the subscription ID and discounted variant ID', async () => {
    mockedGetDiscountedId.mockReturnValue('PRO-MONTHLY-DISC-5');
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    await applyDiscountToSubscription('rookie_trader');

    expect(provider.switchSubscriptionVariant).toHaveBeenCalledOnce();
    expect(provider.switchSubscriptionVariant).toHaveBeenCalledWith('sub-abc', 'PRO-MONTHLY-DISC-5');
  });

  it('returns { success: true } after successful variant switch', async () => {
    mockedGetProvider.mockReturnValue(makeProvider() as unknown as ReturnType<typeof getPaymentProvider>);

    expect(await applyDiscountToSubscription('rookie_trader')).toMatchObject({ success: true });
  });

  it('stores pending_variant_revert in feature_flags with correct shape', async () => {
    mockedGetDiscountedId.mockReturnValue('PRO-MONTHLY-DISC-5');
    mockedGetProvider.mockReturnValue(makeProvider() as unknown as ReturnType<typeof getPaymentProvider>);

    await applyDiscountToSubscription('rookie_trader');

    expect(mockedUpdateFlags).toHaveBeenCalledOnce();
    const saved = (mockedUpdateFlags.mock.calls[0][1] as { pending_variant_revert: Record<string, unknown> }).pending_variant_revert;
    expect(saved.subscriptionId).toBe('sub-abc');
    expect(saved.discountedVariantId).toBe('PRO-MONTHLY-DISC-5');
    expect(saved.normalVariantId).toBe('PRO-MONTHLY-NORMAL');
    expect(saved.discountId).toBe('rookie_trader');
    expect(saved.discountPct).toBe(5);
    expect(saved.appliedAt).toBeDefined();
  });

  it('preserves existing feature_flags when storing pending_variant_revert', async () => {
    const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    mockedGetFlags.mockResolvedValue({
      other_flag: true,
      another: 'value',
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false, couponCode: 'ROOKIE-VALID', expiresAt: futureExpiry },
      ],
    });
    mockedGetProvider.mockReturnValue(makeProvider() as unknown as ReturnType<typeof getPaymentProvider>);

    await applyDiscountToSubscription('rookie_trader');

    const saved = mockedUpdateFlags.mock.calls[0][1] as Record<string, unknown>;
    expect(saved.other_flag).toBe(true);
    expect(saved.another).toBe('value');
    expect(saved.pending_variant_revert).toBeDefined();
  });

  // ─── Discount percentage routing ──────────────────────────────────────────

  it("uses 10% discount for discountId 'retention'", async () => {
    mockedGetProvider.mockReturnValue(makeProvider() as unknown as ReturnType<typeof getPaymentProvider>);

    await applyDiscountToSubscription('retention');

    expect(mockedGetDiscountedId).toHaveBeenCalledWith('pro', 'monthly', 10);
    const saved = (mockedUpdateFlags.mock.calls[0][1] as { pending_variant_revert: Record<string, unknown> }).pending_variant_revert;
    expect(saved.discountPct).toBe(10);
  });

  it("uses 15% discount for discountId 'activity'", async () => {
    mockedGetProvider.mockReturnValue(makeProvider() as unknown as ReturnType<typeof getPaymentProvider>);

    await applyDiscountToSubscription('activity');

    expect(mockedGetDiscountedId).toHaveBeenCalledWith('pro', 'monthly', 15);
    const saved = (mockedUpdateFlags.mock.calls[0][1] as { pending_variant_revert: Record<string, unknown> }).pending_variant_revert;
    expect(saved.discountPct).toBe(15);
  });

  it('uses the milestone discountPct for a trade milestone (rookie_trader = 5%)', async () => {
    mockedGetProvider.mockReturnValue(makeProvider() as unknown as ReturnType<typeof getPaymentProvider>);

    await applyDiscountToSubscription('rookie_trader');

    expect(mockedGetDiscountedId).toHaveBeenCalledWith('pro', 'monthly', 5);
  });

  // ─── Annual billing period ────────────────────────────────────────────────

  it('resolves annual variant IDs and normalVariantId when billing_period is annual', async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({ ...PRO_MONTHLY_ROW, billing_period: 'annual' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    mockedGetDiscountedId.mockReturnValue('PRO-ANNUAL-DISC-5');
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    await applyDiscountToSubscription('rookie_trader');

    expect(mockedGetDiscountedId).toHaveBeenCalledWith('pro', 'annual', 5);
    expect(provider.switchSubscriptionVariant).toHaveBeenCalledWith('sub-abc', 'PRO-ANNUAL-DISC-5');

    const saved = (mockedUpdateFlags.mock.calls[0][1] as { pending_variant_revert: Record<string, unknown> }).pending_variant_revert;
    expect(saved.normalVariantId).toBe('PRO-ANNUAL-NORMAL');
    expect(saved.discountedVariantId).toBe('PRO-ANNUAL-DISC-5');
  });
});
