/**
 * Shared tailwind class string for the pill-surface look used by the sort bar
 * and skeleton cards on the Stats Boards list page. Intentionally local to
 * the stats route — StrategyCard's own surface uses a different shadow scale.
 */
export const STRATEGY_CARD_SURFACE =
  'relative overflow-hidden border shadow-none backdrop-blur-sm border-slate-300/40 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-800/30';

export const STATS_DEFAULT_DESCRIPTION =
  'Track your Stats Boards, each with its own metrics, and monitor your overall performance.';
