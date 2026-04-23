'use server';

import { cache } from 'react';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from './session';
import { TIER_DEFINITIONS, TIER_ORDER } from '@/constants/tiers';
import type { TierId, BillingPeriod, ResolvedSubscription, SubscriptionRow } from '@/types/subscription';
import { getPaymentProvider } from '@/lib/billing';
import { PROMO_LIMIT } from '@/constants/promo';
import { getPromoSlotsUsed } from './promo';

const STARTER_SUBSCRIPTION: ResolvedSubscription = {
  tier: 'starter',
  definition: TIER_DEFINITIONS.starter,
  status: 'active',
  isActive: true,
  billingPeriod: null,
  periodEnd: null,
  cancelAtPeriodEnd: false,
  providerCustomerId: null,
  provider: 'admin',
  priceAmount: null,
  taxAmount: null,
  currency: null,
  createdAt: null,
  updatedAt: null,
};

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Fetches the active subscription row for a user.
 * Falls back to Starter on any DB error — never crashes the layout.
 * Cached per request via React cache().
 */
async function _getSubscription(userId: string): Promise<ResolvedSubscription> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'admin_granted', 'past_due'])
      .order('updated_at', { ascending: false });

    if (error || !data || data.length === 0) return STARTER_SUBSCRIPTION;

    // If multiple active rows exist, pick highest tier first, then most recently updated.
    const best = [...(data as SubscriptionRow[])].sort((a, b) => {
      const tierDelta = TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier);
      if (tierDelta !== 0) return tierDelta;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })[0];
    if (!best) return STARTER_SUBSCRIPTION;
    return resolveFromRow(best);
  } catch {
    return STARTER_SUBSCRIPTION;
  }
}

export const getCachedSubscription = cache(_getSubscription);


export async function resolveSubscription(userId: string): Promise<ResolvedSubscription> {
  return getCachedSubscription(userId);
}

function resolveFromRow(row: SubscriptionRow): ResolvedSubscription {
  const definition = TIER_DEFINITIONS[row.tier] ?? TIER_DEFINITIONS.starter;
  const periodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
  const now = new Date();

  // If subscription was canceled and the period has ended → Starter
  if (row.cancel_at_period_end && periodEnd && periodEnd < now) {
    return { ...STARTER_SUBSCRIPTION };
  }

  const isActive =
    row.status === 'active' ||
    row.status === 'trialing' ||
    row.status === 'admin_granted' ||
    row.status === 'past_due';

  return {
    tier: isActive ? row.tier : 'starter',
    definition: isActive ? definition : TIER_DEFINITIONS.starter,
    status: row.status,
    isActive,
    billingPeriod: row.billing_period,
    periodEnd,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    providerCustomerId: row.provider_customer_id,
    provider: row.provider,
    priceAmount: row.price_amount ?? null,
    taxAmount: row.tax_amount ?? null,
    currency: row.currency ?? null,
    createdAt: isActive ? (row.created_at ?? null) : null,
    updatedAt: isActive ? (row.updated_at ?? null) : null,
  };
}

// ── Admin grant / revoke ──────────────────────────────────────────────────────

/**
 * Grant a subscription tier to a user (admin only — no payment required).
 * Uses service role to bypass RLS.
 */
