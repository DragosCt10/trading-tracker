import type { AccountMode } from '@/lib/server/accounts';

export type TierId = 'starter' | 'pro' | 'elite';
export type BillingPeriod = 'monthly' | 'annual';

export interface TierLimits {
  /** null = unlimited */
  maxStrategies: number | null;
  /** null = all */
  maxExtraCards: number | null;
  /** null = unlimited */
  maxAccounts: number | null;
  /** Which account modes this tier can access */
  allowedModes: AccountMode[];
}

export interface TierFeatureFlags {
  dailyJournal: boolean;
  /** Available to both Starter and PRO */
  csvImport: boolean;
  /** PRO only */
  futureEquityChart: boolean;
  publicSharing: boolean;
  prioritySupport: boolean;
  // ── Analytics category gates ──
  // false = limited set of cards; true = all cards shown
  allCoreStatistics: boolean;
  allPsychologicalFactors: boolean;
  allConsistencyDrawdown: boolean;
  allPerformanceRatios: boolean;
  allTradePerformanceAnalysis: boolean;
  allExtraCards: boolean;
  /** Elite tier only */
  alphaHub: boolean;
}

export interface TierPricingOption {
  usd: number;
  polarPriceId: string;
}

export interface TierDefinition {
  id: TierId;
  label: string;
  pricing: {
    monthly: TierPricingOption | null;
    annual: (TierPricingOption & { savingsPct: number }) | null;
  };
  polarProductId: string | null;
  limits: TierLimits;
  features: TierFeatureFlags;
  badge: { label: string; colorClass: string };
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: TierId;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'admin_granted' | 'refunded';
  billing_period: BillingPeriod | null;
  provider: 'polar' | 'stripe' | 'paddle' | 'admin';
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResolvedSubscription {
  tier: TierId;
  definition: TierDefinition;
  status: string;
  isActive: boolean;
  billingPeriod: BillingPeriod | null;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  providerCustomerId: string | null;
  provider: string;
}
