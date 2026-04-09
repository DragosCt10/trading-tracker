'use server';

import { getCachedUserSession } from './session';
import { getPaymentProvider } from '@/lib/billing';
import { getMilestoneById, type TradeMilestoneId } from '@/constants/tradeMilestones';
import { resolveSubscription } from './subscription';
import { monthsSince } from '@/utils/helpers/dateHelpers';
import { randomBytes } from 'crypto';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import { getDiscountedVariantId } from '@/constants/discountedVariants';
import { createClient } from '@/utils/supabase/server';
import {
  getDiscountByTypeAndMilestone,
  upsertMilestoneDiscount,
  upsertNonMilestoneDiscount,
  claimDiscount,
  setPendingRevert,
} from './discounts';
import { NO_MILESTONE, type UserDiscount } from '@/types/userDiscount';

// Simple in-memory rate limiter — resets on server restart, per-instance
// Good enough to prevent abuse; not a substitute for infrastructure-level rate limiting
const _rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(userId: string, action: string): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = _rateLimitStore.get(key);
  if (!entry || now >= entry.resetAt) {
    _rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

/**
 * DEV ONLY — seeds the test_trader discount entry in user_discounts so the
 * full coupon-code flow can be tested without needing 100+ real trades.
 * No-ops in production.
 */
export async function devSeedTestMilestone(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;
  const { user } = await getCachedUserSession();
  if (!user) return;
  await upsertMilestoneDiscount(user.id, 'test_trader', 5);
}

type RedeemResult =
  | { couponCode: string; expiresAt: string }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'ALREADY_USED' | 'NOT_EARNED' | 'EXPIRED' | 'PROVIDER_ERROR' };

/**
 * Shared helper: given a discount row, either return the existing (valid) coupon code
 * or generate a new one via the payment provider and persist it atomically.
 *
 * Security fix (cosmetic-expiry-server-bypass): rejects expired coupons in the idempotency
 * path — the server never returns an expired coupon, even if it was previously generated.
 */
async function claimAndGenerateCoupon(
  discount: UserDiscount,
  codePrefix: string,
  discountLabel: string,
): Promise<RedeemResult> {
  // Already used?
  if (discount.used) return { error: 'Discount already used', code: 'ALREADY_USED' };

  // Idempotent: if code was already generated, return it — unless expired.
  if (discount.couponCode) {
    if (discount.expiresAt && new Date(discount.expiresAt) <= new Date()) {
      return { error: 'Coupon has expired', code: 'EXPIRED' };
    }
    return { couponCode: discount.couponCode, expiresAt: discount.expiresAt ?? '' };
  }

  // Generate a unique, human-readable coupon code: e.g. ROOKIE-A1B2C3D4
  const suffix = randomBytes(6).toString('hex').toUpperCase();
  const generatedCode = `${codePrefix}${suffix}`;

  try {
    const provider = getPaymentProvider();
    const { code } = await provider.createDiscountCode({
      discountPct: discount.discountPct,
      discountLabel,
      code: generatedCode,
    });

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);
    const expiresAtIso = expiresAt.toISOString();

    // Atomic claim: UPDATE WHERE coupon_code IS NULL
    const claimed = await claimDiscount(discount.id, code, expiresAtIso);
    if (!claimed) {
      // Concurrent claim won — re-read and return the winner's code.
      // This is extremely rare since the rate limiter blocks rapid-fire claims.
      return { error: 'Discount already claimed', code: 'ALREADY_USED' };
    }

    return { couponCode: code, expiresAt: expiresAtIso };
  } catch (err) {
    console.error('[claimAndGenerateCoupon] provider error:', err);
    return { error: 'Failed to generate discount code', code: 'PROVIDER_ERROR' };
  }
}

/**
 * Server action: redeem a trade milestone discount.
 * Creates a Lemon Squeezy coupon code the user can apply at checkout themselves.
 * Idempotent via the user_discounts table.
 */
