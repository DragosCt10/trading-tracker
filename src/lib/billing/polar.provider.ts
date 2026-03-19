import { Polar } from '@polar-sh/sdk';
import { validateEvent } from '@polar-sh/sdk/webhooks';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { TierId, BillingPeriod } from '@/types/subscription';
import type {
  IPaymentProvider,
  WebhookAction,
  ProviderSubscriptionData,
  CheckoutParams,
} from './provider.interface';

function mapBillingPeriod(sub: { recurringInterval?: string | null }): BillingPeriod | null {
  if (sub.recurringInterval === 'month') return 'monthly';
  if (sub.recurringInterval === 'year') return 'annual';
  return null;
}

function mapTierFromProductId(productId: string): TierId | null {
  const legacyProProductIds = [
    process.env.POLAR_PRO_LEGACY_PRODUCT_ID,
    process.env.POLAR_SANDBOX_PRO_LEGACY_PRODUCT_ID,
  ].filter((value): value is string => Boolean(value));

  if (legacyProProductIds.includes(productId)) {
    return 'pro';
  }

  const entry = Object.values(TIER_DEFINITIONS).find((tier) => {
    const monthlyProductId = tier.pricing.monthly?.polarProductId;
    const annualProductId = tier.pricing.annual?.polarProductId;
    return monthlyProductId === productId || annualProductId === productId;
  });
  return entry ? entry.id : null;
}

function mapSubData(data: {
  id: string;
  customerId: string;
  productId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  recurringInterval?: string | null;
}): ProviderSubscriptionData | null {
  const tierId = mapTierFromProductId(data.productId);
  if (!tierId) return null;

  const statusMap: Record<string, ProviderSubscriptionData['status']> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
  };

  return {
    providerSubscriptionId: data.id,
    providerCustomerId: data.customerId,
    tierId,
    status: statusMap[data.status] ?? 'active',
    billingPeriod: mapBillingPeriod(data),
    periodStart: new Date(data.currentPeriodStart ?? Date.now()),
    periodEnd: new Date(data.currentPeriodEnd ?? Date.now()),
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
  };
}

/**
 * Full subscription refund → revoke our row. Only call after refund.status is `succeeded`
 * (refund.created may be pending).
 *
 * Matches Polar payloads with optional nested `order`, camelCase or snake_case keys.
 */
function trySubscriptionRevokeFromSucceededRefund(
  refund: Record<string, unknown>,
  userId: string
): WebhookAction | null {
  const subscriptionId =
    (typeof refund.subscriptionId === 'string' && refund.subscriptionId) ||
    (typeof refund.subscription_id === 'string' && refund.subscription_id) ||
    null;
  if (!subscriptionId) return null;

  if (refund.reason !== 'subscription') return null;

  const amount = typeof refund.amount === 'number' ? refund.amount : null;
  const order =
    (refund.order && typeof refund.order === 'object'
      ? (refund.order as Record<string, unknown>)
      : null) ?? null;
  const orderAmount =
    order && typeof order.amount === 'number' ? order.amount : null;

  const revokeBenefits =
    refund.revokeBenefits === true || refund.revoke_benefits === true;

  // Full refund vs order total (when webhook expands `order`), or Polar marks benefit revocation
  const isFullOrderRefund =
    amount != null && orderAmount != null && amount === orderAmount;
  if (!isFullOrderRefund && !revokeBenefits) return null;

  return {
    type: 'subscription.revoke',
    providerSubscriptionId: subscriptionId,
    userId,
  };
}

export class PolarProvider implements IPaymentProvider {
  readonly name = 'polar' as const;
  private client: Polar;

  constructor(accessToken: string, server: 'sandbox' | 'production' = 'production') {
    this.client = new Polar({ accessToken, server });
  }

  async createCheckoutSession({ productId, userId, successUrl }: CheckoutParams): Promise<{ checkoutUrl: string }> {
    const checkout = await this.client.checkouts.create({
      products: [productId],
      successUrl,
      metadata: { userId },
    });

    return { checkoutUrl: checkout.url };
  }

