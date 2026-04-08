import { z } from 'zod';

// ── Sub-schemas ─────────────────────────────────────────────────────────────

const DiscountEntrySchema = z.object({
  milestoneId: z.string(),
  discountPct: z.number(),
  used: z.boolean(),
  couponCode: z.string().optional(),
  generatedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  achievedAt: z.string().optional(),
});

const CouponDiscountSchema = z.object({
  used: z.boolean(),
  couponCode: z.string().optional(),
  generatedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

const TradeBadgeSchema = z.object({
  id: z.string(),
  totalTrades: z.number(),
  achievedAt: z.string(),
});

const PendingVariantRevertSchema = z.object({
  subscriptionId: z.string(),
  normalVariantId: z.string(),
  discountedVariantId: z.string(),
  discountPct: z.number(),
  discountId: z.string(),
  appliedAt: z.string(),
  revertAttempts: z.number().optional(),
});

// ── Main feature flags schema ───────────────────────────────────────────────

export const FeatureFlagsSchema = z
  .object({
    available_discounts: z.array(DiscountEntrySchema).optional(),
    pro_retention_discount: CouponDiscountSchema.optional(),
    activity_rank_up_discount: CouponDiscountSchema.optional(),
    trade_badge: TradeBadgeSchema.optional(),
    pending_variant_revert: PendingVariantRevertSchema.nullable().optional(),
  })
  .passthrough();

// ── Inferred types ──────────────────────────────────────────────────────────

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export type DiscountEntry = z.infer<typeof DiscountEntrySchema>;
export type CouponDiscount = z.infer<typeof CouponDiscountSchema>;
export type TradeBadge = z.infer<typeof TradeBadgeSchema>;
export type PendingVariantRevert = z.infer<typeof PendingVariantRevertSchema>;

// ── Safe parse helper ───────────────────────────────────────────────────────

const EMPTY_FLAGS: FeatureFlags = {};

export function parseFeatureFlags(raw: unknown): FeatureFlags {
  if (raw == null || typeof raw !== 'object') return EMPTY_FLAGS;
  const result = FeatureFlagsSchema.safeParse(raw);
  if (result.success) return result.data;
  console.warn('[parseFeatureFlags] validation failed, returning defaults:', result.error.issues);
  return EMPTY_FLAGS;
}
