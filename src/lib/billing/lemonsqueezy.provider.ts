import crypto from 'node:crypto';
import {
  lemonSqueezySetup,
  createCheckout,
  cancelSubscription as lsCancelSubscription,
  getSubscription,
  listSubscriptions,
  listOrders,
  createDiscount,
} from '@lemonsqueezy/lemonsqueezy.js';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { TierId, BillingPeriod } from '@/types/subscription';
import type {
  IPaymentProvider,
  WebhookAction,
  ProviderSubscriptionData,
  CheckoutParams,
} from './provider.interface';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapTierFromVariantId(variantId: string): TierId | null {
  const entry = Object.values(TIER_DEFINITIONS).find((tier) => {
    const monthlyId = tier.pricing.monthly?.productId;
    const annualId = tier.pricing.annual?.productId;
    return monthlyId === variantId || annualId === variantId;
  });
  return entry ? entry.id : null;
}

function mapBillingPeriodFromVariantId(variantId: string): BillingPeriod | null {
  for (const tier of Object.values(TIER_DEFINITIONS)) {
    if (tier.pricing.monthly?.productId === variantId) return 'monthly';
    if (tier.pricing.annual?.productId === variantId) return 'annual';
  }
  return null;
}

function mapStatus(lsStatus: string): ProviderSubscriptionData['status'] {
  const map: Record<string, ProviderSubscriptionData['status']> = {
    active: 'active',
    on_trial: 'trialing',
    past_due: 'past_due',
    cancelled: 'canceled',
    expired: 'canceled',
    unpaid: 'past_due',
    paused: 'canceled',
  };
  return map[lsStatus] ?? 'active';
}

// ── Provider ─────────────────────────────────────────────────────────────────

export class LemonSqueezyProvider implements IPaymentProvider {
  readonly name = 'lemonsqueezy' as const;
  private readonly storeId: string;

  constructor(apiKey: string, storeId: string) {
    lemonSqueezySetup({ apiKey });
    this.storeId = storeId;
  }

  async createCheckoutSession({
    productId,
    userId,
    successUrl,
  }: CheckoutParams): Promise<{ checkoutUrl: string }> {
    const checkout = await createCheckout(this.storeId, productId, {
      checkoutOptions: {
        embed: false,
        media: false,
      },
      checkoutData: {
        custom: userId ? { user_id: userId } : undefined,
      },
      productOptions: {
        redirectUrl: successUrl,
        enabledVariants: [Number(productId)],
      },
    });

    if (checkout.error) {
      throw new Error(
        `[billing/lemonsqueezy] createCheckout API error: ${JSON.stringify(checkout.error)}`
      );
    }
    const url = checkout.data?.data?.attributes?.url;
    if (!url) {
      throw new Error(
        `[billing/lemonsqueezy] createCheckout returned no URL. Response: ${JSON.stringify(checkout.data)}`
      );
    }
    return { checkoutUrl: url };
  }

  async createCustomerPortalSession({
    customerId,
  }: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ portalUrl: string }> {
    // customerId is actually provider_subscription_id for Lemon Squeezy
    const sub = await getSubscription(customerId);
    const portalUrl = sub.data?.data?.attributes?.urls?.customer_portal;
    if (!portalUrl) {
      throw new Error('[billing/lemonsqueezy] No customer portal URL found for subscription');
    }
    return { portalUrl };
  }

  async getUpdatePaymentMethodUrl({ subscriptionId }: { subscriptionId: string }): Promise<{ url: string }> {
    const sub = await getSubscription(subscriptionId);
    const url = sub.data?.data?.attributes?.urls?.update_payment_method;
    if (!url) {
      throw new Error('[billing/lemonsqueezy] No update_payment_method URL found for subscription');
    }
    return { url };
  }

  async getApplyDiscountUrl({ subscriptionId }: { subscriptionId: string }): Promise<{ url: string }> {
    const sub = await getSubscription(subscriptionId);
    const url = sub.data?.data?.attributes?.urls?.customer_portal_update_subscription;
    if (!url) {
      throw new Error('[billing/lemonsqueezy] No customer_portal_update_subscription URL found for subscription');
    }
    return { url };
  }

