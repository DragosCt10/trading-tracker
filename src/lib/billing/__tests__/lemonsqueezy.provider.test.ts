import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// Mock the Lemon Squeezy SDK
vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: vi.fn(),
  createCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
  getSubscription: vi.fn(),
  listSubscriptions: vi.fn(),
  listOrders: vi.fn(),
  createDiscount: vi.fn(),
}));

// Mock tier definitions
vi.mock('@/constants/tiers', () => ({
  TIER_DEFINITIONS: {
    starter: { id: 'starter', pricing: { monthly: null, annual: null } },
    pro: {
      id: 'pro',
      pricing: {
        monthly: { usd: 11.99, productId: '111' },
        annual: { usd: 114.99, productId: '222', savingsPct: 20 },
      },
    },
    elite: { id: 'elite', pricing: { monthly: null, annual: null } },
  },
}));

// Mock Supabase service role
vi.mock('@/utils/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => ({
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } } }),
      },
    },
  })),
}));

import { LemonSqueezyProvider } from '../lemonsqueezy.provider';
import {
  createCheckout,
  cancelSubscription,
  createDiscount,
  getSubscription,
} from '@lemonsqueezy/lemonsqueezy.js';

function makeWebhookPayload(eventName: string, attrs: Record<string, unknown> = {}, customData: Record<string, unknown> = {}) {
  return JSON.stringify({
    meta: { event_name: eventName, custom_data: customData },
    data: { id: 'sub_123', attributes: { customer_id: 'cust_456', variant_id: '111', status: 'active', user_email: 'test@example.com', renews_at: '2026-05-01T00:00:00Z', created_at: '2026-04-01T00:00:00Z', currency: 'USD', ...attrs } },
  });
}

