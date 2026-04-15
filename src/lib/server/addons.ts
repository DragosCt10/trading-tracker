'use server';

import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getPaymentProvider } from '@/lib/billing';
import { checkRateLimit } from '@/lib/rateLimit';
import { ADDON_DEFINITIONS, isAddonAvailable } from '@/constants/addons';
import type { AddonId } from '@/types/addon';
import { getCachedUserSession } from './session';
import { getActiveAddon, hasActiveStarterPlus } from './addonState';
import type { ResolvedAddon } from '@/types/addon';

/**
 * Server actions for add-on lifecycle:
 *   - create checkout (authenticated + anonymous)
 *   - cancel
 *
 * Reads live in `./addonState.ts` (leaf module, no circular deps).
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return h.get('x-real-ip')?.trim() ?? 'unknown';
}

/**
 * AUD-6: Rate limit addon checkout creation.
 *   - Anonymous (public): 10 per IP per hour
 *   - Authenticated:      20 per user per hour
 * Fails open on RPC error (same policy as the shared rateLimit helper).
 */
const ANON_RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };
const AUTH_RATE_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 };

// ── Public (anonymous) checkout ──────────────────────────────────────────────

/**
 * Create a Lemon Squeezy checkout URL for an add-on. Safe for anonymous users
 * on /pricing — the webhook resolves the user from the checkout email after
 * payment succeeds (same pattern as `createPublicCheckoutUrl`).
 *
 * ER-1: throws if the add-on is not configured in env. The pricing page must
 * hide the CTA in that state so this path should be unreachable in prod.
 */
export async function createPublicAddonCheckoutUrl(addonId: AddonId): Promise<string> {
  if (!isAddonAvailable(addonId)) {
    throw new Error(`[billing/addon] addon not configured: ${addonId}`);
  }

  // AUD-6: per-IP rate limit.
  const ip = await getClientIp();
  const allowed = await checkRateLimit(
    `addon:checkout:public:${ip}`,
    ANON_RATE_LIMIT.limit,
    ANON_RATE_LIMIT.windowMs,
  );
  if (!allowed) {
    console.warn(`[billing/addon] rate_limited ip=${ip} addonId=${addonId} path=public`);
    throw new Error('Too many checkout attempts. Please try again in an hour.');
  }

  const definition = ADDON_DEFINITIONS[addonId];
  const provider = getPaymentProvider();
  const { checkoutUrl } = await provider.createCheckoutSession({
    productId: definition.productId,
    billingPeriod: 'monthly',
    successUrl: `${getAppUrl()}/login?checkout=success`,
  });

  console.log(`[billing/addon] checkout_created addonId=${addonId} userId=- ip=${ip}`);
  return checkoutUrl;
}

// ── Authenticated checkout with duplicate guard ──────────────────────────────

export interface AuthenticatedAddonCheckoutResult {
  /** Either the LS checkout URL or the customer portal URL when already subscribed. */
  url: string;
  /** When true, the user already has this add-on and the URL is the portal. */
  alreadyActive: boolean;
}

/**
 * Create an addon checkout URL for the currently authenticated user.
 *
 * ER-6 (double-purchase guard): if the user already has an active Starter Plus,
 * return the LS customer portal URL instead of creating a new checkout so the
 * caller can show a toast and redirect. Prevents double-charging.
 */
export async function createAddonCheckoutUrl(
  addonId: AddonId,
): Promise<AuthenticatedAddonCheckoutResult> {
  if (!isAddonAvailable(addonId)) {
    throw new Error(`[billing/addon] addon not configured: ${addonId}`);
  }

  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');
  const userId = session.user.id;

  // AUD-6: per-user rate limit.
  const allowed = await checkRateLimit(
    `addon:checkout:auth:${userId}`,
    AUTH_RATE_LIMIT.limit,
    AUTH_RATE_LIMIT.windowMs,
  );
  if (!allowed) {
    console.warn(`[billing/addon] rate_limited userId=${userId} addonId=${addonId} path=auth`);
    throw new Error('Too many checkout attempts. Please try again in an hour.');
  }

  // ER-6: duplicate-purchase guard — return portal URL if already active.
  if (addonId === 'starter_plus' && (await hasActiveStarterPlus(userId))) {
    const existing = await getActiveAddon(userId, addonId);
    if (existing?.providerSubscriptionId && existing.provider === 'lemonsqueezy') {
      const provider = getPaymentProvider();
      const { portalUrl } = await provider.createCustomerPortalSession({
        customerId: existing.providerSubscriptionId,
        returnUrl: `${getAppUrl()}/settings?tab=billing`,
      });
      console.log(
        `[billing/addon] checkout_blocked_duplicate userId=${userId} existing_sub=${existing.providerSubscriptionId}`,
      );
      return { url: portalUrl, alreadyActive: true };
    }
  }

  const definition = ADDON_DEFINITIONS[addonId];
  const provider = getPaymentProvider();
  const { checkoutUrl } = await provider.createCheckoutSession({
    productId: definition.productId,
    userId,
    billingPeriod: 'monthly',
    successUrl: `${getAppUrl()}/settings?tab=billing&success=1`,
  });

  console.log(`[billing/addon] checkout_created addonId=${addonId} userId=${userId}`);
  return { url: checkoutUrl, alreadyActive: false };
}

