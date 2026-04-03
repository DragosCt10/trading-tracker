/**
 * SINGLE SOURCE OF TRUTH for all subscription tier definitions.
 *
 * Change limits, flags, or pricing here — behaviour updates everywhere.
 * To add a new tier: add an entry to TIER_DEFINITIONS and update TierId.
 */

import type { TierDefinition, TierId } from '@/types/subscription';

const isSandbox = process.env.POLAR_SANDBOX === 'true';

export const TIER_DEFINITIONS: Record<TierId, TierDefinition> = {
  starter: {
    id: 'starter',
    label: 'Starter',
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
      socialFeedTradeAttach: false,
      socialFeedEditPosts: false,
      socialFeedChannels: false,
    },
    badge: { label: 'Starter', colorClass: 'text-zinc-400 border-zinc-700' },
  },

  pro: {
    id: 'pro',
    label: 'PRO',
    pricing: {
      monthly: {
        usd: 9.99,
        polarProductId: isSandbox
          ? process.env.POLAR_SANDBOX_PRO_PRODUCT_ID_MONTHLY ?? ''
          : process.env.POLAR_PRO_PRODUCT_ID_MONTHLY ?? '',
      },
      annual: {
        usd: 99.99,
        polarProductId: isSandbox
          ? process.env.POLAR_SANDBOX_PRO_PRODUCT_ID_ANNUAL ?? ''
          : process.env.POLAR_PRO_PRODUCT_ID_ANNUAL ?? '',
        savingsPct: 20,
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
      socialFeedTradeAttach: true,
      socialFeedEditPosts: true,
      socialFeedChannels: true,
    },
    badge: { label: 'Elite', colorClass: 'text-purple-400 border-purple-500/50' },
  },
};

/** Ordered array for iteration (e.g. upgrade prompt comparison). */
export const TIER_ORDER: TierId[] = ['starter', 'pro', 'elite'];

/** Returns true if tierA is at least as high as tierB. */
export function tierAtLeast(tierA: TierId, tierB: TierId): boolean {
  return TIER_ORDER.indexOf(tierA) >= TIER_ORDER.indexOf(tierB);
}
