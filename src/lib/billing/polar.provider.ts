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

function readString(source: Record<string, unknown>, camelKey: string, snakeKey: string): string | null {
  const camel = source[camelKey];
  if (typeof camel === 'string' && camel.length > 0) return camel;
  const snake = source[snakeKey];
  if (typeof snake === 'string' && snake.length > 0) return snake;
  return null;
}

function readBoolean(source: Record<string, unknown>, camelKey: string, snakeKey: string, fallback = false): boolean {
  const camel = source[camelKey];
  if (typeof camel === 'boolean') return camel;
  const snake = source[snakeKey];
  if (typeof snake === 'boolean') return snake;
  return fallback;
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
  customerEmail: string | null;
  productId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  recurringInterval?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
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
    customerEmail: data.customerEmail,
    tierId,
    status: statusMap[data.status] ?? 'active',
    billingPeriod: mapBillingPeriod(data),
    periodStart: new Date(data.currentPeriodStart ?? Date.now()),
    periodEnd: new Date(data.currentPeriodEnd ?? Date.now()),
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    priceAmount: data.priceAmount ?? null,
    currency: data.currency ? data.currency.toLowerCase() : null,
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
    providerCustomerId: null,
    userId,
  };
}

export class PolarProvider implements IPaymentProvider {
  readonly name = 'polar' as const;
  private client: Polar;
  private readonly accessToken: string;
  private readonly apiBaseUrl: string;

  constructor(accessToken: string, server: 'sandbox' | 'production' = 'production') {
    this.client = new Polar({ accessToken, server });
    this.accessToken = accessToken;
    this.apiBaseUrl = server === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
  }

  async createCheckoutSession({ productId, userId, successUrl }: CheckoutParams): Promise<{ checkoutUrl: string }> {
    const checkout = await this.client.checkouts.create({
      products: [productId],
      successUrl,
      ...(userId ? { metadata: { userId } } : {}),
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
      const userId = getUserId(sub.metadata as Record<string, unknown> | undefined);

      const mapped = mapSubData({
        id: readString(sub, 'id', 'id') ?? '',
        customerId: readString(sub, 'customerId', 'customer_id') ?? '',
        customerEmail:
          (sub.customer && typeof sub.customer === 'object'
            ? readString(sub.customer as Record<string, unknown>, 'email', 'email')
            : null) ??
          readString(sub, 'customerEmail', 'customer_email'),
        productId: readString(sub, 'productId', 'product_id') ?? '',
        status: sub.status,
        currentPeriodStart: readString(sub, 'currentPeriodStart', 'current_period_start'),
        currentPeriodEnd: readString(sub, 'currentPeriodEnd', 'current_period_end'),
        cancelAtPeriodEnd: readBoolean(sub, 'cancelAtPeriodEnd', 'cancel_at_period_end', false),
        recurringInterval: readString(sub, 'recurringInterval', 'recurring_interval'),
        priceAmount: typeof sub.amount === 'number' ? sub.amount : null,
        currency: readString(sub, 'currency', 'currency'),
      });
      if (!mapped || !mapped.providerSubscriptionId || !mapped.providerCustomerId) {
        return { type: 'ignore' };
      }

      console.log(`[billing/webhook] action=subscription.updated userId=${userId ?? '—'}`);
      return { type: 'subscription.updated', data: mapped, userId };
    }

    if (type === 'subscription.canceled') {
      const sub = (event as { data: Record<string, unknown> }).data;
      const providerSubscriptionId = readString(sub, 'id', 'id');
      if (!providerSubscriptionId) return { type: 'ignore' };
      const userId = getUserId(sub.metadata as Record<string, unknown> | undefined);
      const providerCustomerId = readString(sub, 'customerId', 'customer_id');
      const cancelAtPeriodEnd = readBoolean(sub, 'cancelAtPeriodEnd', 'cancel_at_period_end', false);
      const periodEndRaw = cancelAtPeriodEnd
        ? readString(sub, 'currentPeriodEnd', 'current_period_end')
        : (readString(sub, 'endedAt', 'ended_at') ?? readString(sub, 'currentPeriodEnd', 'current_period_end'));
      const periodEnd = periodEndRaw ? new Date(periodEndRaw) : new Date();
      console.log(
        `[billing/webhook] action=subscription.canceled userId=${userId ?? '—'} customerId=${providerCustomerId ?? '—'} cancelAtPeriodEnd=${cancelAtPeriodEnd}`
      );
      return {
        type: 'subscription.canceled',
        providerSubscriptionId,
        providerCustomerId,
        periodEnd,
        cancelAtPeriodEnd,
        userId,
      };
    }

    if (type === 'subscription.revoked') {
      const sub = (event as any).data;
      const userId = getUserId(sub.metadata);
      const providerCustomerId = typeof sub.customerId === 'string' ? sub.customerId : null;
      console.log(
        `[billing/webhook] action=subscription.revoke userId=${userId ?? '—'} customerId=${providerCustomerId ?? '—'}`
      );
      return {
        type: 'subscription.revoke',
        providerSubscriptionId: sub.id,
        providerCustomerId,
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

      const amountCents = (order.amount ?? 0) as number;
      const taxCents = (order.tax_amount ?? order['taxAmount'] ?? 0) as number;
      const currency = ((order.currency ?? 'usd') as string).toLowerCase();

      console.log(`[billing/webhook] action=order.created userId=${userId}`);
      return {
        type: 'order.created',
        orderId: order.id,
        userId,
        amountUsd: amountCents / 100,
        amountCents,
        taxCents,
        currency,
      };
    }

    if (type === 'order.updated') {
      return { type: 'ignore' };
    }

    console.log(`[billing/webhook] action=ignore reason=unhandled_event_type type=${type}`);
    return { type: 'ignore' };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.client.subscriptions.revoke({ id: providerSubscriptionId });
  }

  /**
   * Fetch the active subscription for a user directly from Polar by querying
   * subscriptions with matching metadata.userId. Used post-checkout to bypass
   * webhook latency — the subscription may exist in Polar before the webhook arrives.
   */
  async getActiveSubscriptionForUser(userId: string): Promise<ProviderSubscriptionData | null> {
    try {
      const result = await this.client.subscriptions.list({
        active: true,
        limit: 10,
      });

      // The SDK returns a PageIterator — collect the first page of items.
      const items: Record<string, unknown>[] = [];
      for await (const sub of result) {
        items.push(sub as unknown as Record<string, unknown>);
        if (items.length >= 10) break;
      }
      for (const sub of items) {
        const meta = (sub as any).metadata as Record<string, unknown> | undefined;
        if (typeof meta?.userId !== 'string' || meta.userId !== userId) continue;

        const productId = readString(sub as unknown as Record<string, unknown>, 'productId', 'product_id') ?? '';
        const mapped = mapSubData({
          id: readString(sub as unknown as Record<string, unknown>, 'id', 'id') ?? '',
          customerId: readString(sub as unknown as Record<string, unknown>, 'customerId', 'customer_id') ?? '',
          customerEmail: null,
          productId,
          status: (sub as any).status ?? 'active',
          currentPeriodStart: readString(sub as unknown as Record<string, unknown>, 'currentPeriodStart', 'current_period_start'),
          currentPeriodEnd: readString(sub as unknown as Record<string, unknown>, 'currentPeriodEnd', 'current_period_end'),
          cancelAtPeriodEnd: readBoolean(sub as unknown as Record<string, unknown>, 'cancelAtPeriodEnd', 'cancel_at_period_end', false),
          recurringInterval: readString(sub as unknown as Record<string, unknown>, 'recurringInterval', 'recurring_interval'),
          priceAmount: typeof (sub as any).amount === 'number' ? (sub as any).amount : null,
          currency: readString(sub as unknown as Record<string, unknown>, 'currency', 'currency'),
        });
        if (mapped) return mapped;
      }

      return null;
    } catch (err) {
      console.error(`[billing/polar] getActiveSubscriptionForUser failed userId=${userId}`, err);
      return null;
    }
  }

  private async polarFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
  }

  private extractOrderList(payload: unknown): Record<string, unknown>[] {
    if (!payload || typeof payload !== 'object') return [];
    const root = payload as Record<string, unknown>;
    const options = [
      root.items,
      root.data,
      root.result && typeof root.result === 'object' ? (root.result as Record<string, unknown>).items : undefined,
    ];
    for (const candidate of options) {
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
      }
    }
    return [];
  }

