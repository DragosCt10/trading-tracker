import type { AccountMode } from '@/lib/server/accounts';

export type TierId = 'starter' | 'starter_plus' | 'pro' | 'elite';
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
  /** null = unlimited. 50 for starter. */
  maxMonthlyTrades: number | null;
  /**
   * Trade Ledger PDF generations permitted per calendar month.
   * null = unlimited (pro / elite). 5 for starter_plus. 0 for starter
   * (starter is already blocked by `features.tradeLedger` — kept as 0 for
   * clarity so the gate works even if that flag is ever flipped).
   */
  maxMonthlyTradeLedgers: number | null;
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
  /** Trade Ledger — banking-style PDF reports. Starter Plus and above. */
  tradeLedger: boolean;
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
  productId: string;
}

export interface TierDefinition {
  id: TierId;
  label: string;
  pricing: {
    monthly: TierPricingOption | null;
    annual: (TierPricingOption & { savingsPct: number }) | null;
    /**
     * Launch-offer variants — served to the first N paying subscribers while
     * slots remain. Checkout routes here when the server-side slot check
     * confirms availability; otherwise falls back to the regular variants.
     */
    earlyBird?: {
      monthly: TierPricingOption;
      annual: TierPricingOption & { savingsPct: number };
    };
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
  provider: 'polar' | 'stripe' | 'paddle' | 'lemonsqueezy' | 'admin';
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
  /** ISO timestamp of when the subscription row was first created. Null for starter/fallback. */
  createdAt: string | null;
  /** ISO timestamp of the most recent update (upgrades, renewals, status changes). Null for starter/fallback. */
  updatedAt: string | null;
}
