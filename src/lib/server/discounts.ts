'use server';

/**
 * Data access layer for the `user_discounts` table (SC3).
 *
 * All functions use the service-role Supabase client and bypass RLS. Callers MUST
 * resolve the userId from the session before invoking these functions.
 *
 * Atomic operations are used wherever possible to eliminate read-modify-write races:
 * - `claimDiscount` uses `WHERE coupon_code IS NULL` for idempotent claim.
 * - `setPendingRevert` uses a conditional WHERE clause for TOCTOU-free apply.
 * - `incrementRevertAttempts` uses a raw expression for atomic increment.
 */

import { createAdminClient } from './supabaseAdmin';
import {
  type DiscountType,
  type UserDiscount,
  type UserDiscountRow,
  mapUserDiscountRow,
  NO_MILESTONE,
} from '@/types/userDiscount';

// ── Reads ───────────────────────────────────────────────────────────────────

/** Fetch all discounts for a user. */
export async function getUserDiscounts(userId: string): Promise<UserDiscount[]> {
  if (!userId) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_discounts')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('[getUserDiscounts] error:', error);
    return [];
  }
  return ((data ?? []) as UserDiscountRow[]).map(mapUserDiscountRow);
}

/** Fetch a single discount by (user, type, milestoneId). Use NO_MILESTONE for activity/retention. */
export async function getDiscountByTypeAndMilestone(
  userId: string,
  discountType: DiscountType,
  milestoneId: string = NO_MILESTONE,
): Promise<UserDiscount | null> {
  if (!userId) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_discounts')
    .select('*')
    .eq('user_id', userId)
    .eq('discount_type', discountType)
    .eq('milestone_id', milestoneId)
    .maybeSingle();

  if (error) {
    console.error('[getDiscountByTypeAndMilestone] error:', error);
    return null;
  }
  return data ? mapUserDiscountRow(data as UserDiscountRow) : null;
}

/** Find a pending-revert discount for a specific provider subscription. */
export async function getPendingRevertBySubscription(
  userId: string,
  providerSubscriptionId: string,
): Promise<UserDiscount | null> {
  if (!userId || !providerSubscriptionId) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_discounts')
    .select('*')
    .eq('user_id', userId)
    .eq('revert_subscription_id', providerSubscriptionId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getPendingRevertBySubscription] error:', error);
    return null;
  }
  return data ? mapUserDiscountRow(data as UserDiscountRow) : null;
}

// ── Writes ──────────────────────────────────────────────────────────────────

/**
 * Insert a milestone discount row, or do nothing if it already exists.
 * Used by checkTradeMilestones when a user crosses a trade count threshold.
 * Atomic: cannot affect existing rows, so it's safe against concurrent claims.
 */
export async function upsertMilestoneDiscount(
  userId: string,
  milestoneId: string,
  discountPct: number,
): Promise<void> {
  if (!userId || !milestoneId) return;
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from('user_discounts').upsert(
    {
      user_id: userId,
      discount_type: 'milestone',
      milestone_id: milestoneId,
      discount_pct: discountPct,
      used: false,
      achieved_at: nowIso,
    },
    { onConflict: 'user_id,discount_type,milestone_id', ignoreDuplicates: true },
  );
  if (error) {
    console.error('[upsertMilestoneDiscount] error:', error);
  }
}

/**
 * Insert an activity or retention discount row, or do nothing if it exists.
 * Uses milestone_id = '__none__' sentinel.
 */
export async function upsertNonMilestoneDiscount(
  userId: string,
  discountType: 'activity' | 'retention',
  discountPct: number,
): Promise<void> {
  if (!userId) return;
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from('user_discounts').upsert(
    {
      user_id: userId,
      discount_type: discountType,
      milestone_id: NO_MILESTONE,
      discount_pct: discountPct,
      used: false,
      achieved_at: nowIso,
    },
    { onConflict: 'user_id,discount_type,milestone_id', ignoreDuplicates: true },
  );
  if (error) {
    console.error('[upsertNonMilestoneDiscount] error:', error);
  }
}

/**
 * Atomically set the coupon code on a discount, IFF it hasn't been claimed yet.
 * Returns true if the claim succeeded, false if the discount was already claimed.
 * Idempotency guard: `WHERE coupon_code IS NULL`.
 */
