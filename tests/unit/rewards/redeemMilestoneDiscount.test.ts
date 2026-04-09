/**
 * Tests for rewards.ts server actions (post-SC3 normalization):
 *   - redeemMilestoneDiscount
 *   - redeemProRetentionDiscount
 *   - redeemActivityDiscount
 *   - applyDiscountToSubscription
 *
 * Key behaviors under test:
 * - Auth guards (UNAUTHORIZED, NOT_FOUND, NOT_EARNED, ALREADY_USED)
 * - Idempotency: second call returns existing code without re-hitting provider
 * - cosmetic-expiry-server-bypass fix: expired coupons rejected in idempotency path
 * - apply-without-claim-bypass fix: atomic conditional UPDATE enforces claim-before-apply
 * - Activity and retention flows use the same shared helper as milestone
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks (hoisted) ───────────────────────────────────────────────────────────

vi.mock('@/lib/server/session');
vi.mock('@/lib/server/discounts');
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
        annual: { productId: 'PRO-ANNUAL-NORMAL' },
      },
    },
    starter: { id: 'starter', pricing: {} },
  },
}));

import { getCachedUserSession } from '@/lib/server/session';
import {
  getDiscountByTypeAndMilestone,
  upsertNonMilestoneDiscount,
  claimDiscount,
  setPendingRevert,
} from '@/lib/server/discounts';
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
import type { UserDiscount } from '@/types/userDiscount';

// ── Typed mocks ───────────────────────────────────────────────────────────────

const mockedGetSession = vi.mocked(getCachedUserSession);
const mockedGetDiscount = vi.mocked(getDiscountByTypeAndMilestone);
const mockedUpsertNonMilestone = vi.mocked(upsertNonMilestoneDiscount);
const mockedClaimDiscount = vi.mocked(claimDiscount);
const mockedSetPendingRevert = vi.mocked(setPendingRevert);
const mockedGetProvider = vi.mocked(getPaymentProvider);
const mockedResolveSubscription = vi.mocked(resolveSubscription);
const mockedGetActivityCount = vi.mocked(getUserActivityCount);
const mockedCreateClient = vi.mocked(createClient);
const mockedGetDiscountedId = vi.mocked(getDiscountedVariantId);
const mockedCreateAdminClientForActivity = vi.mocked(createAdminClientForActivity);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProvider(code = 'GENERATED-CODE') {
  return {
    createDiscountCode: vi.fn().mockResolvedValue({ code }),
    switchSubscriptionVariant: vi.fn().mockResolvedValue(undefined),
  };
}

function nMonthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

function makeDiscount(overrides: Partial<UserDiscount> = {}): UserDiscount {
  return {
    id: 'discount-row-1',
    userId: 'user-1',
    discountType: 'milestone',
    milestoneId: 'rookie_trader',
    discountPct: 5,
    used: false,
    couponCode: null,
    generatedAt: null,
    expiresAt: null,
    achievedAt: '2026-01-01T00:00:00Z',
    revertSubscriptionId: null,
    revertNormalVariantId: null,
    revertDiscountedVariantId: null,
    revertAppliedAt: null,
    revertAttempts: 0,
    ...overrides,
  };
}

function buildSupabaseMock(row: Record<string, unknown> | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row });
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const inFn = vi.fn().mockReturnValue({ order });
  const eq = vi.fn().mockReturnValue({ in: inFn });
  const select = vi.fn().mockReturnValue({ eq });
  return { from: vi.fn().mockReturnValue({ select }) };
}

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
    mockedGetSession.mockResolvedValue({
      user: { id: testUserId, email: 'test@example.com' },
    } as Awaited<ReturnType<typeof getCachedUserSession>>);
    mockedClaimDiscount.mockResolvedValue(true);
  });

  it('returns UNAUTHORIZED when there is no user session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);
    expect(await redeemMilestoneDiscount('rookie_trader')).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns NOT_FOUND for an unknown milestone id', async () => {
    expect(await redeemMilestoneDiscount('nonexistent_trader' as never)).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns NOT_EARNED when no discount row exists for the milestone', async () => {
    mockedGetDiscount.mockResolvedValue(null);
    const result = await redeemMilestoneDiscount('rookie_trader');
    expect(result).toMatchObject({ code: 'NOT_EARNED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  it('returns ALREADY_USED when the discount row has used: true', async () => {
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({ used: true, couponCode: 'SPENT', milestoneId: 'rookie_trader' }),
    );
    const result = await redeemMilestoneDiscount('rookie_trader');
    expect(result).toMatchObject({ code: 'ALREADY_USED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  it('returns existing couponCode without calling the provider when already generated', async () => {
    const provider = makeProvider();
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({
        couponCode: 'ROOKIE-ALREADY-THERE',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        milestoneId: 'rookie_trader',
      }),
    );
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ couponCode: 'ROOKIE-ALREADY-THERE' });
    expect(provider.createDiscountCode).not.toHaveBeenCalled();
    expect(mockedClaimDiscount).not.toHaveBeenCalled();
  });

  it('[SECURITY FIX] returns EXPIRED when cached couponCode has past expiresAt (cosmetic-expiry bug)', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({
        couponCode: 'ROOKIE-EXPIRED',
        expiresAt: pastDate,
        milestoneId: 'rookie_trader',
      }),
    );
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'EXPIRED' });
    expect(provider.createDiscountCode).not.toHaveBeenCalled();
  });

  it('generates a new coupon and calls claimDiscount when none exists', async () => {
    const provider = makeProvider('ROOKIE-NEW123');
    mockedGetDiscount.mockResolvedValue(makeDiscount({ milestoneId: 'rookie_trader' }));
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ couponCode: 'ROOKIE-NEW123' });
    expect(provider.createDiscountCode).toHaveBeenCalledOnce();
    expect(provider.createDiscountCode).toHaveBeenCalledWith(
      expect.objectContaining({
        discountPct: 5,
        code: expect.stringMatching(/^ROOKIE[0-9A-F]{12}$/),
      }),
    );
    expect(mockedClaimDiscount).toHaveBeenCalledWith(
      'discount-row-1',
      'ROOKIE-NEW123',
      expect.any(String),
    );
  });

  it('generates coupon codes with crypto hex format (not Math.random base36)', async () => {
    const provider = makeProvider();
    mockedGetDiscount.mockResolvedValue(makeDiscount({ milestoneId: 'rookie_trader' }));
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    await redeemMilestoneDiscount('rookie_trader');

    const generated = provider.createDiscountCode.mock.calls[0][0].code;
    // ROOKIE + 12 hex uppercase = /ROOKIE[0-9A-F]{12}/
    expect(generated).toMatch(/^ROOKIE[0-9A-F]{12}$/);
  });

  it('returns PROVIDER_ERROR when provider.createDiscountCode throws', async () => {
    const provider = {
      createDiscountCode: vi.fn().mockRejectedValue(new Error('LS down')),
      switchSubscriptionVariant: vi.fn(),
    };
    mockedGetDiscount.mockResolvedValue(makeDiscount({ milestoneId: 'rookie_trader' }));
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'PROVIDER_ERROR' });
  });

  it('handles claim race: returns ALREADY_USED when concurrent claim wins', async () => {
    const provider = makeProvider();
    mockedGetDiscount.mockResolvedValue(makeDiscount({ milestoneId: 'rookie_trader' }));
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);
    mockedClaimDiscount.mockResolvedValue(false); // concurrent claim won

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'ALREADY_USED' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// redeemActivityDiscount
// ─────────────────────────────────────────────────────────────────────────────

describe('redeemActivityDiscount', () => {
  let testUserId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testUserId = `user-${Math.random().toString(36).slice(2, 10)}`;
    mockedGetSession.mockResolvedValue({
      user: { id: testUserId, email: 'test@example.com' },
    } as Awaited<ReturnType<typeof getCachedUserSession>>);
    mockedClaimDiscount.mockResolvedValue(true);
    mockedUpsertNonMilestone.mockResolvedValue(undefined);

    // Default: social_profiles lookup returns a profile
    mockedCreateAdminClientForActivity.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-1' } }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createAdminClientForActivity>);
  });

  it('returns UNAUTHORIZED without a session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);
    expect(await redeemActivityDiscount()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns NOT_EARNED when activity count is under 300', async () => {
    mockedGetActivityCount.mockResolvedValue({ posts: 100, comments: 50, total: 150 });
    expect(await redeemActivityDiscount()).toMatchObject({ code: 'NOT_EARNED' });
    expect(mockedUpsertNonMilestone).not.toHaveBeenCalled();
  });

  it('generates a new coupon when count meets threshold', async () => {
    mockedGetActivityCount.mockResolvedValue({ posts: 200, comments: 150, total: 350 });
    mockedGetDiscount.mockResolvedValue(makeDiscount({ discountType: 'activity', milestoneId: '__none__', discountPct: 15 }));
    const provider = makeProvider('RANKUPABCDEF');
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemActivityDiscount();

    expect(result).toMatchObject({ couponCode: 'RANKUPABCDEF' });
    expect(mockedUpsertNonMilestone).toHaveBeenCalledWith(expect.any(String), 'activity', 15);
    expect(provider.createDiscountCode).toHaveBeenCalledWith(
      expect.objectContaining({
        discountPct: 15,
        code: expect.stringMatching(/^RANKUP[0-9A-F]{12}$/),
      }),
    );
  });

  it('[SECURITY FIX] rejects expired idempotent activity coupon (cosmetic-expiry bug)', async () => {
    mockedGetActivityCount.mockResolvedValue({ posts: 200, comments: 150, total: 350 });
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({
        discountType: 'activity',
        milestoneId: '__none__',
        couponCode: 'OLD-EXPIRED',
        expiresAt: pastDate,
      }),
    );
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemActivityDiscount();

    expect(result).toMatchObject({ code: 'EXPIRED' });
    expect(provider.createDiscountCode).not.toHaveBeenCalled();
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
    mockedGetSession.mockResolvedValue({
      user: { id: testUserId, email: 'test@example.com' },
    } as Awaited<ReturnType<typeof getCachedUserSession>>);
    mockedClaimDiscount.mockResolvedValue(true);
    mockedUpsertNonMilestone.mockResolvedValue(undefined);
  });

  it('returns UNAUTHORIZED without a session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);
    expect(await redeemProRetentionDiscount()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns NOT_EARNED when user is not on PRO', async () => {
    mockedResolveSubscription.mockResolvedValue({
      tier: 'starter',
      isActive: false,
      createdAt: null,
    } as Awaited<ReturnType<typeof resolveSubscription>>);

    expect(await redeemProRetentionDiscount()).toMatchObject({ code: 'NOT_EARNED' });
  });

  it('returns NOT_EARNED when PRO subscription is under 3 months old', async () => {
    mockedResolveSubscription.mockResolvedValue({
      tier: 'pro',
      isActive: true,
      createdAt: nMonthsAgo(1),
    } as Awaited<ReturnType<typeof resolveSubscription>>);

    expect(await redeemProRetentionDiscount()).toMatchObject({ code: 'NOT_EARNED' });
  });

  it('generates a new coupon when PRO tenure is ≥ 3 months', async () => {
    mockedResolveSubscription.mockResolvedValue({
      tier: 'pro',
      isActive: true,
      createdAt: nMonthsAgo(4),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({ discountType: 'retention', milestoneId: '__none__', discountPct: 10 }),
    );
    const provider = makeProvider('PROLOYALTY123');
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ couponCode: 'PROLOYALTY123' });
    expect(mockedUpsertNonMilestone).toHaveBeenCalledWith(expect.any(String), 'retention', 10);
    expect(provider.createDiscountCode).toHaveBeenCalledWith(
      expect.objectContaining({
        discountPct: 10,
        code: expect.stringMatching(/^PROLOYALTY[0-9A-F]{12}$/),
      }),
    );
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
    mockedGetSession.mockResolvedValue({
      user: { id: testUserId, email: 'test@example.com' },
    } as Awaited<ReturnType<typeof getCachedUserSession>>);
    mockedSetPendingRevert.mockResolvedValue(true);
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock(PRO_MONTHLY_ROW) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    mockedGetDiscountedId.mockReturnValue('DISC-MONTHLY-5PCT');
    mockedGetProvider.mockReturnValue(
      makeProvider() as unknown as ReturnType<typeof getPaymentProvider>,
    );
  });

  it('returns error without a session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);
    const result = await applyDiscountToSubscription('rookie_trader');
    expect(result).toMatchObject({ error: expect.stringContaining('Not authenticated') });
  });

  it('returns error when discount does not exist', async () => {
    mockedGetDiscount.mockResolvedValue(null);
    const result = await applyDiscountToSubscription('rookie_trader');
    expect(result).toMatchObject({ error: 'Discount not found' });
    expect(mockedSetPendingRevert).not.toHaveBeenCalled();
  });

  it('[SECURITY FIX] returns error when coupon was never claimed (apply-without-claim-bypass)', async () => {
    // User has a discount row but no couponCode — never claimed
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({ milestoneId: 'rookie_trader', couponCode: null }),
    );
    const result = await applyDiscountToSubscription('rookie_trader');
    expect(result).toMatchObject({ error: 'Coupon not yet claimed' });
    expect(mockedSetPendingRevert).not.toHaveBeenCalled();
  });

  it('returns error when discount is already used', async () => {
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({ milestoneId: 'rookie_trader', couponCode: 'X', used: true }),
    );
    const result = await applyDiscountToSubscription('rookie_trader');
    expect(result).toMatchObject({ error: 'Discount already used' });
  });

  it('returns error when coupon has expired', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({
        milestoneId: 'rookie_trader',
        couponCode: 'EXPIRED-CODE',
        expiresAt: pastDate,
      }),
    );
    const result = await applyDiscountToSubscription('rookie_trader');
    expect(result).toMatchObject({ error: 'Coupon has expired' });
  });

  it('reads discountPct from the DB row, not from milestone constants', async () => {
    // Store a non-standard discount_pct in the DB — apply should use THIS, not the milestone default
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({
        milestoneId: 'rookie_trader',
        couponCode: 'ROOKIE-CLAIMED',
        discountPct: 7, // non-standard
      }),
    );
    const provider = makeProvider();
    mockedGetProvider.mockReturnValue(provider as unknown as ReturnType<typeof getPaymentProvider>);

    await applyDiscountToSubscription('rookie_trader');

    // getDiscountedVariantId should be called with the DB's discount_pct (7), not milestone's (5)
    expect(mockedGetDiscountedId).toHaveBeenCalledWith('pro', 'monthly', 7);
  });

  it('calls switchSubscriptionVariant then setPendingRevert on success', async () => {
    const callOrder: string[] = [];
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({ milestoneId: 'rookie_trader', couponCode: 'ROOKIE-CLAIMED' }),
    );
    const switchVariant = vi.fn().mockImplementation(async () => {
      callOrder.push('switch');
    });
    mockedGetProvider.mockReturnValue({
      createDiscountCode: vi.fn(),
      switchSubscriptionVariant: switchVariant,
    } as unknown as ReturnType<typeof getPaymentProvider>);
    mockedSetPendingRevert.mockImplementation(async () => {
      callOrder.push('setPendingRevert');
      return true;
    });

    const result = await applyDiscountToSubscription('rookie_trader');

    expect(result).toMatchObject({ success: true });
    expect(callOrder).toEqual(['switch', 'setPendingRevert']);
    expect(switchVariant).toHaveBeenCalledWith('sub-abc', 'DISC-MONTHLY-5PCT');
  });

  it('returns error when no active subscription is found', async () => {
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({ milestoneId: 'rookie_trader', couponCode: 'CLAIMED' }),
    );
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const result = await applyDiscountToSubscription('rookie_trader');
    expect(result).toMatchObject({ error: expect.stringContaining('No active Lemon Squeezy subscription') });
  });

  it('returns error when discounted variant is not configured', async () => {
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({ milestoneId: 'rookie_trader', couponCode: 'CLAIMED' }),
    );
    mockedGetDiscountedId.mockReturnValue(null);

    const result = await applyDiscountToSubscription('rookie_trader');
    expect(result).toMatchObject({ error: expect.stringContaining('Discounted variant not configured') });
  });

  it('returns error when setPendingRevert conditional UPDATE finds 0 rows', async () => {
    // Race: validation passed but another writer applied first
    mockedGetDiscount.mockResolvedValue(
      makeDiscount({ milestoneId: 'rookie_trader', couponCode: 'CLAIMED' }),
    );
    mockedSetPendingRevert.mockResolvedValue(false);

    const result = await applyDiscountToSubscription('rookie_trader');
    expect(result).toMatchObject({ error: expect.stringContaining('already applied') });
  });
});
