'use server';

import { getCachedUserSession } from './session';
import { getFeatureFlags, updateFeatureFlags } from './settings';
import { getPaymentProvider } from '@/lib/billing';
import { getMilestoneById, type TradeMilestoneId } from '@/constants/tradeMilestones';
import { resolveSubscription } from './subscription';
import { monthsSince } from '@/utils/helpers/dateHelpers';
import { randomBytes } from 'crypto';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import { getDiscountedVariantId } from '@/constants/discountedVariants';
import { createClient } from '@/utils/supabase/server';

/**
 * DEV ONLY — seeds the test_trader discount entry into feature_flags so the
 * full coupon-code flow can be tested without needing 100+ real trades.
 * No-ops in production.
 */
export async function devSeedTestMilestone(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;

  const { user } = await getCachedUserSession();
  if (!user) return;

  const flags = await getFeatureFlags(user.id);
  const discounts = Array.isArray(flags.available_discounts)
    ? (flags.available_discounts as { milestoneId: string; discountPct: number; used: boolean; couponCode?: string }[])
    : [];

  // Always reset test_trader so a fresh code can be generated each dev session
  const withoutTest = discounts.filter((d) => d.milestoneId !== 'test_trader');
  await updateFeatureFlags(user.id, {
    ...flags,
    available_discounts: [
      { milestoneId: 'test_trader', discountPct: 5, used: false },
      ...withoutTest,
    ],
  });
}

type RedeemResult =
  | { couponCode: string; expiresAt: string }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'ALREADY_USED' | 'NOT_EARNED' | 'PROVIDER_ERROR' };

/**
 * Server action: redeem a trade milestone discount.
 * Creates a Lemon Squeezy coupon code the user can apply at checkout themselves.
 * Idempotent guard: if a code was already generated it's returned from feature_flags.
 */
export async function redeemMilestoneDiscount(
  milestoneId: TradeMilestoneId,
): Promise<RedeemResult> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const milestone = getMilestoneById(milestoneId);
  if (!milestone) return { error: 'Unknown milestone', code: 'NOT_FOUND' };

  const flags = await getFeatureFlags(user.id);
  const discounts = Array.isArray(flags.available_discounts)
    ? (flags.available_discounts as { milestoneId: string; discountPct: number; used: boolean; couponCode?: string; expiresAt?: string }[])
    : [];

  const entry = discounts.find((d) => d.milestoneId === milestoneId);
  if (!entry) return { error: 'Milestone not yet earned', code: 'NOT_EARNED' };
  if (entry.used) return { error: 'Discount already used', code: 'ALREADY_USED' };

  // Idempotent: if code was already generated return it without hitting Lemon Squeezy again
  if (entry.couponCode) return { couponCode: entry.couponCode, expiresAt: entry.expiresAt ?? '' };

  // Generate a unique, human-readable coupon code: e.g. ROOKIE-A1B2C3D4
  const prefix = milestone.id.split('_')[0].toUpperCase(); // ROOKIE / SKILLED / EXPERT / MASTER / ALPHA
  const suffix = randomBytes(6).toString('hex').toUpperCase();
  const generatedCode = `${prefix}${suffix}`;

  try {
    const provider = getPaymentProvider();
    const { code } = await provider.createDiscountCode({
      discountPct: milestone.discountPct,
      discountLabel: `${milestone.badgeName} reward — ${milestone.discountPct}% off PRO`,
      code: generatedCode,
    });

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Persist the code so re-clicks return the same code
    const updatedDiscounts = discounts.map((d) =>
      d.milestoneId === milestoneId
        ? { ...d, couponCode: code, generatedAt: now.toISOString(), expiresAt: expiresAt.toISOString() }
        : d,
    );
    await updateFeatureFlags(user.id, { ...flags, available_discounts: updatedDiscounts });

    return { couponCode: code, expiresAt: expiresAt.toISOString() };
  } catch (err) {
    console.error('[redeemMilestoneDiscount] provider error:', err);
    return { error: 'Failed to generate discount code', code: 'PROVIDER_ERROR' };
  }
}

/**
 * Server action: redeem the activity rank-up discount (15% off at 300 posts & comments).
 * Idempotent — returns the same code if already generated.
 * Verifies the count server-side via feed_posts + feed_comments.
 */
