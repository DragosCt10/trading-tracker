/**
 * Normalized discount records (SC3).
 *
 * Replaces the `available_discounts`, `pro_retention_discount`, `activity_rank_up_discount`,
 * and `pending_variant_revert` fields previously stored in `user_settings.feature_flags` JSONB.
 *
 * - `milestoneId` is '__none__' for activity/retention discounts (sentinel value because
 *   PostgreSQL treats NULLs as distinct in unique constraints).
 * - Revert fields (`revertSubscriptionId`, etc.) are non-null only while a discount is
 *   applied to a subscription. The webhook handler clears them after reverting.
 */

export type DiscountType = 'milestone' | 'activity' | 'retention';

export const NO_MILESTONE = '__none__' as const;

export interface UserDiscount {
  id: string;
  userId: string;
  discountType: DiscountType;
  milestoneId: string; // '__none__' for activity/retention
  discountPct: number;
  used: boolean;
  couponCode: string | null;
  generatedAt: string | null;
  expiresAt: string | null;
  achievedAt: string | null;
  revertSubscriptionId: string | null;
  revertNormalVariantId: string | null;
  revertDiscountedVariantId: string | null;
  revertAppliedAt: string | null;
  revertAttempts: number;
}

/** Raw row shape as returned by Supabase (snake_case). Internal to discounts.ts. */
export interface UserDiscountRow {
  id: string;
  user_id: string;
  discount_type: DiscountType;
  milestone_id: string;
  discount_pct: number;
  used: boolean;
  coupon_code: string | null;
  generated_at: string | null;
  expires_at: string | null;
  achieved_at: string | null;
  revert_subscription_id: string | null;
  revert_normal_variant_id: string | null;
  revert_discounted_variant_id: string | null;
  revert_applied_at: string | null;
  revert_attempts: number;
}

export function mapUserDiscountRow(row: UserDiscountRow): UserDiscount {
  return {
    id: row.id,
    userId: row.user_id,
    discountType: row.discount_type,
    milestoneId: row.milestone_id,
    discountPct: row.discount_pct,
    used: row.used,
    couponCode: row.coupon_code,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
    achievedAt: row.achieved_at,
    revertSubscriptionId: row.revert_subscription_id,
    revertNormalVariantId: row.revert_normal_variant_id,
    revertDiscountedVariantId: row.revert_discounted_variant_id,
    revertAppliedAt: row.revert_applied_at,
    revertAttempts: row.revert_attempts,
  };
}

/** Helper to determine if a discount is currently claimable. */
export function isDiscountClaimable(discount: UserDiscount | null): boolean {
  if (!discount) return false;
  if (discount.used) return false;
  if (discount.couponCode) {
    // Already claimed — check expiry
    if (discount.expiresAt && new Date(discount.expiresAt) <= new Date()) return false;
  }
  return true;
}

/** Helper to determine if a claimed discount is still applicable to a subscription. */
export function isDiscountApplicable(discount: UserDiscount | null): boolean {
  if (!discount) return false;
  if (discount.used) return false;
  if (!discount.couponCode) return false; // Must be claimed first
  if (discount.expiresAt && new Date(discount.expiresAt) <= new Date()) return false;
  if (discount.revertSubscriptionId) return false; // Already applied
  return true;
}
