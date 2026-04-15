'use server';

/**
 * Leaf module for add-on state reads.
 *
 * Contains ONLY read operations. No mutations, no LS calls, no circular deps.
 * Both `src/lib/server/subscription.ts` (getRemainingTrades) and
 * `src/lib/server/addons.ts` (mutations) import from here.
 *
 * ER-4: all reads are fail-closed. On any Supabase error, `hasActiveStarterPlus`
 * returns `false` so the caller falls back to the tier trade cap. A DB outage
 * must never silently grant unlimited access to Starter users.
 *
 * ER-7: grace-period logic mirrors `resolveFromRow` in subscription.ts —
 * a canceled addon whose current_period_end has already passed is treated as
 * inactive even if the row hasn't been marked canceled yet by the webhook.
 */

import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import type { AddonId, ResolvedAddon, UserAddonRow } from '@/types/addon';

/** Statuses that are eligible for "addon is active" — mirrors the tier pattern. */
const ACTIVE_STATUSES = ['active', 'trialing', 'admin_granted', 'past_due'] as const;

function resolveFromRow(row: UserAddonRow): ResolvedAddon {
  const periodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
  const now = new Date();

  // If canceled-at-period-end and the period has actually ended, treat inactive.
  const isGracePeriodExpired =
    row.cancel_at_period_end === true && periodEnd !== null && periodEnd < now;

  const isActive =
    (ACTIVE_STATUSES as readonly string[]).includes(row.status) && !isGracePeriodExpired;

  return {
    id: row.addon_type,
    isActive,
    status: row.status,
    periodEnd,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    providerSubscriptionId: row.provider_subscription_id,
    provider: row.provider,
    priceAmount: row.price_amount,
    currency: row.currency,
  };
}

async function _getActiveAddons(userId: string): Promise<ResolvedAddon[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_addons')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'admin_granted', 'past_due']);

    if (error || !data) return [];

    const resolved = (data as UserAddonRow[]).map(resolveFromRow).filter((a) => a.isActive);
    return resolved;
  } catch {
    // ER-4: fail closed — DB outage returns no active addons so the caller
    // falls back to the tier limits.
    return [];
  }
}

/**
 * Returns all active addons for a user. Cached per-request via React `cache()`
 * so multiple callers in the same request (e.g. `getRemainingTrades` +
 * settings page) share one query.
 */
export const getCachedActiveAddons = cache(_getActiveAddons);

/**
 * Fast path check for the most common gate: does the user have Starter Plus?
 * Used by `getRemainingTrades` on every trade insert. Fail-closed on DB error.
 */
export async function hasActiveStarterPlus(userId: string): Promise<boolean> {
  const addons = await getCachedActiveAddons(userId);
  return addons.some((a) => a.id === 'starter_plus');
}

/**
 * Returns the active addon row for a specific addon type, or null.
 * Used by the settings billing tab and by `cancelAddon` to look up the
 * provider_subscription_id before calling LS.
 */
export async function getActiveAddon(
  userId: string,
  addonId: AddonId,
): Promise<ResolvedAddon | null> {
  const addons = await getCachedActiveAddons(userId);
  return addons.find((a) => a.id === addonId) ?? null;
}
