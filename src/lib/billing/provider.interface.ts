import type { TierId, BillingPeriod } from '@/types/subscription';


// ── Webhook action discriminated union ───────────────────────────────────────

export interface ProviderSubscriptionData {
  providerSubscriptionId: string;
  providerCustomerId: string;
  customerEmail: string | null;
  tierId: TierId;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  billingPeriod: BillingPeriod | null;
  periodStart: Date;
  periodEnd: Date;
  cancelAtPeriodEnd: boolean;
  /** Recurring price in smallest currency unit (cents). Null if not provided by webhook. */
  priceAmount: number | null;
  /** ISO currency code, lowercase. Null if not provided by webhook. */
  currency: string | null;
}

export type WebhookAction =
  | {
      type: 'subscription.updated';
      data: ProviderSubscriptionData;
      userId: string | null;
      /** Raw event name from the provider (e.g. 'subscription_payment_success'). */
      originalEvent?: string;
    }
  | {
      type: 'subscription.canceled';
      providerSubscriptionId: string;
      providerCustomerId: string | null;
      periodEnd: Date;
      cancelAtPeriodEnd: boolean;
      userId: string | null;
    }
  | {
      type: 'subscription.revoke';
      providerSubscriptionId: string;
      providerCustomerId: string | null;
      userId: string | null;
    }
  | {
      type: 'order.created';
      orderId: string;
      userId: string | null;
      providerCustomerId: string | null;
      amountUsd: number;
      amountCents: number;
      taxCents: number;
      currency: string;
      /** Full subscription data extracted from the embedded subscription object, when available. */
      subscription: ProviderSubscriptionData | null;
    }
  | { type: 'ignore' };

// ── Provider interface ────────────────────────────────────────────────────────

export interface CheckoutParams {
  productId: string;
  /** Omit for anonymous (landing page) checkouts — webhook resolves user by email. */
  userId?: string;
  billingPeriod: BillingPeriod;
  successUrl: string;
}

export interface IPaymentProvider {
  readonly name: 'polar' | 'stripe' | 'paddle' | 'lemonsqueezy';
  createCheckoutSession(params: CheckoutParams): Promise<{ checkoutUrl: string }>;
  createCustomerPortalSession(params: { customerId: string; returnUrl: string }): Promise<{ portalUrl: string }>;
  getUpdatePaymentMethodUrl(params: { subscriptionId: string }): Promise<{ url: string }>;
  getApplyDiscountUrl(params: { subscriptionId: string }): Promise<{ url: string }>;
  getCustomerEmail(customerId: string): Promise<string | null>;
  getLatestOrderInvoice(params: {
    customerId: string;
  }): Promise<{ status: 'ready'; invoiceUrl: string } | { status: 'scheduled' } | { status: 'missing_order' }>;
  parseWebhookEvent(params: {
    rawBody: string;
    headers: Record<string, string>;
    secret: string;
  }): Promise<WebhookAction>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  /** Fetch the active subscription for a userId directly from the provider (bypasses webhook lag). */
  getActiveSubscriptionForUser(userId: string): Promise<ProviderSubscriptionData | null>;
  /** Create a one-time percentage discount coupon code the user can apply themselves. */
  createDiscountCode(params: { discountPct: number; discountLabel: string; code: string }): Promise<{ code: string }>;
  /** Switch an existing subscription to a different variant (e.g. a discounted one). */
  switchSubscriptionVariant(subscriptionId: string, variantId: string): Promise<void>;
  /** Create a checkout URL for an existing variant with a discount code pre-filled. */
  createDiscountedCheckoutSession?(params: {
    variantId: string;
    couponCode: string;
    userId: string;
    successUrl: string;
  }): Promise<{ checkoutUrl: string }>;
}