export async function redeemMilestoneDiscount(
  milestoneId: TradeMilestoneId,
): Promise<RedeemResult> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };
  if (!checkRateLimit(user.id, 'redeemMilestone')) return { error: 'Too many requests', code: 'UNAUTHORIZED' };

  const milestone = getMilestoneById(milestoneId);
  if (!milestone) return { error: 'Unknown milestone', code: 'NOT_FOUND' };

  const discount = await getDiscountByTypeAndMilestone(user.id, 'milestone', milestoneId);
  if (!discount) return { error: 'Milestone not yet earned', code: 'NOT_EARNED' };

  // Code prefix derived from milestone id: 'rookie_trader' → 'ROOKIE'
  const prefix = milestone.id.split('_')[0].toUpperCase();
  return claimAndGenerateCoupon(
    discount,
    prefix,
    `${milestone.badgeName} reward — ${milestone.discountPct}% off PRO`,
  );
}

/**
 * Server action: redeem the activity rank-up discount (15% off at 300 posts & comments).
 * Idempotent — returns the same code if already generated.
 * Verifies the count server-side via feed_posts + feed_comments.
 */
export async function redeemActivityDiscount(): Promise<RedeemResult> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };
  if (!checkRateLimit(user.id, 'redeemActivity')) return { error: 'Too many requests', code: 'UNAUTHORIZED' };

  // Derive profileId from session — never trust client-supplied profileId (IDOR prevention)
  const { createAdminClient } = await import('./supabaseAdmin');
  const adminDb = createAdminClient();
  const { data: profileRow } = await adminDb
    .from('social_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profileRow) return { error: 'Social profile not found', code: 'NOT_FOUND' };
  const profileId = (profileRow as { id: string }).id;

  // Verify count server-side
  const { getUserActivityCount } = await import('./feedActivity');
  const { total } = await getUserActivityCount(profileId);
  if (total < 300) return { error: 'Not yet 300 posts & comments', code: 'NOT_EARNED' };

  // Ensure the discount row exists (idempotent insert)
  await upsertNonMilestoneDiscount(user.id, 'activity', 15);
  const discount = await getDiscountByTypeAndMilestone(user.id, 'activity', NO_MILESTONE);
  if (!discount) return { error: 'Failed to create discount row', code: 'PROVIDER_ERROR' };

  return claimAndGenerateCoupon(discount, 'RANKUP', 'Rank Up reward — 15% off PRO');
}

/**
 * Server action: redeem the PRO loyalty reward (10% off after 3 months on PRO).
 * Idempotent — returns the same code if already generated.
 */
export async function redeemProRetentionDiscount(): Promise<RedeemResult> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };
  if (!checkRateLimit(user.id, 'redeemRetention')) return { error: 'Too many requests', code: 'UNAUTHORIZED' };

  const subscription = await resolveSubscription(user.id);
  const proSinceDate = subscription.createdAt;
  if (!proSinceDate || !subscription.isActive || subscription.tier === 'starter') {
    return { error: 'No PRO subscription found', code: 'NOT_EARNED' };
  }
  if (monthsSince(proSinceDate) < 3) return { error: 'Not yet 3 months on PRO', code: 'NOT_EARNED' };

  // Ensure the discount row exists (idempotent insert)
  await upsertNonMilestoneDiscount(user.id, 'retention', 10);
  const discount = await getDiscountByTypeAndMilestone(user.id, 'retention', NO_MILESTONE);
  if (!discount) return { error: 'Failed to create discount row', code: 'PROVIDER_ERROR' };

  return claimAndGenerateCoupon(discount, 'PROLOYALTY', 'PRO Loyalty Reward — 10% off');
}

type ApplyResult = { success: true } | { error: string };

