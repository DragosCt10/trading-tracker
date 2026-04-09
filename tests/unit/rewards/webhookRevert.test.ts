/**
 * Tests for revertDiscountedVariantIfNeeded in webhook-handler.ts (post-SC3).
 *
 * Key behaviors:
 * - revertAttempts incremented BEFORE the API call (pre-fail tracking)
 * - markDiscountUsed called AFTER switchSubscriptionVariant succeeds (not before)
 * - Bails at 3 attempts (leaves row for page-load safety check)
 * - Discount marked as used only on success
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/server/discounts');
vi.mock('@/lib/billing');

import {
  getPendingRevertBySubscription,
  incrementRevertAttempts,
  markDiscountUsed,
} from '@/lib/server/discounts';
import { getPaymentProvider } from '@/lib/billing';
import type { UserDiscount } from '@/types/userDiscount';

const mockedGetPendingRevert = vi.mocked(getPendingRevertBySubscription);
const mockedIncrementAttempts = vi.mocked(incrementRevertAttempts);
const mockedMarkUsed = vi.mocked(markDiscountUsed);
const mockedGetProvider = vi.mocked(getPaymentProvider);

// We test the internal function by exercising it through processWebhookAction
import { processWebhookAction } from '@/lib/billing/webhook-handler';

// Mock supabase for the subscription upsert path
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
      priceAmount: 1199,
      currency: 'USD',
    },
  } as Parameters<typeof processWebhookAction>[0];
}

function makePendingRevert(overrides: Partial<UserDiscount> = {}): UserDiscount {
  return {
    id: 'discount-row-1',
    userId: 'user-1',
    discountType: 'milestone',
    milestoneId: 'rookie_trader',
    discountPct: 5,
    used: false,
    couponCode: 'ROOKIE-CODE',
    generatedAt: new Date().toISOString(),
    expiresAt: null,
    achievedAt: null,
    revertSubscriptionId: 'sub-test',
    revertNormalVariantId: 'NORMAL-VARIANT',
    revertDiscountedVariantId: 'DISC-VARIANT',
    revertAppliedAt: new Date().toISOString(),
    revertAttempts: 0,
    ...overrides,
  };
}

describe('revertDiscountedVariantIfNeeded (via processWebhookAction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIncrementAttempts.mockResolvedValue(1);
    mockedMarkUsed.mockResolvedValue(undefined);
  });

  it('does nothing when no pending revert exists', async () => {
    mockedGetPendingRevert.mockResolvedValue(null);
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: vi.fn(),
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    expect(mockedIncrementAttempts).not.toHaveBeenCalled();
    expect(mockedMarkUsed).not.toHaveBeenCalled();
  });

  it('increments revertAttempts BEFORE calling the provider API', async () => {
    const callOrder: string[] = [];
    mockedGetPendingRevert.mockResolvedValue(makePendingRevert());
    mockedIncrementAttempts.mockImplementation(async () => {
      callOrder.push('increment');
      return 1;
    });
    const switchVariant = vi.fn().mockImplementation(async () => {
      callOrder.push('switch');
    });
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: switchVariant,
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    expect(callOrder).toEqual(['increment', 'switch']);
  });

  it('marks discount as used AFTER successful API call', async () => {
    const callOrder: string[] = [];
    mockedGetPendingRevert.mockResolvedValue(makePendingRevert());
    mockedIncrementAttempts.mockImplementation(async () => {
      callOrder.push('increment');
      return 1;
    });
    const switchVariant = vi.fn().mockImplementation(async () => {
      callOrder.push('switch');
    });
    mockedMarkUsed.mockImplementation(async () => {
      callOrder.push('mark-used');
    });
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: switchVariant,
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    expect(callOrder).toEqual(['increment', 'switch', 'mark-used']);
    expect(mockedMarkUsed).toHaveBeenCalledWith('discount-row-1');
  });

  it('does NOT mark used when provider API fails (leaves row for retry)', async () => {
    mockedGetPendingRevert.mockResolvedValue(makePendingRevert({ revertAttempts: 1 }));
    const switchVariant = vi.fn().mockRejectedValue(new Error('LS API down'));
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: switchVariant,
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    // Attempts incremented (pre-API), but markDiscountUsed never called
    expect(mockedIncrementAttempts).toHaveBeenCalledOnce();
    expect(mockedMarkUsed).not.toHaveBeenCalled();
  });

  it('bails without calling API when revertAttempts >= 3', async () => {
    mockedGetPendingRevert.mockResolvedValue(makePendingRevert({ revertAttempts: 3 }));
    const switchVariant = vi.fn();
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: switchVariant,
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    expect(switchVariant).not.toHaveBeenCalled();
    expect(mockedIncrementAttempts).not.toHaveBeenCalled();
    expect(mockedMarkUsed).not.toHaveBeenCalled();
  });

  it('uses the correct variant ID (from the DB row, not feature flags)', async () => {
    mockedGetPendingRevert.mockResolvedValue(
      makePendingRevert({ revertNormalVariantId: 'CUSTOM-NORMAL-ID' }),
    );
    const switchVariant = vi.fn().mockResolvedValue(undefined);
    mockedGetProvider.mockReturnValue({
      switchSubscriptionVariant: switchVariant,
    } as unknown as ReturnType<typeof getPaymentProvider>);

    await processWebhookAction(makeWebhookAction('user-1', 'sub-test'), 'lemonsqueezy');

    expect(switchVariant).toHaveBeenCalledWith('sub-test', 'CUSTOM-NORMAL-ID');
  });
});
