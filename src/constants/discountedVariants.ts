/**
 * Discounted variant IDs for PRO subscription tier switches.
 *
 * Create these variants in the Lemon Squeezy dashboard by duplicating the
 * normal PRO monthly/annual variants and setting the discounted price.
 * Then add the resulting variant IDs to .env.local.
 *
 * Prices (from $11.99 / $114.99):
 *   5%  off → $11.39 / $109.24
 *  10%  off → $10.79 / $103.49
 *  15%  off → $10.19 / $97.74
 *  20%  off → $9.59  / $91.99
 *  25%  off → $8.99  / $86.24
 *  50%  off → $6.00  / $57.50
 */

import { TIER_DEFINITIONS } from './tiers';

type DiscountPct = 5 | 10 | 15 | 20 | 25 | 50;

export const DISCOUNTED_VARIANT_IDS: Record<'pro', Record<'monthly' | 'annual', Record<DiscountPct, string>>> = {
  pro: {
    monthly: {
      5:  process.env.LEMONSQUEEZY_PRO_VARIANT_ID_MONTHLY_DISC_5  ?? '',
      10: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_MONTHLY_DISC_10 ?? '',
      15: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_MONTHLY_DISC_15 ?? '',
      20: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_MONTHLY_DISC_20 ?? '',
      25: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_MONTHLY_DISC_25 ?? '',
      50: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_MONTHLY_DISC_50 ?? '',
    },
    annual: {
      5:  process.env.LEMONSQUEEZY_PRO_VARIANT_ID_ANNUAL_DISC_5  ?? '',
      10: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_ANNUAL_DISC_10 ?? '',
      15: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_ANNUAL_DISC_15 ?? '',
      20: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_ANNUAL_DISC_20 ?? '',
      25: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_ANNUAL_DISC_25 ?? '',
      50: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_ANNUAL_DISC_50 ?? '',
    },
  },
};

/**
 * Returns the discounted variant ID for a given tier, billing period, and discount %.
 * Returns null if the variant isn't configured yet in env vars.
 */
export function getDiscountedVariantId(
  tier: string,
  period: 'monthly' | 'annual',
  discountPct: number,
): string | null {
  const tierVariants = DISCOUNTED_VARIANT_IDS[tier as keyof typeof DISCOUNTED_VARIANT_IDS];
  if (!tierVariants) return null;
  const periodVariants = tierVariants[period];
  if (!periodVariants) return null;
  const id = periodVariants[discountPct as DiscountPct];
  return id || null;
}

/** Reverse map: discounted variant ID → normal variant ID. Built once at startup. */
function buildReverseVariantMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [tier, periods] of Object.entries(DISCOUNTED_VARIANT_IDS)) {
    const tierDef = TIER_DEFINITIONS[tier as keyof typeof TIER_DEFINITIONS];
    if (!tierDef) continue;
    for (const [period, discounts] of Object.entries(periods)) {
      const normalVariantId = tierDef.pricing[period as 'monthly' | 'annual']?.productId;
      if (!normalVariantId) continue;
      for (const discountedVariantId of Object.values(discounts as Record<string, string>)) {
        if (discountedVariantId) map.set(discountedVariantId, normalVariantId);
      }
    }
  }
  return map;
}

export const DISCOUNTED_TO_NORMAL_VARIANT_MAP: Map<string, string> = buildReverseVariantMap();

/**
 * Returns the normal variant ID for a discounted variant ID.
 * Returns null if the provided ID is not a known discounted variant.
 */
export function getNormalVariantId(discountedVariantId: string): string | null {
  return DISCOUNTED_TO_NORMAL_VARIANT_MAP.get(discountedVariantId) ?? null;
}
