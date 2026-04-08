import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebhookAction } from '../provider.interface';

// Mock Supabase service role client
const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [{ user_id: 'user_1' }], error: null }),
    }),
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
});
const mockFrom = vi.fn().mockReturnValue({
  upsert: mockUpsert,
  update: mockUpdate,
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }),
  }),
});
const mockSupabase = { from: mockFrom };

vi.mock('@/utils/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/billing', () => ({
  getPaymentProvider: vi.fn(() => ({
    getCustomerEmail: vi.fn().mockResolvedValue('test@example.com'),
  })),
}));

vi.mock('@/lib/server/accounts', () => ({
  ensureDefaultAccountForUserId: vi.fn(),
}));

import { processWebhookAction, isAlreadyProcessed } from '../webhook-handler';

describe('processWebhookAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts subscription row with correct provider name on subscription.updated', async () => {
    const action: WebhookAction = {
      type: 'subscription.updated',
      userId: 'user_1',
      data: {
        providerSubscriptionId: 'sub_123',
        providerCustomerId: 'cust_456',
        customerEmail: 'test@example.com',
        tierId: 'pro',
        status: 'active',
        billingPeriod: 'monthly',
        periodStart: new Date('2026-04-01'),
        periodEnd: new Date('2026-05-01'),
        cancelAtPeriodEnd: false,
        priceAmount: 1199,
        currency: 'usd',
      },
    };

    await processWebhookAction(action, 'lemonsqueezy');

    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user_1',
        tier: 'pro',
        provider: 'lemonsqueezy',
        provider_subscription_id: 'sub_123',
      }),
      { onConflict: 'user_id' }
    );
  });

  it('skips upsert when existing provider is admin', async () => {
    // Override select to return admin provider
    mockFrom.mockReturnValueOnce({
      upsert: mockUpsert,
      update: mockUpdate,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { provider: 'admin' } }),
        }),
      }),
    });

    const action: WebhookAction = {
      type: 'subscription.updated',
      userId: 'user_1',
      data: {
        providerSubscriptionId: 'sub_123',
        providerCustomerId: 'cust_456',
        customerEmail: 'test@example.com',
        tierId: 'pro',
        status: 'active',
        billingPeriod: 'monthly',
        periodStart: new Date('2026-04-01'),
        periodEnd: new Date('2026-05-01'),
        cancelAtPeriodEnd: false,
        priceAmount: 1199,
        currency: 'usd',
      },
    };

    await processWebhookAction(action, 'lemonsqueezy');

    // Should NOT have called upsert
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('updates cancel_at_period_end on subscription.canceled', async () => {
    const action: WebhookAction = {
      type: 'subscription.canceled',
      providerSubscriptionId: 'sub_123',
      providerCustomerId: 'cust_456',
      periodEnd: new Date('2026-05-01'),
      cancelAtPeriodEnd: true,
      userId: 'user_1',
    };

    await processWebhookAction(action, 'lemonsqueezy');

    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_at_period_end: true,
      })
    );
  });

  it('sets status to canceled on subscription.revoke', async () => {
    const action: WebhookAction = {
      type: 'subscription.revoke',
      providerSubscriptionId: 'sub_123',
      providerCustomerId: 'cust_456',
      userId: 'user_1',
    };

    await processWebhookAction(action, 'lemonsqueezy');

    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' })
    );
  });

  it('does nothing for ignore action', async () => {
    const action: WebhookAction = { type: 'ignore' };

    await processWebhookAction(action, 'lemonsqueezy');

    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('isAlreadyProcessed', () => {
  it('returns false for new key, true for duplicate', () => {
    const key = `test-idempotency-${Date.now()}`;
    expect(isAlreadyProcessed(key)).toBe(false);
    expect(isAlreadyProcessed(key)).toBe(true);
  });

  it('returns false for different keys', () => {
    const key1 = `key-a-${Date.now()}`;
    const key2 = `key-b-${Date.now()}`;
    expect(isAlreadyProcessed(key1)).toBe(false);
    expect(isAlreadyProcessed(key2)).toBe(false);
  });
});
