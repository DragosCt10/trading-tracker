/**
 * SINGLE SOURCE OF TRUTH for trade milestone definitions.
 *
 * Each milestone is earned at a trade count threshold (across all modes).
 * Badges display on Feed posts; each milestone unlocks a one-time PRO discount.
 */

export type TradeMilestoneId =
  | 'test_trader'
  | 'rookie_trader'
  | 'skilled_trader'
  | 'expert_trader'
  | 'master_trader'
  | 'elite_trader'
  | 'alpha_trader';

export interface TradeMilestone {
  id: TradeMilestoneId;
  minTrades: number;
  maxTrades: number | null; // null = no upper bound (alpha_trader)
  badgeName: string;
  discountPct: number;
  notificationType: string; // matches DB enum value
}

const TEST_MILESTONE: TradeMilestone[] =
  process.env.NODE_ENV === 'development'
    ? [
        {
          id: 'test_trader',
          minTrades: 1,
          maxTrades: 99,
          badgeName: 'Test Trader',
          discountPct: 5,
          notificationType: 'trade_milestone_1',
        },
      ]
    : [];

export const TRADE_MILESTONES: TradeMilestone[] = [
  ...TEST_MILESTONE,
  {
    id: 'rookie_trader',
    minTrades: 100,
    maxTrades: 199,
    badgeName: 'Rookie Trader',
    discountPct: 5,
    notificationType: 'trade_milestone_100',
  },
  {
    id: 'skilled_trader',
    minTrades: 200,
    maxTrades: 499,
    badgeName: 'Skilled Trader',
    discountPct: 10,
    notificationType: 'trade_milestone_200',
  },
  {
    id: 'expert_trader',
    minTrades: 500,
    maxTrades: 749,
    badgeName: 'Expert Trader',
    discountPct: 15,
    notificationType: 'trade_milestone_500',
  },
  {
    id: 'master_trader',
    minTrades: 750,
    maxTrades: 999,
    badgeName: 'Master Trader',
    discountPct: 20,
    notificationType: 'trade_milestone_750',
  },
  {
    id: 'elite_trader',
    minTrades: 1000,
    maxTrades: 4999,
    badgeName: 'Elite Trader',
    discountPct: 25,
    notificationType: 'trade_milestone_1000',
  },
  {
    id: 'alpha_trader',
    minTrades: 5000,
    maxTrades: null,
    badgeName: 'Alpha Trader',
    discountPct: 50,
    notificationType: 'trade_milestone_5000',
  },
];

/** Returns the highest milestone achieved for a given trade count, or null. */
export function getMilestoneForCount(count: number): TradeMilestone | null {
  // Iterate from highest to lowest to find the best match
  for (let i = TRADE_MILESTONES.length - 1; i >= 0; i--) {
    if (count >= TRADE_MILESTONES[i].minTrades) return TRADE_MILESTONES[i];
  }
  return null;
}

/** Returns the next milestone to reach, or null if user has alpha_trader. */
export function getNextMilestone(count: number): TradeMilestone | null {
  for (const m of TRADE_MILESTONES) {
    if (count < m.minTrades) return m;
  }
  return null;
}

/** Returns all milestones that have been crossed for a given trade count. */
export function getCrossedMilestones(count: number): TradeMilestone[] {
  return TRADE_MILESTONES.filter((m) => count >= m.minTrades);
}

/** Lookup a milestone by its ID. */
export function getMilestoneById(id: string): TradeMilestone | undefined {
  return TRADE_MILESTONES.find((m) => m.id === id);
}

/**
 * Returns inline CSS style for a badge using per-tier CSS variables defined in globals.css.
 * Maps: rookie→copper, skilled→ice-blue, expert→emerald, master→royal-purple, elite→burgundy, alpha→gold.
 */
export function getBadgeInlineStyle(milestoneId: string): { background: string; borderColor: string; color: string } {
  // id format: 'rookie_trader' → key 'rookie'; 'alpha_trader' → key 'alpha'
  const key = milestoneId.split('_')[0];
  return {
    background: `var(--badge-${key}-bg)`,
    borderColor: `var(--badge-${key}-border)`,
    color: `var(--badge-${key}-text)`,
  };
}