  async createCustomerPortalSession({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ portalUrl: string }> {
    const session = await this.client.customerSessions.create({
      customerId,
      returnUrl,
    });

    return { portalUrl: session.customerPortalUrl };
  }

  async getCustomerEmail(customerId: string): Promise<string | null> {
    try {
      const customersApi = (this.client as any).customers;
      if (!customersApi) return null;

      const customer =
        (typeof customersApi.get === 'function' && await customersApi.get({ id: customerId })) ||
        (typeof customersApi.retrieve === 'function' && await customersApi.retrieve({ id: customerId })) ||
        (typeof customersApi.fetch === 'function' && await customersApi.fetch({ id: customerId })) ||
        null;

      if (!customer || typeof customer !== 'object') return null;
      const email =
        (typeof customer.email === 'string' && customer.email) ||
        (typeof customer.emailAddress === 'string' && customer.emailAddress) ||
        (typeof customer.email_address === 'string' && customer.email_address) ||
        null;
      return email;
    } catch (error) {
      console.error(`[billing/polar] getCustomerEmail failed customerId=${customerId}`, error);
      return null;
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
    let event: ReturnType<typeof validateEvent>;
    try {
      event = validateEvent(rawBody, headers, secret);
    } catch {
      throw new Error('Invalid webhook signature');
    }

    // Extract userId from metadata
    const getUserId = (meta: Record<string, unknown> | null | undefined): string | null =>
      typeof meta?.userId === 'string' ? meta.userId : null;

    const type = event.type as string;

    if (
      type === 'subscription.created' ||
      type === 'subscription.updated' ||
      type === 'subscription.active'
    ) {
      const sub = (event as any).data;
      const userId = getUserId(sub.metadata);

      const mapped = mapSubData({
        id: sub.id,
        customerId: sub.customerId,
        productId: sub.productId,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
        recurringInterval: sub.recurringInterval,
      });
      if (!mapped) return { type: 'ignore' };

      console.log(`[billing/webhook] action=subscription.upsert userId=${userId ?? '—'}`);
      return { type: 'subscription.upsert', data: mapped, userId };
    }

    if (type === 'subscription.canceled') {
      const sub = (event as any).data;
      const userId = getUserId(sub.metadata);
      if (!userId) return { type: 'ignore' };

      console.log(`[billing/webhook] action=subscription.cancel_at_period_end userId=${userId}`);
      return {
        type: 'subscription.cancel_at_period_end',
        providerSubscriptionId: sub.id,
        periodEnd: new Date(sub.currentPeriodEnd),
        userId,
      };
    }

    if (type === 'subscription.revoked') {
      const sub = (event as any).data;
      const userId = getUserId(sub.metadata);
      if (!userId) return { type: 'ignore' };

      console.log(`[billing/webhook] action=subscription.revoke userId=${userId}`);
      return {
        type: 'subscription.revoke',
        providerSubscriptionId: sub.id,
        userId,
      };
    }

    // refund.created is emitted regardless of status — do not revoke until refund.updated succeeds.
    if (type === 'refund.created') {
      const refund = (event as { data: Record<string, unknown> }).data;
      const userId = getUserId(refund.metadata as Record<string, unknown> | undefined);
      const status = typeof refund.status === 'string' ? refund.status : '?';
      console.log(
        `[billing/webhook] refund.created id=${refund.id} status=${status} userId=${userId ?? '—'} (no revoke until succeeded)`
      );
      return { type: 'ignore' };
    }

    if (type === 'refund.updated') {
      const refund = (event as { data: Record<string, unknown> }).data;
      const userId = getUserId(refund.metadata as Record<string, unknown> | undefined);
      if (!userId) return { type: 'ignore' };

      if (refund.status !== 'succeeded') {
        console.log(
          `[billing/webhook] refund.updated id=${refund.id} status=${refund.status} userId=${userId} (no revoke)`
        );
        return { type: 'ignore' };
      }

      const revoke = trySubscriptionRevokeFromSucceededRefund(refund, userId);
      if (revoke) {
        console.log(`[billing/webhook] action=subscription.revoke (refund.updated succeeded) userId=${userId}`);
        return revoke;
      }
      console.log(`[billing/webhook] action=ignore (refund.updated not full subscription refund) userId=${userId}`);
      return { type: 'ignore' };
    }

    if (type === 'order.created') {
      const order = (event as any).data;
      const userId = getUserId(order.metadata);
      if (!userId) return { type: 'ignore' };

      console.log(`[billing/webhook] action=order.created userId=${userId}`);
      return {
        type: 'order.created',
        orderId: order.id,
        userId,
        amountUsd: (order.amount ?? 0) / 100,
      };
    }

    return { type: 'ignore' };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.client.subscriptions.revoke({ id: providerSubscriptionId });
  }
}
