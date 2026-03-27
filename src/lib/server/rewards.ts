'use server';

import { getCachedUserSession } from './session';
import { getFeatureFlags, updateFeatureFlags } from './settings';
import { getPaymentProvider } from '@/lib/billing';
import { getMilestoneById, type TradeMilestoneId } from '@/constants/tradeMilestones';
import { resolveSubscription } from './subscription';

function monthsSince(isoDate: string): number {
  const start = new Date(isoDate);
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

type RedeemResult =
  | { couponCode: string }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'ALREADY_USED' | 'NOT_EARNED' | 'PROVIDER_ERROR' };

/**
 * Server action: redeem a trade milestone discount.
 * Creates a Polar coupon code the user can apply at checkout themselves.
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
    ? (flags.available_discounts as { milestoneId: string; discountPct: number; used: boolean; couponCode?: string }[])
    : [];

  const entry = discounts.find((d) => d.milestoneId === milestoneId);
  if (!entry) return { error: 'Milestone not yet earned', code: 'NOT_EARNED' };
  if (entry.used) return { error: 'Discount already used', code: 'ALREADY_USED' };

  // Idempotent: if code was already generated return it without hitting Polar again
  if (entry.couponCode) return { couponCode: entry.couponCode };

  // Generate a unique, human-readable coupon code: e.g. ROOKIE-A1B2C3D4
  const prefix = milestone.id.split('_')[0].toUpperCase(); // ROOKIE / SKILLED / EXPERT / MASTER / ALPHA
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  const generatedCode = `${prefix}${suffix}`; // no hyphens — Polar requires alphanumeric only

  try {
    const provider = getPaymentProvider();
    const { code } = await provider.createDiscountCode({
      discountPct: milestone.discountPct,
      discountLabel: `${milestone.badgeName} reward — ${milestone.discountPct}% off PRO`,
      code: generatedCode,
    });

    // Persist the code so re-clicks return the same code
    const updatedDiscounts = discounts.map((d) =>
      d.milestoneId === milestoneId ? { ...d, couponCode: code, generatedAt: new Date().toISOString() } : d,
    );
    await updateFeatureFlags(user.id, { ...flags, available_discounts: updatedDiscounts });

    return { couponCode: code };
  } catch (err) {
    console.error('[redeemMilestoneDiscount] provider error:', err);
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
  const existing = flags.pro_retention_discount as { used: boolean; couponCode?: string } | undefined;
  if (existing?.used) return { error: 'Discount already used', code: 'ALREADY_USED' };
  if (existing?.couponCode) return { couponCode: existing.couponCode };

  const suffix = Math.random().toString(36).slice(2, 9).toUpperCase();
  const generatedCode = `PROLOYALTY${suffix}`;

  try {
    const provider = getPaymentProvider();
    const { code } = await provider.createDiscountCode({
      discountPct: 10,
      discountLabel: 'PRO Loyalty Reward — 10% off',
      code: generatedCode,
    });

    await updateFeatureFlags(user.id, {
      ...flags,
      pro_retention_discount: { used: false, couponCode: code, generatedAt: new Date().toISOString() },
    });

    return { couponCode: code };
  } catch (err) {
    console.error('[redeemProRetentionDiscount] provider error:', err);
    return { error: 'Failed to generate discount code', code: 'PROVIDER_ERROR' };
  }
}
