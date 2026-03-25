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
  /** null = check daily cap instead. 3 for starter. */
  maxPostsPerWeek: number | null;
  /** null = no cap. 50 for pro (spam prevention). */
  maxPostsPerDay: number | null;
  /** 280 for starter, 1000 for pro. */
  maxPostContentLength: number;
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
  // ── Social Feed ──
  /** Can attach trades to posts (PRO only) */
  socialFeedTradeAttach: boolean;
  /** Can edit posts after creation (PRO only) */
  socialFeedEditPosts: boolean;
  /** Can create private channels (PRO only) */
  socialFeedChannels: boolean;
}

export interface TierPricingOption {
  usd: number;
  polarProductId: string;
}

export interface TierDefinition {
  id: TierId;
  label: string;
  pricing: {
    monthly: TierPricingOption | null;
    annual: (TierPricingOption & { savingsPct: number }) | null;
  };
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
  price_amount: number | null;
  tax_amount: number | null;
  currency: string | null;
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
  /** Total charged in cents, tax inclusive. Null for admin-granted or before first payment. */
  priceAmount: number | null;
  /** Tax portion in cents. */
  taxAmount: number | null;
  /** ISO currency code, lowercase (e.g. 'usd'). */
  currency: string | null;
}
