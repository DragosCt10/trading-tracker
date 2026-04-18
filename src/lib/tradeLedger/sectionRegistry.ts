import type { MacroStats, Stats } from '@/types/dashboard';

export type SectionCategoryId =
  | 'coreStatistics'
  | 'consistencyDrawdown'
  | 'performanceRatios'
  | 'tradePerformance';

export interface StatExtractInput {
  stats: Stats;
  macroStats: MacroStats;
  currency: string;
}

export interface StatExtractOutput {
  /** Raw numeric value (for hashing, sorting). */
  value: number;
  /** Human-readable formatted value (currency, %, plain). */
  formatted: string;
}

export interface StatDefinition {
  id: string;
  label: string;
  category: SectionCategoryId;
  help?: string;
  extract: (input: StatExtractInput) => StatExtractOutput;
}

// ── formatting helpers ─────────────────────────────────────────────

function fmtCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function fmtNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function fmtInteger(value: number): string {
  return new Intl.NumberFormat().format(Math.round(value));
}

// ── registry ───────────────────────────────────────────────────────

export const SECTION_REGISTRY: readonly StatDefinition[] = [
  // ── Core Statistics ──
  {
    id: 'total_profit',
    label: 'Net P&L',
    category: 'coreStatistics',
    extract: ({ stats, currency }) => ({
      value: stats.totalProfit,
      formatted: fmtCurrency(stats.totalProfit, currency),
    }),
  },
  {
    id: 'net_pnl_pct',
    label: 'Net P&L %',
    category: 'coreStatistics',
    extract: ({ stats }) => ({
      value: stats.averagePnLPercentage,
      formatted: fmtPercent(stats.averagePnLPercentage),
    }),
  },
  {
    id: 'win_rate',
    label: 'Win rate',
    category: 'coreStatistics',
    extract: ({ stats }) => ({
      value: stats.winRate,
      formatted: fmtPercent(stats.winRate),
    }),
  },
  {
    id: 'win_rate_with_be',
    label: 'Win rate (incl. BE)',
    category: 'coreStatistics',
    extract: ({ stats }) => ({
      value: stats.winRateWithBE,
      formatted: fmtPercent(stats.winRateWithBE),
    }),
  },
  {
    id: 'total_trades',
    label: 'Total trades',
    category: 'coreStatistics',
    extract: ({ stats }) => ({
      value: stats.totalTrades,
      formatted: fmtInteger(stats.totalTrades),
    }),
  },
  {
    id: 'total_wins',
    label: 'Winning trades',
    category: 'coreStatistics',
    extract: ({ stats }) => ({
      value: stats.totalWins,
      formatted: fmtInteger(stats.totalWins),
    }),
  },
  {
    id: 'total_losses',
    label: 'Losing trades',
    category: 'coreStatistics',
    extract: ({ stats }) => ({
      value: stats.totalLosses,
      formatted: fmtInteger(stats.totalLosses),
    }),
  },
  {
    id: 'avg_profit',
    label: 'Average profit per trade',
    category: 'coreStatistics',
    extract: ({ stats, currency }) => ({
      value: stats.averageProfit,
      formatted: fmtCurrency(stats.averageProfit, currency),
    }),
  },
  {
    id: 'r_multiple',
    label: 'R-multiple',
    category: 'coreStatistics',
    extract: ({ stats }) => ({
      value: stats.multipleR,
      formatted: `${fmtNumber(stats.multipleR)}R`,
    }),
  },
  {
    id: 'trade_quality_index',
    label: 'Trade quality index',
    category: 'coreStatistics',
    extract: ({ stats }) => ({
      value: stats.tradeQualityIndex,
      formatted: fmtNumber(stats.tradeQualityIndex),
    }),
  },

  // ── Consistency & Drawdown ──
  {
    id: 'max_drawdown',
    label: 'Max drawdown',
    category: 'consistencyDrawdown',
    extract: ({ stats, currency }) => ({
      value: stats.maxDrawdown,
      formatted: fmtCurrency(stats.maxDrawdown, currency),
    }),
  },
  {
    id: 'avg_drawdown',
    label: 'Average drawdown',
    category: 'consistencyDrawdown',
    extract: ({ stats, currency }) => ({
      value: stats.averageDrawdown,
      formatted: fmtCurrency(stats.averageDrawdown, currency),
    }),
  },
  {
    id: 'drawdown_count',
    label: 'Drawdown count',
    category: 'consistencyDrawdown',
    extract: ({ stats }) => ({
      value: stats.drawdownCount,
      formatted: fmtInteger(stats.drawdownCount),
    }),
  },
  {
    id: 'max_winning_streak',
    label: 'Max winning streak',
    category: 'consistencyDrawdown',
    extract: ({ stats }) => ({
      value: stats.maxWinningStreak,
      formatted: fmtInteger(stats.maxWinningStreak),
    }),
  },
  {
    id: 'max_losing_streak',
    label: 'Max losing streak',
    category: 'consistencyDrawdown',
    extract: ({ stats }) => ({
      value: stats.maxLosingStreak,
      formatted: fmtInteger(stats.maxLosingStreak),
    }),
  },
  {
    id: 'consistency_score',
    label: 'Consistency score',
    category: 'consistencyDrawdown',
    extract: ({ macroStats }) => ({
      value: macroStats.consistencyScore,
      formatted: fmtPercent(macroStats.consistencyScore),
    }),
  },
  {
    id: 'consistency_score_with_be',
    label: 'Consistency score (incl. BE)',
    category: 'consistencyDrawdown',
    extract: ({ macroStats }) => ({
      value: macroStats.consistencyScoreWithBE,
      formatted: fmtPercent(macroStats.consistencyScoreWithBE),
    }),
  },

  // ── Performance Ratios ──
  {
    id: 'profit_factor',
    label: 'Profit factor',
    category: 'performanceRatios',
    extract: ({ macroStats }) => ({
      value: macroStats.profitFactor,
      formatted: fmtNumber(macroStats.profitFactor),
    }),
  },
  {
    id: 'sharpe_ratio',
    label: 'Sharpe ratio (incl. BE)',
    category: 'performanceRatios',
    extract: ({ macroStats }) => ({
      value: macroStats.sharpeWithBE,
      formatted: fmtNumber(macroStats.sharpeWithBE),
    }),
  },
  {
    id: 'r_multiple_macro',
    label: 'R-multiple total',
    category: 'performanceRatios',
    extract: ({ macroStats }) => ({
      value: macroStats.multipleR,
      formatted: `${fmtNumber(macroStats.multipleR)}R`,
    }),
  },
  {
    id: 'trade_quality_index_macro',
    label: 'Trade quality index (macro)',
    category: 'performanceRatios',
    extract: ({ macroStats }) => ({
      value: macroStats.tradeQualityIndex,
      formatted: fmtNumber(macroStats.tradeQualityIndex),
    }),
  },

  // ── Trade Performance Analysis ──
  {
    id: 'be_wins',
    label: 'Break-even wins',
    category: 'tradePerformance',
    extract: ({ stats }) => ({
      value: stats.beWins,
      formatted: fmtInteger(stats.beWins),
    }),
  },
  {
    id: 'be_losses',
    label: 'Break-even losses',
    category: 'tradePerformance',
    extract: ({ stats }) => ({
      value: stats.beLosses,
      formatted: fmtInteger(stats.beLosses),
    }),
  },
  {
    id: 'partial_winning_trades',
    label: 'Partial winning trades',
    category: 'tradePerformance',
    extract: ({ stats }) => ({
      value: stats.partialWinningTrades,
      formatted: fmtInteger(stats.partialWinningTrades),
    }),
  },
  {
    id: 'partial_losing_trades',
    label: 'Partial losing trades',
    category: 'tradePerformance',
    extract: ({ stats }) => ({
      value: stats.partialLosingTrades,
      formatted: fmtInteger(stats.partialLosingTrades),
    }),
  },
  {
    id: 'total_partials_count',
    label: 'Total partials',
    category: 'tradePerformance',
    extract: ({ stats }) => ({
      value: stats.totalPartialTradesCount,
      formatted: fmtInteger(stats.totalPartialTradesCount),
    }),
  },
  {
    id: 'avg_days_between_trades',
    label: 'Avg days between trades',
    category: 'tradePerformance',
    extract: ({ stats }) => ({
      value: stats.averageDaysBetweenTrades,
      formatted: fmtNumber(stats.averageDaysBetweenTrades, 1),
    }),
  },
  {
    id: 'current_streak',
    label: 'Current streak',
    category: 'tradePerformance',
    extract: ({ stats }) => ({
      value: stats.currentStreak,
      formatted: fmtInteger(stats.currentStreak),
    }),
  },
];

export const SECTION_REGISTRY_BY_ID: Record<string, StatDefinition> =
  Object.fromEntries(SECTION_REGISTRY.map((s) => [s.id, s]));

export const SECTION_CATEGORIES: Array<{
  id: SectionCategoryId;
  label: string;
  description: string;
}> = [
  {
    id: 'coreStatistics',
    label: 'Core Statistics',
    description: 'Net P&L, win rate, averages',
  },
  {
    id: 'consistencyDrawdown',
    label: 'Consistency & Drawdown',
    description: 'Drawdown metrics, streaks, consistency score',
  },
  {
    id: 'performanceRatios',
    label: 'Performance Ratios',
    description: 'Profit factor, Sharpe, R-multiple',
  },
  {
    id: 'tradePerformance',
    label: 'Trade Performance Analysis',
    description: 'Break-even, partials, cadence, streaks',
  },
];

export function statsForCategory(
  categoryId: SectionCategoryId,
): readonly StatDefinition[] {
  return SECTION_REGISTRY.filter((s) => s.category === categoryId);
}