  async getCustomerEmail(customerId: string): Promise<string | null> {
    try {
      const sub = await getSubscription(customerId);
      return sub.data?.data?.attributes?.user_email ?? null;
    } catch (error) {
      console.error(`[billing/lemonsqueezy] getCustomerEmail failed id=${customerId}`, error);
      return null;
    }
  }

  async getLatestOrderInvoice({
    customerId,
  }: {
    customerId: string;
  }): Promise<{ status: 'ready'; invoiceUrl: string } | { status: 'scheduled' } | { status: 'missing_order' }> {
    try {
      // customerId here is the provider_subscription_id — look up the user email first
      const sub = await getSubscription(customerId);
      const userEmail = sub.data?.data?.attributes?.user_email;
      if (!userEmail) return { status: 'missing_order' };

      const orders = await listOrders({
        filter: { storeId: Number(this.storeId), userEmail },
        page: { number: 1, size: 1 },
      });

      const items = orders.data?.data;
      if (!items || items.length === 0) return { status: 'missing_order' };

      const receiptUrl = items[0].attributes?.urls?.receipt;
      if (!receiptUrl) return { status: 'missing_order' };

      return { status: 'ready', invoiceUrl: receiptUrl };
    } catch (error) {
      console.error('[billing/lemonsqueezy] getLatestOrderInvoice failed', error);
      return { status: 'missing_order' };
    }
  }