export async function redeemActivityDiscount(profileId: string): Promise<RedeemResult> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  // Verify count server-side
  const { getUserActivityCount } = await import('./feedActivity');
  const { total } = await getUserActivityCount(profileId);
  if (total < 300) return { error: 'Not yet 300 posts & comments', code: 'NOT_EARNED' };

  const flags = await getFeatureFlags(user.id);
  const existing = flags.activity_rank_up_discount as { used: boolean; couponCode?: string; expiresAt?: string } | undefined;
  if (existing?.used) return { error: 'Discount already used', code: 'ALREADY_USED' };
  if (existing?.couponCode) return { couponCode: existing.couponCode, expiresAt: existing.expiresAt ?? '' };

  const suffix = randomBytes(6).toString('hex').toUpperCase();
  const generatedCode = `RANKUP${suffix}`;

  try {
    const provider = getPaymentProvider();
    const { code } = await provider.createDiscountCode({
      discountPct: 15,
      discountLabel: 'Rank Up reward — 15% off PRO',
      code: generatedCode,
    });

    const activityExpiresAt = new Date();
    activityExpiresAt.setDate(activityExpiresAt.getDate() + 30);
    await updateFeatureFlags(user.id, {
      ...flags,
      activity_rank_up_discount: {
        used: false,
        couponCode: code,
        generatedAt: new Date().toISOString(),
        expiresAt: activityExpiresAt.toISOString(),
      },
    });

    return { couponCode: code, expiresAt: activityExpiresAt.toISOString() };
  } catch (err) {
    console.error('[redeemActivityDiscount] provider error:', err);
    return { error: 'Failed to generate discount code', code: 'PROVIDER_ERROR' };
  }
}

/**
 * Server action: redeem the PRO loyalty reward (10% off after 3 months on PRO).
 * Idempotent — returns the same code if already generated.
 */
export async function redeemProRetentionDiscount(): Promise<RedeemResult> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const subscription = await resolveSubscription(user.id);
  const proSinceDate = subscription.createdAt;
  if (!proSinceDate || !subscription.isActive || subscription.tier === 'starter') {
    return { error: 'No PRO subscription found', code: 'NOT_EARNED' };
  }
  if (monthsSince(proSinceDate) < 3) return { error: 'Not yet 3 months on PRO', code: 'NOT_EARNED' };

  const flags = await getFeatureFlags(user.id);
  const existing = flags.pro_retention_discount as { used: boolean; couponCode?: string; expiresAt?: string } | undefined;
  if (existing?.used) return { error: 'Discount already used', code: 'ALREADY_USED' };
  if (existing?.couponCode) return { couponCode: existing.couponCode, expiresAt: existing.expiresAt ?? '' };

  const suffix = randomBytes(6).toString('hex').toUpperCase();
  const generatedCode = `PROLOYALTY${suffix}`;

  try {
    const provider = getPaymentProvider();
    const { code } = await provider.createDiscountCode({
      discountPct: 10,
      discountLabel: 'PRO Loyalty Reward — 10% off',
      code: generatedCode,
    });

    const retentionExpiresAt = new Date();
    retentionExpiresAt.setDate(retentionExpiresAt.getDate() + 30);
    await updateFeatureFlags(user.id, {
      ...flags,
      pro_retention_discount: {
        used: false,
        couponCode: code,
        generatedAt: new Date().toISOString(),
        expiresAt: retentionExpiresAt.toISOString(),
      },
    });

    return { couponCode: code, expiresAt: retentionExpiresAt.toISOString() };
  } catch (err) {
    console.error('[redeemProRetentionDiscount] provider error:', err);
    return { error: 'Failed to generate discount code', code: 'PROVIDER_ERROR' };
  }
}

type ApplyResult = { success: true } | { error: string };

/**
 * Server action: apply a discount to the user's existing PRO subscription by
 * switching to a discounted variant for one billing cycle.
 * The webhook handler auto-reverts to the normal variant after the discounted payment succeeds.
 */
export async function applyDiscountToSubscription(
  discountId: TradeMilestoneId | 'retention' | 'activity',
): Promise<ApplyResult> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: 'Not authenticated' };

  // Resolve discount percentage
  let discountPct: number;
  if (discountId === 'retention') {
    discountPct = 10;
  } else if (discountId === 'activity') {
    discountPct = 15;
  } else {
    const milestone = getMilestoneById(discountId);
    if (!milestone) return { error: 'Unknown milestone' };
    discountPct = milestone.discountPct;
  }

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

  // Store pending revert so the webhook handler can switch back after one payment
  const flags = await getFeatureFlags(user.id);
  await updateFeatureFlags(user.id, {
    ...flags,
    pending_variant_revert: {
      subscriptionId: row.provider_subscription_id,
      normalVariantId,
      discountedVariantId,
      discountPct,
      discountId,
      appliedAt: new Date().toISOString(),
    },
  });

  console.log(`[applyDiscountToSubscription] applied discountId=${discountId} discountPct=${discountPct} userId=${user.id}`);
  return { success: true };
}
