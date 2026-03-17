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
  const entry = Object.values(TIER_DEFINITIONS).find(
    (t) => t.polarProductId && t.polarProductId === productId
  );
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

export class PolarProvider implements IPaymentProvider {
  readonly name = 'polar' as const;
  private client: Polar;

  constructor(accessToken: string) {
    this.client = new Polar({ accessToken });
  }

  async createCheckoutSession({ priceId, userId, successUrl }: CheckoutParams): Promise<{ checkoutUrl: string }> {
    // priceId is used as the product ID for Polar checkout
    const checkout = await this.client.checkouts.create({
      products: [priceId],
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
      if (!userId) return { type: 'ignore' };

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

      console.log(`[billing/webhook] action=subscription.upsert userId=${userId}`);
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

    if (type === 'refund.created') {
      const refund = (event as any).data;
      const userId = getUserId(refund.metadata);
      if (!userId) return { type: 'ignore' };

      // Only revoke on full subscription refund
      if (
        refund.reason === 'subscription' &&
        refund.amount != null &&
        refund.order?.amount != null &&
        refund.amount === refund.order.amount
      ) {
        console.log(`[billing/webhook] action=subscription.revoke (refund) userId=${userId}`);
        return {
          type: 'subscription.revoke',
          providerSubscriptionId: refund.subscriptionId,
          userId,
        };
      }
      console.log(`[billing/webhook] action=ignore (partial refund) userId=${userId}`);
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