/**
 * Server action: apply a discount to the user's existing PRO subscription by
 * switching to a discounted variant for one billing cycle.
 * The webhook handler auto-reverts to the normal variant after the discounted payment succeeds.
 *
 * Security fix (apply-without-claim-bypass): discount state is validated by the atomic
 * conditional UPDATE in `setPendingRevert`. A user who never claimed a coupon cannot
 * apply it, and `discount_pct` is read from the DB row, not from milestone constants.
 */
export async function applyDiscountToSubscription(
  discountId: TradeMilestoneId | 'retention' | 'activity',
): Promise<ApplyResult> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: 'Not authenticated' };
  if (!checkRateLimit(user.id, 'applyDiscount')) return { error: 'Too many requests' };

  // Resolve which discount row to use
  let discount: UserDiscount | null;
  if (discountId === 'retention') {
    discount = await getDiscountByTypeAndMilestone(user.id, 'retention', NO_MILESTONE);
  } else if (discountId === 'activity') {
    discount = await getDiscountByTypeAndMilestone(user.id, 'activity', NO_MILESTONE);
  } else {
    const milestone = getMilestoneById(discountId);
    if (!milestone) return { error: 'Unknown milestone' };
    discount = await getDiscountByTypeAndMilestone(user.id, 'milestone', discountId);
  }

  if (!discount) return { error: 'Discount not found' };
  if (!discount.couponCode) return { error: 'Coupon not yet claimed' };
  if (discount.used) return { error: 'Discount already used' };
  if (discount.expiresAt && new Date(discount.expiresAt) <= new Date()) {
    return { error: 'Coupon has expired' };
  }

  // Read discount percentage from the DB row, not from constants (security fix)
  const discountPct = discount.discountPct;

  // Fetch active subscription
  const supabase = await createClient();
  const { data: row } = await supabase
    .from('subscriptions')
    .select('tier, billing_period, provider, provider_subscription_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || row.provider !== 'lemonsqueezy') {
    return { error: 'No active Lemon Squeezy subscription found' };
  }
  if (!row.provider_subscription_id) {
    return { error: 'Subscription ID not found' };
  }

  const period = row.billing_period as 'monthly' | 'annual' | null;
  if (!period) return { error: 'Could not determine billing period' };

  // Normal variant ID (needed for the revert)
  const tierDef = TIER_DEFINITIONS[row.tier as keyof typeof TIER_DEFINITIONS];
  const normalVariantId = tierDef?.pricing[period]?.productId;
  if (!normalVariantId) return { error: 'Could not determine current variant' };

  // Discounted variant ID
  const discountedVariantId = getDiscountedVariantId(row.tier, period, discountPct);
  if (!discountedVariantId) {
    return { error: 'Discounted variant not configured yet. Please contact support.' };
  }

  // Switch subscription to discounted variant — takes effect on next billing cycle
  try {
    const provider = getPaymentProvider();
    await provider.switchSubscriptionVariant(row.provider_subscription_id, discountedVariantId);
  } catch (err) {
    console.error('[applyDiscountToSubscription] switchVariant error:', err);
    return { error: 'Failed to apply discount. Please try again.' };
  }

  // Atomic conditional UPDATE: the WHERE clause re-validates the discount state.
  // If 0 rows updated, another request beat us to it — rare but safe to report.
  const persisted = await setPendingRevert(discount.id, {
    subscriptionId: row.provider_subscription_id,
    normalVariantId,
    discountedVariantId,
  });

  if (!persisted) {
    // This should be extremely rare — the earlier validation passed but the conditional
    // UPDATE failed (another request applied the discount first). The variant switch
    // has already happened; the webhook will revert on next payment anyway.
    console.warn(
      `[applyDiscountToSubscription] pending_revert persist failed userId=${user.id} discountId=${discountId}`,
    );
    return { error: 'Discount was already applied' };
  }

  console.log(
    `[applyDiscountToSubscription] applied discountId=${discountId} discountPct=${discountPct} userId=${user.id}`,
  );
  return { success: true };
}