// ── Post-checkout fast-path (bridges webhook latency) ───────────────────────

/**
 * Verify directly with Lemon Squeezy that the user has an active add-on
 * subscription and upsert the DB row if found. Bridges the gap between LS
 * checkout completion and the webhook's arrival — normally <5s but can be
 * longer under load.
 *
 * Mirrors `verifyAndActivateSubscription` in subscription.ts.
 *
 * Safe to call repeatedly (the upsert is idempotent via onConflict).
 */
export async function verifyAndActivateAddon(
  addonId: AddonId,
): Promise<ResolvedAddon | null> {
  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');
  const userId = session.user.id;

  // Fast path: addon row already written by the webhook.
  const existing = await getActiveAddon(userId, addonId);
  if (existing?.isActive) return existing;

  const provider = getPaymentProvider();
  if (typeof provider.getActiveAddonSubscriptionForUser !== 'function') {
    return existing;
  }

  let providerAddon;
  try {
    providerAddon = await provider.getActiveAddonSubscriptionForUser(userId, addonId);
  } catch {
    return existing;
  }

  if (!providerAddon) return existing;

  const serviceClient = createServiceRoleClient();
  const addonClient = serviceClient as unknown as {
    from: (table: string) => {
      upsert: (
        values: Record<string, unknown>,
        options: { onConflict: string },
      ) => Promise<{ error: { message: string } | null }>;
    };
  };

  const { error } = await addonClient.from('user_addons').upsert(
    {
      user_id: userId,
      addon_type: providerAddon.addonId,
      status: providerAddon.status,
      provider: 'lemonsqueezy',
      provider_subscription_id: providerAddon.providerSubscriptionId,
      provider_customer_id: providerAddon.providerCustomerId,
      current_period_start: providerAddon.periodStart.toISOString(),
      current_period_end: providerAddon.periodEnd.toISOString(),
      cancel_at_period_end: providerAddon.cancelAtPeriodEnd,
      ...(providerAddon.priceAmount != null && { price_amount: providerAddon.priceAmount }),
      ...(providerAddon.currency != null && { currency: providerAddon.currency }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,addon_type' },
  );

  if (error) {
    console.error('[billing/addon] verifyAndActivate upsert failed:', error.message);
    return existing;
  }

  console.log(
    `[billing/addon] verified_and_activated userId=${userId} addonId=${addonId} providerSubscriptionId=${providerAddon.providerSubscriptionId}`,
  );

  // Construct the fresh ResolvedAddon from the provider data. We cannot rely
  // on `getActiveAddon` here because React `cache()` memoizes per-request —
  // the second call would return the earlier empty result. Since we just
  // wrote the row ourselves, we know the data.
  const isActive = ['active', 'trialing', 'admin_granted', 'past_due'].includes(
    providerAddon.status,
  );
  return {
    id: providerAddon.addonId,
    isActive,
    status: providerAddon.status,
    periodEnd: providerAddon.periodEnd,
    cancelAtPeriodEnd: providerAddon.cancelAtPeriodEnd,
    providerSubscriptionId: providerAddon.providerSubscriptionId,
    provider: 'lemonsqueezy',
    priceAmount: providerAddon.priceAmount,
    currency: providerAddon.currency,
  };
}

// ── Cancel ───────────────────────────────────────────────────────────────────

export interface CancelAddonResult {
  ok: boolean;
  message?: string;
  /** New cancel_at_period_end value after the optimistic update. */
  cancelAtPeriodEnd?: boolean;
}

/**
 * Cancel the user's addon subscription. Enters LS grace period — access
 * continues until current_period_end. The webhook finalizes when the period
 * expires. Mirrors `cancelCurrentSubscription` in subscription.ts.
 */
export async function cancelAddon(addonId: AddonId): Promise<CancelAddonResult> {
  const session = await getCachedUserSession();
  if (!session.user) throw new Error('Not authenticated');
  const userId = session.user.id;

  const existing = await getActiveAddon(userId, addonId);
  if (!existing?.providerSubscriptionId || existing.provider !== 'lemonsqueezy') {
    return { ok: false, message: 'No active Lemon Squeezy add-on to cancel.' };
  }

  const provider = getPaymentProvider();
  await provider.cancelSubscription(existing.providerSubscriptionId);

  // Optimistic-update cancel_at_period_end so the UI reflects the cancel
  // immediately. The subscription_cancelled / subscription_expired webhooks
  // will flip status to 'canceled' when the billing period actually ends.
  //
  // The generated @/types/supabase types don't include user_addons yet —
  // cast locally (same pattern as webhook-handler.ts and social_profiles).
  const serviceClient = createServiceRoleClient();
  const addonClient = serviceClient as unknown as {
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (c: string, v: unknown) => {
          eq: (c: string, v: unknown) => {
            eq: (c: string, v: unknown) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };
  };
  const { error: updateError } = await addonClient
    .from('user_addons')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('addon_type', addonId)
    .eq('provider_subscription_id', existing.providerSubscriptionId);
  if (updateError) {
    console.error('[billing/addon] optimistic cancel update failed:', updateError.message);
  }

  console.log(
    `[billing/addon] canceled userId=${userId} providerSubscriptionId=${existing.providerSubscriptionId}`,
  );
  return { ok: true, cancelAtPeriodEnd: true };
}
