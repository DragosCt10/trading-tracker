'use server';

import { cache } from 'react';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from './session';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { TierId, BillingPeriod, ResolvedSubscription, SubscriptionRow } from '@/types/subscription';
import { getPaymentProvider } from '@/lib/billing';

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
      .maybeSingle();

    if (error || !data) return STARTER_SUBSCRIPTION;

    return resolveFromRow(data as SubscriptionRow);
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
    row.status === 'admin_granted';

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
  };
}

// ── Admin grant / revoke ──────────────────────────────────────────────────────

/**
 * Grant a subscription tier to a user (admin only — no Polar payment required).
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
 * Server action: create a Polar checkout URL.
 * Returns the URL; client then does router.push(url).
 */
export async function createCheckoutUrl(
  billingPeriod: BillingPeriod
): Promise<string> {
  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');
  const productId =
    billingPeriod === 'monthly'
      ? (TIER_DEFINITIONS.pro.pricing.monthly?.polarProductId ?? '')
      : (TIER_DEFINITIONS.pro.pricing.annual?.polarProductId ?? '');
  if (!productId) {
    throw new Error(`[billing] Missing Polar product ID for ${billingPeriod} checkout.`);
  }

  const provider = getPaymentProvider();
  const appUrl = getAppUrl();
  const { checkoutUrl } = await provider.createCheckoutSession({
    productId,
    userId: session.user.id,
    billingPeriod,
    successUrl: `${appUrl}/billing?success=1`,
  });

  return checkoutUrl;
}

/**
 * Server action: create a Polar customer portal URL.
 * Admin-granted users have no Polar customer ID — return null so the UI can show a message.
 */
export async function createPortalUrl(): Promise<string | null> {
  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');

  const subscription = await getCachedSubscription(session.user.id);

  // Admin-granted users have no Polar customer ID
  if (!subscription.providerCustomerId || subscription.provider !== 'polar') {
    return null;
  }

  const provider = getPaymentProvider();
  const appUrl = getAppUrl();
  const { portalUrl } = await provider.createCustomerPortalSession({
    customerId: subscription.providerCustomerId,
    returnUrl: `${appUrl}/billing`,
  });

  return portalUrl;
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
