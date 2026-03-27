/**
 * SINGLE SOURCE OF TRUTH for trade milestone definitions.
 *
 * Each milestone is earned at a trade count threshold (across all modes).
 * Badges display on Feed posts; each milestone unlocks a one-time PRO discount.
 */

export type TradeMilestoneId =
  | 'rookie_trader'
  | 'skilled_trader'
  | 'expert_trader'
  | 'master_trader'
  | 'alpha_trader';

export interface TradeMilestone {
  id: TradeMilestoneId;
  minTrades: number;
  maxTrades: number | null; // null = no upper bound (alpha_trader)
  badgeName: string;
  discountPct: number;
  notificationType: string; // matches DB enum value
  colors: {
    bg: string;       // Tailwind bg class
    border: string;   // Tailwind border class
    text: string;     // Tailwind text class
    darkBg: string;
    darkBorder: string;
    darkText: string;
    gradient?: string; // optional gradient for alpha_trader
  };
}

export const TRADE_MILESTONES: TradeMilestone[] = [
  {
    id: 'rookie_trader',
    minTrades: 100,
    maxTrades: 199,
    badgeName: 'Rookie Trader',
    discountPct: 5,
    notificationType: 'trade_milestone_100',
    colors: {
      bg: 'bg-amber-700/15',
      border: 'border-amber-700/30',
      text: 'text-amber-800',
      darkBg: 'dark:bg-amber-600/15',
      darkBorder: 'dark:border-amber-600/30',
      darkText: 'dark:text-amber-400',
    },
  },
  {
    id: 'skilled_trader',
    minTrades: 200,
    maxTrades: 499,
    badgeName: 'Skilled Trader',
    discountPct: 10,
    notificationType: 'trade_milestone_200',
    colors: {
      bg: 'bg-slate-400/15',
      border: 'border-slate-400/30',
      text: 'text-slate-600',
      darkBg: 'dark:bg-slate-400/15',
      darkBorder: 'dark:border-slate-400/30',
      darkText: 'dark:text-slate-300',
    },
  },
  {
    id: 'expert_trader',
    minTrades: 500,
    maxTrades: 749,
    badgeName: 'Expert Trader',
    discountPct: 15,
    notificationType: 'trade_milestone_500',
    colors: {
      bg: 'bg-yellow-500/15',
      border: 'border-yellow-500/30',
      text: 'text-yellow-700',
      darkBg: 'dark:bg-yellow-500/15',
      darkBorder: 'dark:border-yellow-500/30',
      darkText: 'dark:text-yellow-400',
    },
  },
  {
    id: 'master_trader',
    minTrades: 750,
    maxTrades: 999,
    badgeName: 'Master Trader',
    discountPct: 15,
    notificationType: 'trade_milestone_750',
    colors: {
      bg: 'bg-violet-500/15',
      border: 'border-violet-500/30',
      text: 'text-violet-700',
      darkBg: 'dark:bg-violet-500/15',
      darkBorder: 'dark:border-violet-500/30',
      darkText: 'dark:text-violet-400',
    },
  },
  {
    id: 'alpha_trader',
    minTrades: 1000,
    maxTrades: null,
    badgeName: 'Alpha Trader',
    discountPct: 20,
    notificationType: 'trade_milestone_1000',
    colors: {
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30',
      text: 'text-emerald-700',
      darkBg: 'dark:bg-emerald-500/15',
      darkBorder: 'dark:border-emerald-500/30',
      darkText: 'dark:text-emerald-400',
      gradient: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400',
    },
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
 * Maps: rookie→steel-gray, skilled→ice-blue, expert→copper, master→royal-purple, alpha→gold.
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
