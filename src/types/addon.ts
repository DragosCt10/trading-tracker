/**
 * Types for the add-on system (Starter Plus etc.).
 *
 * Add-ons layer on top of the existing tier system without touching
 * `TIER_DEFINITIONS`. They live in their own table (`user_addons`) and are
 * resolved independently from the subscription tier.
 */

export type AddonId = 'starter_plus';

export type AddonStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'admin_granted';

export interface AddonDefinition {
  id: AddonId;
  label: string;
  description: string;
  priceUsd: number;
  /** Lemon Squeezy variant ID (monthly recurring). Empty string if not configured. */
  productId: string;
}

export interface UserAddonRow {
  id: string;
  user_id: string;
  addon_type: AddonId;
  status: AddonStatus;
  provider: 'lemonsqueezy' | 'admin';
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  price_amount: number | null;
  tax_amount: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolvedAddon {
  id: AddonId;
  isActive: boolean;
  status: AddonStatus;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  providerSubscriptionId: string | null;
  provider: 'lemonsqueezy' | 'admin';
  priceAmount: number | null;
  currency: string | null;
}
