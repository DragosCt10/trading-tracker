/**
 * Shared tailwind class string for the pill-surface look used by the sort bar
 * and skeleton cards on the Stats Boards list page. Intentionally local to
 * the stats route — StrategyCard's own surface uses a different shadow scale.
 */
export const STRATEGY_CARD_SURFACE =
  'relative overflow-hidden border backdrop-blur-sm border-slate-300/40 bg-slate-50/50 dark:border-slate-700/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none';

export const STATS_DEFAULT_DESCRIPTION =
  'Track your Stats Boards, each with its own metrics, and monitor your overall performance.';