export async function grantSubscription(userId: string, tier: TierId): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      tier,
      status: 'admin_granted' as const,
      provider: 'admin' as const,
      billing_period: null,
      provider_subscription_id: null,
      provider_customer_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
    },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(`grantSubscription failed: ${error.message}`);

  // Sync tier to social_profiles so the feed PRO badge reflects the grant immediately
  await (supabase as ReturnType<typeof createServiceRoleClient> & { from: (table: string) => any })
    .from('social_profiles')
    .update({ tier, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

/**
 * Revoke a user's subscription — drops them back to Starter immediately.
 */
export async function revokeSubscription(userId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('user_id', userId);
  if (error) throw new Error(`revokeSubscription failed: ${error.message}`);
}

// ── Checkout / Portal ─────────────────────────────────────────────────────────

/**
 * Server action: verify payment directly via Lemon Squeezy API and activate subscription.
 * Called post-checkout to bypass webhook latency — upserts subscription if found in LS
 * before the webhook arrives. Safe to call repeatedly (idempotent upsert).
 */
export async function verifyAndActivateSubscription(userId: string): Promise<ResolvedSubscription> {
  // Fast path: subscription already written (webhook arrived first).
  const existing = await _getSubscription(userId);
  if (existing.tier !== 'starter') return existing;

  let providerSub;
  try {
    const provider = getPaymentProvider();
    providerSub = await provider.getActiveSubscriptionForUser(userId);
  } catch {
    return existing;
  }

  if (!providerSub) return existing;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      tier: providerSub.tierId,
      status: providerSub.status,
      billing_period: providerSub.billingPeriod,
      provider: 'lemonsqueezy',
      provider_subscription_id: providerSub.providerSubscriptionId,
      provider_customer_id: providerSub.providerCustomerId,
      current_period_start: providerSub.periodStart.toISOString(),
      current_period_end: providerSub.periodEnd.toISOString(),
      cancel_at_period_end: providerSub.cancelAtPeriodEnd,
      ...(providerSub.priceAmount != null && { price_amount: providerSub.priceAmount }),
      ...(providerSub.currency != null && { currency: providerSub.currency }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('[billing/subscription] verifyAndActivate upsert failed:', error.message);
    return existing;
  }

  // Keep social feed badge tier in sync even before webhook delivery.
  const syncedTier = ['active', 'trialing', 'admin_granted', 'past_due'].includes(providerSub.status)
    ? providerSub.tierId
    : 'starter';
  await (supabase as ReturnType<typeof createServiceRoleClient> & { from: (table: string) => any })
    .from('social_profiles')
    .update({ tier: syncedTier, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  return _getSubscription(userId);
}

/** Tiers the user can actually buy. Starter is free, Elite is unlaunched. */
type PaidTierId = Extract<TierId, 'starter_plus' | 'pro'>;

/**
 * Resolve the Lemon Squeezy variant ID for a given tier + billing period,
 * preferring the Pro promo variant when the caller requests it AND seats
 * remain. The slot count is re-checked against the live DB inside this
 * function so the client never controls whether the discount applies.
 *
 * Promo only applies to Pro. Starter Plus always uses its regular variants.
 */
async function resolveTierVariantId(
  tier: PaidTierId,
  billingPeriod: BillingPeriod,
  preferPromo: boolean,
): Promise<string> {
  if (tier === 'pro' && preferPromo) {
    const promo = TIER_DEFINITIONS.pro.pricing.promo;
    const used = await getPromoSlotsUsed();
    if (promo && used < PROMO_LIMIT) {
      const promoId =
        billingPeriod === 'monthly'
          ? promo.monthly.productId
          : promo.annual.productId;
      if (promoId) return promoId;
      console.warn(`[billing] Promo variant ID not configured for ${billingPeriod} — falling back to regular variant`);
    }
  }
  const tierDef = TIER_DEFINITIONS[tier];
  const regularId =
    billingPeriod === 'monthly'
      ? (tierDef.pricing.monthly?.productId ?? '')
      : (tierDef.pricing.annual?.productId ?? '');
  if (!regularId) {
    throw new Error(`[billing] Missing Lemon Squeezy variant ID for tier=${tier} ${billingPeriod} checkout.`);
  }
  return regularId;
}

/**
 * Server action: create a Lemon Squeezy checkout URL for the authenticated user.
 * Returns the URL; client then does router.push(url).
 */
export async function createCheckoutUrl(
  tier: PaidTierId,
  billingPeriod: BillingPeriod,
  usePromo = false,
): Promise<string> {
  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');
  const productId = await resolveTierVariantId(tier, billingPeriod, usePromo);

  const provider = getPaymentProvider();
  const appUrl = getAppUrl();
  const { checkoutUrl } = await provider.createCheckoutSession({
    productId,
    userId: session.user.id,
    email: session.user.email,
    billingPeriod,
    successUrl: `${appUrl}/settings?tab=billing&success=1`,
  });

  return checkoutUrl;
}

/**
 * Server action: create a Lemon Squeezy checkout URL for anonymous (unauthenticated) users.
 * No session required — user is resolved from email by the webhook after purchase.
 */
export async function createPublicCheckoutUrl(
  tier: PaidTierId,
  billingPeriod: BillingPeriod,
  usePromo = false,
): Promise<string> {
  const productId = await resolveTierVariantId(tier, billingPeriod, usePromo);

  const provider = getPaymentProvider();
  const appUrl = getAppUrl();
  const { checkoutUrl } = await provider.createCheckoutSession({
    productId,
    billingPeriod,
    successUrl: `${appUrl}/login?checkout=success`,
  });

  return checkoutUrl;
}

/**
 * Server action: create a Lemon Squeezy customer portal URL.
 * Admin-granted users have no subscription ID — return null so the UI can show a message.
 */
export async function createPortalUrl(): Promise<string | null> {
  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('subscriptions')
    .select('provider, provider_subscription_id')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row?.provider_subscription_id || row.provider !== 'lemonsqueezy') {
    return null;
  }

  const provider = getPaymentProvider();
  const appUrl = getAppUrl();
  const { portalUrl } = await provider.createCustomerPortalSession({
    customerId: row.provider_subscription_id,
    returnUrl: `${appUrl}/settings?tab=billing`,
  });

  return portalUrl;
}

/**
 * Server action: get the direct apply-discount URL for the current user's subscription.
 * Lands on the LemonSqueezy page where the user can enter a coupon code against their active sub.
 */
export async function createApplyDiscountUrl(): Promise<string | null> {
  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('subscriptions')
    .select('provider, provider_subscription_id')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row?.provider_subscription_id || row.provider !== 'lemonsqueezy') {
    return null;
  }

  const provider = getPaymentProvider();
  const { url } = await provider.getApplyDiscountUrl({
    subscriptionId: row.provider_subscription_id,
  });
  return url;
}

/**
 * Server action: get the direct update-payment-method URL for the current user's subscription.
 * Used on the past_due banner for a frictionless card update flow.
 */
export async function createUpdatePaymentMethodUrl(): Promise<string | null> {
  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('subscriptions')
    .select('provider, provider_subscription_id')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row?.provider_subscription_id || row.provider !== 'lemonsqueezy') {
    return null;
  }

  const provider = getPaymentProvider();
  const { url } = await provider.getUpdatePaymentMethodUrl({
    subscriptionId: row.provider_subscription_id,
  });
  return url;
}

/**
 * Server action: cancel current user's Lemon Squeezy subscription.
 * Enters grace period — access continues until end of billing period.
 */
export async function cancelCurrentSubscription(): Promise<{
  ok: boolean;
  userId?: string;
  message?: string;
  subscription?: ResolvedSubscription;
}> {
  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('subscriptions')
    .select('provider, provider_subscription_id, current_period_end, updated_at')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to resolve active subscription: ${error.message}`);
  }

  const cancelTarget = (rows ?? []).find(
    (row) => row.provider === 'lemonsqueezy' && Boolean(row.provider_subscription_id)
  );

  if (!cancelTarget?.provider_subscription_id) {
    return { ok: false, userId: session.user.id, message: 'No active Lemon Squeezy subscription to cancel.' };
  }

  const provider = getPaymentProvider();
  await provider.cancelSubscription(cancelTarget.provider_subscription_id);

  // Grace period: mark as canceling at period end, keep status active.
  // The subscription_expired webhook will flip status to 'canceled' when the period ends.
  const serviceClient = createServiceRoleClient();
  const { error: updateError } = await serviceClient
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', session.user.id)
    .eq('provider', 'lemonsqueezy')
    .eq('provider_subscription_id', cancelTarget.provider_subscription_id);
  if (updateError) {
    console.error('[billing/subscription] optimistic cancel update failed:', updateError.message);
  }

  const current = await _getSubscription(session.user.id);
  return { ok: true, userId: session.user.id, subscription: current };
}

/**
 * Server action: generate/retrieve invoice URL for latest order of current customer.
 * Returns ready URL when available, or scheduled when generation is queued.
 */
export async function getLatestInvoiceUrl(): Promise<{
  status: 'ready' | 'scheduled' | 'missing_order';
  invoiceUrl?: string;
}> {
  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('subscriptions')
    .select('provider, provider_subscription_id')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'trialing', 'past_due', 'admin_granted'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row?.provider_subscription_id || row.provider !== 'lemonsqueezy') {
    return { status: 'missing_order' };
  }

  const provider = getPaymentProvider();
  return provider.getLatestOrderInvoice({ customerId: row.provider_subscription_id });
}

// ── Server-side feature helpers ───────────────────────────────────────────────

/**
 * Check if the current user has a specific feature flag (for API route guards).
 */
export async function hasFeature(
  userId: string,
  flag: keyof ResolvedSubscription['definition']['features']
): Promise<boolean> {
  const sub = await getCachedSubscription(userId);
  return sub.definition.features[flag] === true;
}

/**
 * Check if a user can add more strategies (enforces maxStrategies limit).
 */
export async function canAddStrategy(userId: string, currentCount: number): Promise<boolean> {
  const sub = await getCachedSubscription(userId);
  const max = sub.definition.limits.maxStrategies;
  if (max === null) return true;
  return currentCount < max;
}

/**
 * Check if a user can add more accounts (enforces maxAccounts limit).
 */
export async function canAddAccount(userId: string, currentCount: number): Promise<boolean> {
  const sub = await getCachedSubscription(userId);
  const max = sub.definition.limits.maxAccounts;
  if (max === null) return true;
  return currentCount < max;
}

/**
 * Returns how many trades the user can still add this calendar month.
 * null = unlimited.
 *
 * Precedence:
 *   1. Tier limit is unlimited (Pro / Elite) → return null
 *   2. Otherwise count current-month trades against the tier cap
 *      (Starter = 50, Starter Plus = 250)
 */
export async function getRemainingTrades(
  userId: string,
  mode: 'live' | 'backtesting' | 'demo'
): Promise<number | null> {
  const sub = await getCachedSubscription(userId);
  const max = sub.definition.limits.maxMonthlyTrades;
  if (max === null) return null;

  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from(`${mode}_trades`)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  return Math.max(0, max - (count ?? 0));
}

export interface TradeLedgerQuota {
  /** Current calendar-month generation count. */
  used: number;
  /** Monthly cap. null = unlimited. */
  limit: number | null;
  /** null = unlimited. Otherwise `max(0, limit - used)`. */
  remaining: number | null;
}

/** First instant of the current UTC calendar month, as ISO. */
function startOfMonthIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Trade Ledger PDF generations in the current calendar month (UTC).
 * `limit === null` means unlimited (Pro / Elite).
 */
export async function getTradeLedgerQuota(userId: string): Promise<TradeLedgerQuota> {
  const sub = await getCachedSubscription(userId);
  const limit = sub.definition.limits.maxMonthlyTradeLedgers;

  const supabase = await createClient();
  const { count } = await supabase
    .from('trade_ledger_generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonthIso());

  const used = count ?? 0;
  const remaining = limit === null ? null : Math.max(0, limit - used);
  return { used, limit, remaining };
}

/**
 * Logs a successful generation. Call only AFTER the PDF renders so failed
 * attempts don't burn a slot.
 */
export async function recordTradeLedgerGeneration(
  userId: string,
): Promise<TradeLedgerQuota> {
  const supabase = await createClient();
  await supabase.from('trade_ledger_generations').insert({ user_id: userId });
  return getTradeLedgerQuota(userId);
}
