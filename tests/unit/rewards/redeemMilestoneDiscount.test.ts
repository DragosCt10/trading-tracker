/**
 * Tests for redeemMilestoneDiscount and redeemProRetentionDiscount in rewards.ts.
 *
 * Key behaviors under test:
 * - Auth guards (UNAUTHORIZED, NOT_FOUND, NOT_EARNED, ALREADY_USED)
 * - Idempotency: second call with same milestoneId returns existing couponCode without re-calling Polar
 * - Provider integration: coupon code is generated via crypto.randomBytes (not Math.random)
 * - PRO loyalty: 3-month check, idempotency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock all external dependencies of rewards.ts ─────────────────────────────

vi.mock('@/lib/server/session');
vi.mock('@/lib/server/settings');
vi.mock('@/lib/billing');
vi.mock('@/lib/server/subscription');

import { getCachedUserSession } from '@/lib/server/session';
import { getFeatureFlags, updateFeatureFlags } from '@/lib/server/settings';
import { getPaymentProvider } from '@/lib/billing';
import { resolveSubscription } from '@/lib/server/subscription';
import { redeemMilestoneDiscount, redeemProRetentionDiscount } from '@/lib/server/rewards';

const mockedGetSession = vi.mocked(getCachedUserSession);
const mockedGetFlags = vi.mocked(getFeatureFlags);
const mockedUpdateFlags = vi.mocked(updateFeatureFlags);
const mockedGetProvider = vi.mocked(getPaymentProvider);
const mockedResolveSubscription = vi.mocked(resolveSubscription);

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user-123', email: 'test@example.com' };

function makeProvider(code = 'GENERATED-CODE') {
  return { createDiscountCode: vi.fn().mockResolvedValue({ code }) };
}

function nMonthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

// ── redeemMilestoneDiscount ───────────────────────────────────────────────────

describe('redeemMilestoneDiscount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue({ user: MOCK_USER } as Awaited<ReturnType<typeof getCachedUserSession>>);
    mockedUpdateFlags.mockResolvedValue(undefined);
  });

  // ─── Auth guards ──────────────────────────────────────────────────────────

  it('returns UNAUTHORIZED when there is no user session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns NOT_FOUND for an unknown milestone id', async () => {
    // TypeScript would catch this at compile time, but the runtime guard exists too
    const result = await redeemMilestoneDiscount('nonexistent_trader' as never);

    expect(result).toMatchObject({ code: 'NOT_FOUND' });
  });

  // ─── Eligibility guards ───────────────────────────────────────────────────

  it('returns NOT_EARNED when available_discounts is empty', async () => {
    mockedGetFlags.mockResolvedValue({ available_discounts: [] });

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'NOT_EARNED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  it('returns NOT_EARNED when the milestone entry is absent from available_discounts', async () => {
    mockedGetFlags.mockResolvedValue({
      // skilled_trader present, but rookie_trader is missing
      available_discounts: [{ milestoneId: 'skilled_trader', discountPct: 10, used: false }],
    });

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'NOT_EARNED' });
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

  it('returns existing couponCode without calling provider when already generated', async () => {
    const provider = makeProvider('ROOKIE-ALREADY-THERE');
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false, couponCode: 'ROOKIE-ALREADY-THERE' },
      ],
    });
    mockedGetProvider.mockReturnValue(provider as ReturnType<typeof getPaymentProvider>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ couponCode: 'ROOKIE-ALREADY-THERE' });
    // Provider must NOT be called — this is the idempotency guard
    expect(provider.createDiscountCode).not.toHaveBeenCalled();
    // flags must NOT be updated — no side effects
    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });

  // ─── Successful first redemption ──────────────────────────────────────────

  it('calls provider and persists couponCode on first redemption', async () => {
    const provider = makeProvider('ROOKIE-FRESH');
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false },
      ],
    });
    mockedGetProvider.mockReturnValue(provider as ReturnType<typeof getPaymentProvider>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ couponCode: 'ROOKIE-FRESH' });

    // Provider called with correct discount
    expect(provider.createDiscountCode).toHaveBeenCalledOnce();
    expect(provider.createDiscountCode).toHaveBeenCalledWith(
      expect.objectContaining({ discountPct: 5 }),
    );

    // Flags updated with couponCode persisted
    expect(mockedUpdateFlags).toHaveBeenCalledOnce();
    const savedFlags = mockedUpdateFlags.mock.calls[0][1] as { available_discounts: Array<Record<string, unknown>> };
    const saved = savedFlags.available_discounts.find((d) => d.milestoneId === 'rookie_trader');
    expect(saved?.couponCode).toBe('ROOKIE-FRESH');
    expect(saved?.generatedAt).toBeDefined();
  });

  it('preserves other discounts in available_discounts when saving the new couponCode', async () => {
    const provider = makeProvider('EXPERT-NEW');
    mockedGetFlags.mockResolvedValue({
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: true, couponCode: 'ROOKIE-USED' },
        { milestoneId: 'skilled_trader', discountPct: 10, used: false, couponCode: 'SKILLED-ACTIVE' },
        { milestoneId: 'expert_trader', discountPct: 15, used: false }, // the one being redeemed
      ],
    });
    mockedGetProvider.mockReturnValue(provider as ReturnType<typeof getPaymentProvider>);

    await redeemMilestoneDiscount('expert_trader');

    const savedFlags = mockedUpdateFlags.mock.calls[0][1] as { available_discounts: Array<Record<string, unknown>> };
    const discounts = savedFlags.available_discounts;

    // Other discounts must be untouched
    const rookie = discounts.find((d) => d.milestoneId === 'rookie_trader');
    expect(rookie?.couponCode).toBe('ROOKIE-USED');
    expect(rookie?.used).toBe(true);

    const skilled = discounts.find((d) => d.milestoneId === 'skilled_trader');
    expect(skilled?.couponCode).toBe('SKILLED-ACTIVE');

    const expert = discounts.find((d) => d.milestoneId === 'expert_trader');
    expect(expert?.couponCode).toBe('EXPERT-NEW');
  });

  // ─── Coupon code format ───────────────────────────────────────────────────

  it('generates a coupon code with the milestone prefix', async () => {
    const provider = { createDiscountCode: vi.fn().mockResolvedValue({ code: 'CAPTURED' }) };
    mockedGetFlags.mockResolvedValue({
      available_discounts: [{ milestoneId: 'rookie_trader', discountPct: 5, used: false }],
    });
    mockedGetProvider.mockReturnValue(provider as ReturnType<typeof getPaymentProvider>);

    await redeemMilestoneDiscount('rookie_trader');

    // The generated code passed to provider should start with the tier prefix
    const passedCode: string = provider.createDiscountCode.mock.calls[0][0].code;
    expect(passedCode).toMatch(/^ROOKIE/);
  });

  it('uses hex characters in suffix (crypto.randomBytes, not Math.random base36)', async () => {
    const provider = { createDiscountCode: vi.fn().mockResolvedValue({ code: 'CAPTURED' }) };
    mockedGetFlags.mockResolvedValue({
      available_discounts: [{ milestoneId: 'alpha_trader', discountPct: 25, used: false }],
    });
    mockedGetProvider.mockReturnValue(provider as ReturnType<typeof getPaymentProvider>);

    await redeemMilestoneDiscount('alpha_trader');

    const passedCode: string = provider.createDiscountCode.mock.calls[0][0].code;
    // crypto.randomBytes(6).toString('hex').toUpperCase() → 12 hex chars, all 0-9 A-F
    // Math.random().toString(36) would produce chars beyond F (G-Z)
    // Prefix is 'ALPHA', suffix should be hex only
    const suffix = passedCode.replace(/^ALPHA/, '');
    expect(suffix).toMatch(/^[0-9A-F]+$/);
  });

  // ─── Provider errors ──────────────────────────────────────────────────────

  it('returns PROVIDER_ERROR and does not update flags when provider throws', async () => {
    const provider = { createDiscountCode: vi.fn().mockRejectedValue(new Error('Polar is down')) };
    mockedGetFlags.mockResolvedValue({
      available_discounts: [{ milestoneId: 'rookie_trader', discountPct: 5, used: false }],
    });
    mockedGetProvider.mockReturnValue(provider as ReturnType<typeof getPaymentProvider>);

    const result = await redeemMilestoneDiscount('rookie_trader');

    expect(result).toMatchObject({ code: 'PROVIDER_ERROR' });
    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });
});

// ── redeemProRetentionDiscount ────────────────────────────────────────────────

describe('redeemProRetentionDiscount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue({ user: MOCK_USER } as Awaited<ReturnType<typeof getCachedUserSession>>);
    mockedUpdateFlags.mockResolvedValue(undefined);
  });

  // ─── Auth guards ──────────────────────────────────────────────────────────

  it('returns UNAUTHORIZED when no user session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  // ─── Eligibility ──────────────────────────────────────────────────────────

  it('returns NOT_EARNED when user has no subscription (starter tier)', async () => {
    mockedResolveSubscription.mockResolvedValue({
      isActive: true,
      tier: 'starter',
      createdAt: null,
    } as Awaited<ReturnType<typeof resolveSubscription>>);

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ code: 'NOT_EARNED' });
  });

  it('returns NOT_EARNED when subscription is not active', async () => {
    mockedResolveSubscription.mockResolvedValue({
      isActive: false,
      tier: 'pro',
      createdAt: nMonthsAgo(6),
    } as Awaited<ReturnType<typeof resolveSubscription>>);

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ code: 'NOT_EARNED' });
  });

  it('returns NOT_EARNED when user has been PRO for less than 3 months', async () => {
    mockedResolveSubscription.mockResolvedValue({
      isActive: true,
      tier: 'pro',
      createdAt: nMonthsAgo(1),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({});

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ code: 'NOT_EARNED' });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });

  // ─── 3+ months PRO ───────────────────────────────────────────────────────

  it('returns ALREADY_USED when pro_retention_discount.used is true', async () => {
    mockedResolveSubscription.mockResolvedValue({
      isActive: true,
      tier: 'pro',
      createdAt: nMonthsAgo(4),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({
      pro_retention_discount: { used: true, couponCode: 'PROLOYALTY-SPENT' },
    });

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ code: 'ALREADY_USED' });
  });

  it('returns existing couponCode without calling provider when already generated', async () => {
    const provider = makeProvider('PROLOYALTY-EXISTING');
    mockedResolveSubscription.mockResolvedValue({
      isActive: true,
      tier: 'pro',
      createdAt: nMonthsAgo(4),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({
      pro_retention_discount: { used: false, couponCode: 'PROLOYALTY-EXISTING' },
    });
    mockedGetProvider.mockReturnValue(provider as ReturnType<typeof getPaymentProvider>);

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ couponCode: 'PROLOYALTY-EXISTING' });
    expect(provider.createDiscountCode).not.toHaveBeenCalled();
    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });

  it('calls provider and persists couponCode for eligible user (4+ months PRO)', async () => {
    const provider = makeProvider('PROLOYALTY-NEW');
    mockedResolveSubscription.mockResolvedValue({
      isActive: true,
      tier: 'pro',
      createdAt: nMonthsAgo(5),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({});
    mockedGetProvider.mockReturnValue(provider as ReturnType<typeof getPaymentProvider>);

    const result = await redeemProRetentionDiscount();

    expect(result).toMatchObject({ couponCode: 'PROLOYALTY-NEW' });
    expect(provider.createDiscountCode).toHaveBeenCalledOnce();
    expect(provider.createDiscountCode).toHaveBeenCalledWith(
      expect.objectContaining({ discountPct: 10 }),
    );
    expect(mockedUpdateFlags).toHaveBeenCalledOnce();

    // Saved flags should have the couponCode
    const saved = mockedUpdateFlags.mock.calls[0][1] as { pro_retention_discount: Record<string, unknown> };
    expect(saved.pro_retention_discount.couponCode).toBe('PROLOYALTY-NEW');
    expect(saved.pro_retention_discount.used).toBe(false);
  });

  it('loyalty coupon code starts with PROLOYALTY prefix', async () => {
    const provider = { createDiscountCode: vi.fn().mockResolvedValue({ code: 'CAPTURED' }) };
    mockedResolveSubscription.mockResolvedValue({
      isActive: true,
      tier: 'pro',
      createdAt: nMonthsAgo(4),
    } as Awaited<ReturnType<typeof resolveSubscription>>);
    mockedGetFlags.mockResolvedValue({});
    mockedGetProvider.mockReturnValue(provider as ReturnType<typeof getPaymentProvider>);

    await redeemProRetentionDiscount();

    const passedCode: string = provider.createDiscountCode.mock.calls[0][0].code;
    expect(passedCode).toMatch(/^PROLOYALTY/);
  });
});