function signPayload(rawBody: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

describe('LemonSqueezyProvider', () => {
  let provider: LemonSqueezyProvider;
  const secret = 'test-webhook-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new LemonSqueezyProvider('test-api-key', '12345');
  });

  describe('parseWebhookEvent', () => {
    it('validates signature and maps subscription_created to subscription.updated', async () => {
      const rawBody = makeWebhookPayload('subscription_created', {}, { user_id: 'user_1' });
      const signature = signPayload(rawBody, secret);

      const action = await provider.parseWebhookEvent({
        rawBody,
        headers: { 'x-signature': signature },
        secret,
      });

      expect(action.type).toBe('subscription.updated');
      if (action.type === 'subscription.updated') {
        expect(action.data.tierId).toBe('pro');
        expect(action.data.providerSubscriptionId).toBe('sub_123');
        expect(action.data.status).toBe('active');
        expect(action.userId).toBe('user_1');
      }
    });

    it('throws on invalid signature', async () => {
      const rawBody = makeWebhookPayload('subscription_created');

      await expect(
        provider.parseWebhookEvent({
          rawBody,
          headers: { 'x-signature': 'bad-signature' },
          secret,
        })
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('maps subscription_cancelled to subscription.canceled with grace period', async () => {
      const rawBody = makeWebhookPayload('subscription_cancelled', { ends_at: '2026-05-01T00:00:00Z' });
      const signature = signPayload(rawBody, secret);

      const action = await provider.parseWebhookEvent({ rawBody, headers: { 'x-signature': signature }, secret });

      expect(action.type).toBe('subscription.canceled');
      if (action.type === 'subscription.canceled') {
        expect(action.cancelAtPeriodEnd).toBe(true);
        expect(action.periodEnd.toISOString()).toBe('2026-05-01T00:00:00.000Z');
      }
    });

    it('maps subscription_expired to subscription.revoke', async () => {
      const rawBody = makeWebhookPayload('subscription_expired');
      const signature = signPayload(rawBody, secret);

      const action = await provider.parseWebhookEvent({ rawBody, headers: { 'x-signature': signature }, secret });
      expect(action.type).toBe('subscription.revoke');
    });

    it('maps order_created to order.created', async () => {
      const rawBody = makeWebhookPayload('order_created', { total: 1199, tax: 0, currency: 'USD', customer_id: 'cust_456' });
      const signature = signPayload(rawBody, secret);

      const action = await provider.parseWebhookEvent({ rawBody, headers: { 'x-signature': signature }, secret });

      expect(action.type).toBe('order.created');
      if (action.type === 'order.created') {
        expect(action.amountCents).toBe(1199);
        expect(action.currency).toBe('usd');
      }
    });

    it('maps full order_refunded to subscription.revoke', async () => {
      const rawBody = makeWebhookPayload('order_refunded', { subtotal: 1199, refunded_amount: 1199, customer_id: 'cust_456' });
      const signature = signPayload(rawBody, secret);

      const action = await provider.parseWebhookEvent({ rawBody, headers: { 'x-signature': signature }, secret });
      expect(action.type).toBe('subscription.revoke');
    });

    it('ignores partial order_refunded', async () => {
      const rawBody = makeWebhookPayload('order_refunded', { subtotal: 1199, refunded_amount: 500, customer_id: 'cust_456' });
      const signature = signPayload(rawBody, secret);

      const action = await provider.parseWebhookEvent({ rawBody, headers: { 'x-signature': signature }, secret });
      expect(action.type).toBe('ignore');
    });

    it('returns ignore for unknown event types', async () => {
      const rawBody = makeWebhookPayload('some_unknown_event');
      const signature = signPayload(rawBody, secret);

      const action = await provider.parseWebhookEvent({ rawBody, headers: { 'x-signature': signature }, secret });
      expect(action.type).toBe('ignore');
    });
  });

  describe('createCheckoutSession', () => {
    it('calls createCheckout with correct params', async () => {
      vi.mocked(createCheckout).mockResolvedValue({
        data: { data: { attributes: { url: 'https://checkout.lemonsqueezy.com/test' } } },
      } as any);

      const result = await provider.createCheckoutSession({
        productId: '111',
        userId: 'user_1',
        billingPeriod: 'monthly',
        successUrl: 'https://app.com/success',
      });

      expect(result.checkoutUrl).toBe('https://checkout.lemonsqueezy.com/test');
      expect(createCheckout).toHaveBeenCalledWith('12345', '111', expect.objectContaining({
        checkoutData: { custom: { user_id: 'user_1' } },
        productOptions: expect.objectContaining({ redirectUrl: 'https://app.com/success' }),
      }));
    });
  });

  describe('cancelSubscription', () => {
    it('calls SDK cancelSubscription', async () => {
      vi.mocked(cancelSubscription).mockResolvedValue({} as any);

      await provider.cancelSubscription('sub_123');

      expect(cancelSubscription).toHaveBeenCalledWith('sub_123');
    });
  });

  describe('getApplyDiscountUrl', () => {
    it('returns customer_portal_update_subscription URL', async () => {
      vi.mocked(getSubscription).mockResolvedValue({
        data: {
          data: {
            attributes: {
              urls: {
                customer_portal_update_subscription: 'https://app.lemonsqueezy.com/my-orders/sub_123/update',
              },
            },
          },
        },
      } as any);

      const result = await provider.getApplyDiscountUrl({ subscriptionId: 'sub_123' });
      expect(result.url).toBe('https://app.lemonsqueezy.com/my-orders/sub_123/update');
      expect(getSubscription).toHaveBeenCalledWith('sub_123');
    });

    it('throws when URL is missing', async () => {
      vi.mocked(getSubscription).mockResolvedValue({
        data: { data: { attributes: { urls: {} } } },
      } as any);

      await expect(provider.getApplyDiscountUrl({ subscriptionId: 'sub_123' })).rejects.toThrow(
        'No customer_portal_update_subscription URL found'
      );
    });
  });

  describe('createDiscountCode', () => {
    it('calls createDiscount with correct params', async () => {
      vi.mocked(createDiscount).mockResolvedValue({ data: { data: { attributes: { code: 'ROOKIE123' } } } } as any);

      const result = await provider.createDiscountCode({
        discountPct: 10,
        discountLabel: 'Rookie reward',
        code: 'ROOKIE123',
      });

      expect(result.code).toBe('ROOKIE123');
      expect(createDiscount).toHaveBeenCalledWith(expect.objectContaining({
        storeId: 12345,
        name: 'Rookie reward',
        code: 'ROOKIE123',
        amount: 10,
        amountType: 'percent',
        duration: 'once',
        maxRedemptions: 1,
      }));
    });
  });
});
