import { z } from 'zod';

// ── Sub-schemas ─────────────────────────────────────────────────────────────
//
// SC3: Discount-related fields (available_discounts, pro_retention_discount,
// activity_rank_up_discount, pending_variant_revert) have moved to the
// `user_discounts` table. trade_badge remains in feature_flags because it is
// a simple display-only marker with idempotent writes.

const TradeBadgeSchema = z.object({
  id: z.string(),
  totalTrades: z.number(),
  achievedAt: z.string(),
});

// ── Main feature flags schema ───────────────────────────────────────────────

export const FeatureFlagsSchema = z
  .object({
    trade_badge: TradeBadgeSchema.optional(),
  })
  .passthrough();

// ── Inferred types ──────────────────────────────────────────────────────────

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export type TradeBadge = z.infer<typeof TradeBadgeSchema>;

// ── Safe parse helper ───────────────────────────────────────────────────────

const EMPTY_FLAGS: FeatureFlags = {};

export function parseFeatureFlags(raw: unknown): FeatureFlags {
  if (raw == null || typeof raw !== 'object') return EMPTY_FLAGS;
  const result = FeatureFlagsSchema.safeParse(raw);
  if (result.success) return result.data;
  console.warn('[parseFeatureFlags] validation failed, returning defaults:', result.error.issues);
  return EMPTY_FLAGS;
}
