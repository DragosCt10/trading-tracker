/**
 * SINGLE SOURCE OF TRUTH for all subscription tier definitions.
 *
 * Change limits, flags, or pricing here — behaviour updates everywhere.
 * To add a new tier: add an entry to TIER_DEFINITIONS and update TierId.
 */

import type { TierDefinition, TierId } from '@/types/subscription';

export const TIER_DEFINITIONS: Record<TierId, TierDefinition> = {
  starter: {
    id: 'starter',
    label: 'Upgrade to PRO',
    pricing: {
      monthly: null, // Free
      annual: null,  // Free
    },
    limits: {
      maxStrategies: 1,
      maxExtraCards: 3,
      maxAccounts: 1,
      allowedModes: ['demo'],
      maxPostsPerWeek: null,
      maxPostsPerDay: 50,
      maxPostContentLength: 280,
      maxMonthlyTrades: 50,
      maxMonthlyTradeLedgers: 0,
    },
    features: {
      dailyJournal: false,
      csvImport: true,
      futureEquityChart: false,
      publicSharing: false,
      prioritySupport: false,
      allCoreStatistics: false,
      allPsychologicalFactors: false,
      allConsistencyDrawdown: false,
      allPerformanceRatios: false,
      allTradePerformanceAnalysis: false,
      allExtraCards: false,
      alphaHub: false,
      tradeLedger: false,
      socialFeedTradeAttach: false,
      socialFeedEditPosts: false,
      socialFeedChannels: false,
    },
    badge: { label: 'Upgrade to PRO', colorClass: 'text-zinc-400 border-zinc-700' },
  },

  starter_plus: {
    id: 'starter_plus',
    label: 'Starter Plus',
    pricing: {
      monthly: {
        usd: 7.99,
        productId: process.env.LEMONSQUEEZY_STARTER_PLUS_VARIANT_ID_MONTHLY ?? '',
      },
      annual: {
        usd: 76.70,
        productId: process.env.LEMONSQUEEZY_STARTER_PLUS_VARIANT_ID_ANNUAL ?? '',
        savingsPct: 20,
      },
    },
    limits: {
      maxStrategies: 2,
      maxExtraCards: null,           // full suite of Extra Trade Performance Cards
      maxAccounts: 3,
      allowedModes: ['demo', 'live', 'backtesting'],
      maxPostsPerWeek: null,
      maxPostsPerDay: 50,
      maxPostContentLength: 280,
      maxMonthlyTrades: 250,
      maxMonthlyTradeLedgers: 5,
    },
    features: {
      dailyJournal: false,
      csvImport: true,
      futureEquityChart: false,
      publicSharing: false,
      prioritySupport: false,
      allCoreStatistics: false,
      allPsychologicalFactors: false,
      allConsistencyDrawdown: false,
      allPerformanceRatios: false,
      allTradePerformanceAnalysis: false,
      allExtraCards: true,
      alphaHub: false,
      tradeLedger: true,
      socialFeedTradeAttach: false,
      socialFeedEditPosts: false,
      socialFeedChannels: false,
    },
    badge: { label: 'Starter Plus', colorClass: 'text-zinc-400 border-zinc-700' },
  },

  pro: {
    id: 'pro',
    label: 'PRO',
    pricing: {
      monthly: {
        usd: 11.99,
        productId: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_MONTHLY ?? '',
      },
      annual: {
        usd: 114.99,
        productId: process.env.LEMONSQUEEZY_PRO_VARIANT_ID_ANNUAL ?? '',
        savingsPct: 20,
      },
      promo: {
        monthly: {
          usd: 9.99,
          productId: process.env.LEMONSQUEEZY_PRO_PROMO_VARIANT_ID_MONTHLY ?? '',
        },
        annual: {
          usd: 95.90,
          productId: process.env.LEMONSQUEEZY_PRO_PROMO_VARIANT_ID_ANNUAL ?? '',
          savingsPct: 20,
        },
      },
    },
    limits: {
      maxStrategies: null,  // unlimited
      maxExtraCards: null,  // all
      maxAccounts: null,    // unlimited
      allowedModes: ['demo', 'live', 'backtesting'],
      maxPostsPerWeek: null,
      maxPostsPerDay: 50,
      maxPostContentLength: 500,
      maxMonthlyTrades: null,
      maxMonthlyTradeLedgers: null,
    },
    features: {
      dailyJournal: true,
      csvImport: true,
      futureEquityChart: true,
      publicSharing: true,
      prioritySupport: true,
      allCoreStatistics: true,
      allPsychologicalFactors: true,
      allConsistencyDrawdown: true,
      allPerformanceRatios: true,
      allTradePerformanceAnalysis: true,
      allExtraCards: true,
      alphaHub: false,
      tradeLedger: true,
      socialFeedTradeAttach: true,
      socialFeedEditPosts: true,
      socialFeedChannels: true,
    },
    badge: { label: 'PRO', colorClass: 'text-amber-400 border-amber-500/50' },
  },

  elite: {
    id: 'elite',
    label: 'Elite',
    pricing: {
      monthly: null, // TBD — not launched yet
      annual: null,
    },
    limits: {
      maxStrategies: null,
      maxExtraCards: null,
      maxAccounts: null,    // unlimited
      allowedModes: ['demo', 'live', 'backtesting'],
      maxPostsPerWeek: null,
      maxPostsPerDay: 50,
      maxPostContentLength: 500,
      maxMonthlyTrades: null,
      maxMonthlyTradeLedgers: null,
    },
    features: {
      dailyJournal: true,
      csvImport: true,
      futureEquityChart: true,
      publicSharing: true,
      prioritySupport: true,
      allCoreStatistics: true,
      allPsychologicalFactors: true,
      allConsistencyDrawdown: true,
      allPerformanceRatios: true,
      allTradePerformanceAnalysis: true,
      allExtraCards: true,
      alphaHub: true,
      tradeLedger: true,
      socialFeedTradeAttach: true,
      socialFeedEditPosts: true,
      socialFeedChannels: true,
    },
    badge: { label: 'Elite', colorClass: 'text-purple-400 border-purple-500/50' },
  },
};

/** Ordered array for iteration (e.g. upgrade prompt comparison). */
export const TIER_ORDER: TierId[] = ['starter', 'starter_plus', 'pro', 'elite'];

/** Returns true if tierA is at least as high as tierB. */
export function tierAtLeast(tierA: TierId, tierB: TierId): boolean {
  return TIER_ORDER.indexOf(tierA) >= TIER_ORDER.indexOf(tierB);
}
