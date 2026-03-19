import type { TierId, BillingPeriod } from '@/types/subscription';

// ── Webhook action discriminated union ───────────────────────────────────────

export interface ProviderSubscriptionData {
  providerSubscriptionId: string;
  providerCustomerId: string;
  tierId: TierId;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  billingPeriod: BillingPeriod | null;
  periodStart: Date;
  periodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export type WebhookAction =
  | {
      type: 'subscription.upsert';
      data: ProviderSubscriptionData;
      userId: string | null;
    }
  | {
      type: 'subscription.cancel_at_period_end';
      providerSubscriptionId: string;
      periodEnd: Date;
      userId: string;
    }
  | {
      type: 'subscription.revoke';
      providerSubscriptionId: string;
      userId: string;
    }
  | {
      type: 'order.created';
      orderId: string;
      userId: string;
      amountUsd: number;
    }
  | { type: 'ignore' };

// ── Provider interface ────────────────────────────────────────────────────────

export interface CheckoutParams {
  productId: string;
  userId: string;
  billingPeriod: BillingPeriod;
  successUrl: string;
}

export interface IPaymentProvider {
  readonly name: 'polar' | 'stripe' | 'paddle';
  createCheckoutSession(params: CheckoutParams): Promise<{ checkoutUrl: string }>;
  createCustomerPortalSession(params: { customerId: string; returnUrl: string }): Promise<{ portalUrl: string }>;
  getCustomerEmail(customerId: string): Promise<string | null>;
  parseWebhookEvent(params: {
    rawBody: string;
    headers: Record<string, string>;
    secret: string;
  }): Promise<WebhookAction>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
}