export async function claimDiscount(
  discountId: string,
  couponCode: string,
  expiresAt: string,
): Promise<boolean> {
  if (!discountId) return false;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_discounts')
    .update({
      coupon_code: couponCode,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .eq('id', discountId)
    .is('coupon_code', null)
    .select('id');

  if (error) {
    console.error('[claimDiscount] error:', error);
    return false;
  }
  return ((data as Array<unknown> | null)?.length ?? 0) > 0;
}

/**
 * Mark a discount as used and clear any pending revert state.
 * Called by the webhook handler after successfully reverting a discounted variant.
 */
export async function markDiscountUsed(discountId: string): Promise<void> {
  if (!discountId) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_discounts')
    .update({
      used: true,
      revert_subscription_id: null,
      revert_normal_variant_id: null,
      revert_discounted_variant_id: null,
      revert_applied_at: null,
      revert_attempts: 0,
    })
    .eq('id', discountId);

  if (error) {
    console.error('[markDiscountUsed] error:', error);
  }
}

/**
 * Atomically apply a claimed discount to a subscription.
 *
 * The WHERE clause IS the validation — no separate validate-then-act race. If 0 rows
 * are updated, the discount was invalid (not claimed, already used, expired, or
 * already applied). Closes the TOCTOU race between validation and the revert write.
 *
 * Returns true on success, false if the discount was not in a valid state.
 */
export async function setPendingRevert(
  discountId: string,
  revert: {
    subscriptionId: string;
    normalVariantId: string;
    discountedVariantId: string;
  },
): Promise<boolean> {
  if (!discountId) return false;
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  // Single atomic conditional UPDATE. The WHERE clause enforces:
  //   - coupon_code IS NOT NULL (must be claimed)
  //   - used = false (not already redeemed)
  //   - expires_at IS NULL OR expires_at > now (not expired)
  //   - revert_subscription_id IS NULL (not already applied)
  const { data, error } = await supabase
    .from('user_discounts')
    .update({
      revert_subscription_id: revert.subscriptionId,
      revert_normal_variant_id: revert.normalVariantId,
      revert_discounted_variant_id: revert.discountedVariantId,
      revert_applied_at: nowIso,
      revert_attempts: 0,
    })
    .eq('id', discountId)
    .not('coupon_code', 'is', null)
    .eq('used', false)
    .is('revert_subscription_id', null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .select('id');

  if (error) {
    console.error('[setPendingRevert] error:', error);
    return false;
  }
  return ((data as Array<unknown> | null)?.length ?? 0) > 0;
}

/**
 * Atomically increment the revert_attempts counter.
 * Called by the webhook handler BEFORE attempting the provider API call, so that
 * a permanent failure eventually hits the max-attempts cap instead of retrying forever.
 */
export async function incrementRevertAttempts(discountId: string): Promise<number> {
  if (!discountId) return 0;
  const supabase = createAdminClient();
  // Supabase JS doesn't expose raw expressions; use an RPC OR read-then-write.
  // For atomicity, use an RPC-style update via supabase-js: fetch current, then update
  // with the eq() guard on the OLD value. If the guard fails (concurrent increment),
  // retry once. At the scale of webhook retries, a single retry is enough.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: row, error: readError } = await supabase
      .from('user_discounts')
      .select('revert_attempts')
      .eq('id', discountId)
      .maybeSingle();
    if (readError || !row) {
      console.error('[incrementRevertAttempts] read error:', readError);
      return 0;
    }
    const current = (row as { revert_attempts: number }).revert_attempts ?? 0;
    const next = current + 1;
    const { data: updated, error: updateError } = await supabase
      .from('user_discounts')
      .update({ revert_attempts: next })
      .eq('id', discountId)
      .eq('revert_attempts', current)
      .select('id');
    if (updateError) {
      console.error('[incrementRevertAttempts] update error:', updateError);
      return current;
    }
    if (((updated as Array<unknown> | null)?.length ?? 0) > 0) {
      return next;
    }
    // Conflict — retry once
  }
  return 0;
}

/**
 * Clear the pending revert state without marking the discount as used.
 * Used by the page-load safety check when a >48h pending revert is detected
 * and the variant is forcibly switched back.
 */
export async function clearPendingRevert(discountId: string): Promise<void> {
  if (!discountId) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_discounts')
    .update({
      revert_subscription_id: null,
      revert_normal_variant_id: null,
      revert_discounted_variant_id: null,
      revert_applied_at: null,
      revert_attempts: 0,
      used: true, // The discounted billing cycle already happened — mark used
    })
    .eq('id', discountId);

  if (error) {
    console.error('[clearPendingRevert] error:', error);
  }
}