  async parseWebhookEvent({
    rawBody,
    headers,
    secret,
  }: {
    rawBody: string;
    headers: Record<string, string>;
    secret: string;
  }): Promise<WebhookAction> {
    // Verify HMAC SHA-256 signature
    const signature = headers['x-signature'] ?? '';
    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const expected = Buffer.from(hmac, 'hex');
    const received = Buffer.from(signature, 'hex');

    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      throw new Error('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody);
    const eventName: string = payload.meta?.event_name ?? '';
    const customData = payload.meta?.custom_data ?? {};
    const userId: string | null = typeof customData.user_id === 'string' ? customData.user_id : null;
    const attrs = payload.data?.attributes ?? {};
    const dataId: string = String(payload.data?.id ?? '');

    // ── Subscription events ──

    if (
      eventName === 'subscription_created' ||
      eventName === 'subscription_updated' ||
      eventName === 'subscription_resumed' ||
      eventName === 'subscription_payment_success'
    ) {
      const variantId = String(attrs.variant_id ?? attrs.first_subscription_item?.variant_id ?? '');
      const tierId = mapTierFromVariantId(variantId);
      if (!tierId) {
        console.log(`[billing/webhook] ignore reason=unknown_variant variantId=${variantId}`);
        return { type: 'ignore' };
      }

      const mapped: ProviderSubscriptionData = {
        providerSubscriptionId: dataId,
        providerCustomerId: String(attrs.customer_id ?? ''),
        customerEmail: attrs.user_email ?? null,
        tierId,
        status: mapStatus(attrs.status ?? 'active'),
        billingPeriod: mapBillingPeriodFromVariantId(variantId),
        periodStart: new Date(attrs.renews_at ?? attrs.created_at ?? Date.now()),
        periodEnd: new Date(attrs.renews_at ?? attrs.ends_at ?? Date.now()),
        cancelAtPeriodEnd: attrs.cancelled === true,
        priceAmount: null,
        currency: typeof attrs.currency === 'string' ? attrs.currency.toLowerCase() : null,
      };

      console.log(`[billing/webhook] action=subscription.updated userId=${userId ?? '—'} event=${eventName}`);
      return { type: 'subscription.updated', data: mapped, userId };
    }

    if (eventName === 'subscription_cancelled') {
      const endsAt = attrs.ends_at ? new Date(attrs.ends_at) : new Date();
      console.log(`[billing/webhook] action=subscription.canceled userId=${userId ?? '—'} endsAt=${endsAt.toISOString()}`);
      return {
        type: 'subscription.canceled',
        providerSubscriptionId: dataId,
        providerCustomerId: String(attrs.customer_id ?? ''),
        periodEnd: endsAt,
        cancelAtPeriodEnd: true,
        userId,
      };
    }

    if (eventName === 'subscription_expired') {
      console.log(`[billing/webhook] action=subscription.revoke userId=${userId ?? '—'}`);
      return {
        type: 'subscription.revoke',
        providerSubscriptionId: dataId,
        providerCustomerId: String(attrs.customer_id ?? ''),
        userId,
      };
    }

    // ── Order events ──

    if (eventName === 'order_created') {
      const amountCents = (attrs.total ?? attrs.subtotal ?? 0) as number;
      const taxCents = (attrs.tax ?? 0) as number;
      const currency = ((attrs.currency ?? 'usd') as string).toLowerCase();

      console.log(`[billing/webhook] action=order.created userId=${userId ?? '—'} amount=${amountCents}`);
      return {
        type: 'order.created',
        orderId: dataId,
        userId,
        providerCustomerId: String(attrs.customer_id ?? ''),
        amountUsd: amountCents / 100,
        amountCents,
        taxCents,
        currency,
        subscription: null, // LS doesn't embed subscription in order events
      };
    }

    if (eventName === 'order_refunded') {
      // Only revoke on full refund; partial refunds are ignored
      const subtotal = attrs.subtotal ?? 0;
      const refundedAmount = attrs.refunded_amount ?? 0;
      const isFullRefund = subtotal > 0 && refundedAmount >= subtotal;

      if (!isFullRefund) {
        console.log(`[billing/webhook] action=ignore reason=partial_refund subtotal=${subtotal} refunded=${refundedAmount}`);
        return { type: 'ignore' };
      }

      // Try to find the subscription ID from the order attributes
      const subscriptionId = String(attrs.first_order_item?.subscription_id ?? dataId);
      console.log(`[billing/webhook] action=subscription.revoke reason=full_refund userId=${userId ?? '—'}`);
      return {
        type: 'subscription.revoke',
        providerSubscriptionId: subscriptionId,
        providerCustomerId: String(attrs.customer_id ?? ''),
        userId,
      };
    }

    console.log(`[billing/webhook] action=ignore reason=unhandled_event type=${eventName}`);
    return { type: 'ignore' };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await lsCancelSubscription(providerSubscriptionId);
  }

  async getActiveSubscriptionForUser(userId: string): Promise<ProviderSubscriptionData | null> {
    try {
      // Look up user email from Supabase to filter subscriptions
      const { createServiceRoleClient } = await import('@/utils/supabase/service-role');
      const supabase = createServiceRoleClient();
      const { data } = await supabase.auth.admin.getUserById(userId);
      const email = data?.user?.email;
      if (!email) return null;

      const result = await listSubscriptions({
        filter: { storeId: Number(this.storeId), userEmail: email },
      });

      const items = result.data?.data;
      if (!items || items.length === 0) return null;

      // Find the active subscription that matches this user
      for (const sub of items) {
        const attrs = sub.attributes;
        if (attrs.status !== 'active' && attrs.status !== 'on_trial') continue;

        const variantId = String(attrs.variant_id ?? '');
        const tierId = mapTierFromVariantId(variantId);
        if (!tierId) continue;

        return {
          providerSubscriptionId: String(sub.id),
          providerCustomerId: String(attrs.customer_id ?? ''),
          customerEmail: attrs.user_email ?? null,
          tierId,
          status: mapStatus(attrs.status),
          billingPeriod: mapBillingPeriodFromVariantId(variantId),
          periodStart: new Date(attrs.created_at ?? Date.now()),
          periodEnd: new Date(attrs.renews_at ?? attrs.ends_at ?? Date.now()),
          cancelAtPeriodEnd: attrs.cancelled === true,
          priceAmount: null,
          currency: null,
        };
      }

      return null;
    } catch (err) {
      console.error(`[billing/lemonsqueezy] getActiveSubscriptionForUser failed userId=${userId}`, err);
      return null;
    }
  }

  async createDiscountCode({
    discountPct,
    discountLabel,
    code,
  }: { discountPct: number; discountLabel: string; code: string }): Promise<{ code: string }> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const result = await createDiscount({
      storeId: Number(this.storeId),
      name: discountLabel,
      code,
      amount: discountPct,
      amountType: 'percent',
      duration: 'once',
      isLimitedRedemptions: true,
      maxRedemptions: 1,
      expiresAt: expiresAt.toISOString(),
    });

    if (result.error) {
      throw new Error(`Failed to create Lemon Squeezy discount: ${JSON.stringify(result.error)}`);
    }

    return { code };
  }
}
