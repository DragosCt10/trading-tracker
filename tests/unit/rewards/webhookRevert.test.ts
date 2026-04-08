/**
 * Tests for revertDiscountedVariantIfNeeded in webhook-handler.ts
 *
 * Key behaviors:
 * - Flag cleared only AFTER switchSubscriptionVariant succeeds (not before)
 * - revertAttempts incremented on each call (failure or success)
 * - Bails at 3 attempts (leaves flag for page-load safety check)
 * - Discount marked as used only on success
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/server/settings');
vi.mock('@/lib/billing');

import { getFeatureFlags, updateFeatureFlags } from '@/lib/server/settings';
import { getPaymentProvider } from '@/lib/billing';

const mockedGetFlags    = vi.mocked(getFeatureFlags);
const mockedUpdateFlags = vi.mocked(updateFeatureFlags);
const mockedGetProvider = vi.mocked(getPaymentProvider);

// We test the internal function by exercising it through processWebhookAction
// with a subscription_payment_success event that matches a pending_variant_revert
import { processWebhookAction } from '@/lib/billing/webhook-handler';

// We also need to mock supabase for the subscription upsert path
vi.mock('@/utils/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      upsert: vi.fn().mockReturnValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ data: [], error: null }) }),
          data: [], error: null,
        }),
      }),
    }),
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
      },
    },
  })),
}));

function makeWebhookAction(userId: string, subscriptionId: string) {
  return {
    type: 'subscription.updated' as const,
    userId,
    originalEvent: 'subscription_payment_success',
    data: {
      tierId: 'pro',
      status: 'active',
      billingPeriod: 'monthly',
      providerSubscriptionId: subscriptionId,
      providerCustomerId: 'cust-abc',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      customerEmail: null,
    },
  };
}

const PENDING_REVERT = {
  subscriptionId: 'sub-test',
  normalVariantId: 'NORMAL-VARIANT',
  discountedVariantId: 'DISC-VARIANT',
  discountPct: 5,
  discountId: 'rookie_trader',
  appliedAt: new Date().toISOString(),
};

describe('revertDiscountedVariantIfNeeded (via processWebhookAction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateFlags.mockResolvedValue(undefined);
  });

  it('does nothing when pending_variant_revert is absent', async () => {
    mockedGetFlags.mockResolvedValue({});
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: vi.fn(),
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });

  it('does nothing when subscriptionId does not match', async () => {
    mockedGetFlags.mockResolvedValue({
      pending_variant_revert: { ...PENDING_REVERT, subscriptionId: 'sub-different' },
    });

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });

  it('increments revertAttempts and writes to DB before API call', async () => {
    const switchVariant = vi.fn().mockResolvedValue(undefined);
    mockedGetFlags.mockResolvedValue({ pending_variant_revert: PENDING_REVERT });
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: switchVariant,
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    // First updateFeatureFlags call increments attempts (before API)
    const firstCall = mockedUpdateFlags.mock.calls[0][1] as Record<string, unknown>;
    const firstPending = firstCall.pending_variant_revert as Record<string, unknown>;
    expect(firstPending.revertAttempts).toBe(1);
    expect(firstPending.subscriptionId).toBe('sub-test'); // flag not cleared yet
  });

  it('clears pending_variant_revert and marks discount used AFTER successful API call', async () => {
    const switchVariant = vi.fn().mockResolvedValue(undefined);
    mockedGetFlags.mockResolvedValue({
      pending_variant_revert: PENDING_REVERT,
      available_discounts: [
        { milestoneId: 'rookie_trader', discountPct: 5, used: false, couponCode: 'ROOKIE-CODE' },
      ],
    });
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: switchVariant,
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    // Should have 2 updateFeatureFlags calls: one to increment attempts, one to clear on success
    expect(mockedUpdateFlags).toHaveBeenCalledTimes(2);
    const successCall = mockedUpdateFlags.mock.calls[1][1] as Record<string, unknown>;

    // Flag cleared
    expect(successCall.pending_variant_revert).toBeNull();

    // Discount marked used
    const discounts = successCall.available_discounts as Array<Record<string, unknown>>;
    expect(discounts.find((d) => d.milestoneId === 'rookie_trader')?.used).toBe(true);
  });

  it('does NOT clear the flag when API call fails — flag preserved for retry', async () => {
    const switchVariant = vi.fn().mockRejectedValue(new Error('LS API down'));
    mockedGetFlags.mockResolvedValue({
      pending_variant_revert: { ...PENDING_REVERT, revertAttempts: 1 },
    });
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: switchVariant,
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    // Only one updateFeatureFlags call (increment attempts) — no second call to clear
    expect(mockedUpdateFlags).toHaveBeenCalledOnce();
    const written = mockedUpdateFlags.mock.calls[0][1] as Record<string, unknown>;
    const pending = written.pending_variant_revert as Record<string, unknown>;
    expect(pending.revertAttempts).toBe(2); // incremented from 1
    expect(pending.subscriptionId).toBe('sub-test'); // flag still present
  });

  it('bails without calling API when revertAttempts >= 3', async () => {
    const switchVariant = vi.fn();
    mockedGetFlags.mockResolvedValue({
      pending_variant_revert: { ...PENDING_REVERT, revertAttempts: 3 },
    });
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: switchVariant,
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    expect(switchVariant).not.toHaveBeenCalled();
    expect(mockedUpdateFlags).not.toHaveBeenCalled();
  });
});
