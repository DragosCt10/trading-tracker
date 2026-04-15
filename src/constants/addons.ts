/**
 * SINGLE SOURCE OF TRUTH for all add-on definitions.
 *
 * Add-ons are separate LS subscriptions that layer on top of a user's tier.
 * The current set:
 *   - starter_plus: $3.99/mo, monthly only, removes the 50 trades/month cap.
 */

import type { AddonDefinition, AddonId } from '@/types/addon';

export const ADDON_DEFINITIONS: Record<AddonId, AddonDefinition> = {
  starter_plus: {
    id: 'starter_plus',
    label: 'Starter Plus',
    description: 'Unlock unlimited trades on the Starter plan.',
    priceUsd: 3.99,
    productId: process.env.LEMONSQUEEZY_STARTER_PLUS_ADDON_VARIANT_ID ?? '',
  },
};

/**
 * Returns true if the given add-on has a configured LS variant ID.
 * Used by ER-1 (env-gated render) to hide CTAs when the add-on is not deployed.
 */
export function isAddonAvailable(id: AddonId): boolean {
  return ADDON_DEFINITIONS[id].productId.trim().length > 0;
}

/**
 * Reverse lookup: given an LS variant ID, return the matching AddonId (or null).
 * Used by the webhook parser to route incoming events to the addon branch
 * (ER-3 explicit precedence — check add-ons before tiers).
 */
export function resolveAddonByVariantId(variantId: string): AddonId | null {
  if (!variantId) return null;
  for (const addon of Object.values(ADDON_DEFINITIONS)) {
    if (addon.productId && addon.productId === variantId) {
      return addon.id;
    }
  }
  return null;
}