  private readDate(order: Record<string, unknown>): Date {
    const candidates = [order.created_at, order.createdAt, order.modified_at, order.modifiedAt];
    for (const value of candidates) {
      if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
    }
    return new Date(0);
  }

  async getLatestOrderInvoice({
    customerId,
  }: {
    customerId: string;
  }): Promise<{ status: 'ready'; invoiceUrl: string } | { status: 'scheduled' } | { status: 'missing_order' }> {
    const listUrl = `/v1/orders?customer_id=${encodeURIComponent(customerId)}&limit=20`;
    const listResponse = await this.polarFetch(listUrl, { method: 'GET' });
    if (!listResponse.ok) {
      console.error(`[billing/polar] failed listing orders for customer=${customerId} status=${listResponse.status}`);
      return { status: 'missing_order' };
    }

    const listPayload = await listResponse.json();
    const orders = this.extractOrderList(listPayload);
    if (orders.length === 0) return { status: 'missing_order' };

    const latestOrder = orders.toSorted((a, b) => this.readDate(b).getTime() - this.readDate(a).getTime())[0];
    if (!latestOrder) return { status: 'missing_order' };

    const orderId =
      (typeof latestOrder.id === 'string' && latestOrder.id) ||
      (typeof latestOrder.order_id === 'string' && latestOrder.order_id) ||
      null;
    if (!orderId) return { status: 'missing_order' };

    const generateResponse = await this.polarFetch(`/v1/orders/${orderId}/invoice`, { method: 'POST' });
    if (![200, 202, 409].includes(generateResponse.status)) {
      console.error(
        `[billing/polar] failed generating invoice orderId=${orderId} status=${generateResponse.status}`
      );
      return { status: 'scheduled' };
    }

    const getResponse = await this.polarFetch(`/v1/orders/${orderId}/invoice`, { method: 'GET' });
    if (!getResponse.ok) {
      return { status: 'scheduled' };
    }
    const invoicePayload = await getResponse.json();
    const invoiceUrl =
      (typeof invoicePayload.url === 'string' && invoicePayload.url) ||
      (typeof invoicePayload.invoice_url === 'string' && invoicePayload.invoice_url) ||
      (typeof invoicePayload.download_url === 'string' && invoicePayload.download_url) ||
      null;

    return invoiceUrl ? { status: 'ready', invoiceUrl } : { status: 'scheduled' };
  }
}
