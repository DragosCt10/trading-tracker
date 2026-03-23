/**
 * Performance Benchmarks — All calculate*.ts pure functions
 *
 * Data is generated ONCE at module scope (outside all describe/bench blocks).
 * This excludes generation time from measurements while keeping timings honest.
 *
 * Scales tested:
 *   - 1k  trades  → baseline
 *   - 10k trades  → medium user
 *   - 30k trades  → real-world power user
 *   - 100k trades → absolute stress ceiling (category stats only)
 *
 * Run:
 *   npm run bench
 */

import { bench, describe } from 'vitest';
import type { Trade } from '../../src/types/trade';
import {
  getSmall,
  getLarge,
  getXLarge,
  getStress,
  getDiverse,
} from './fixtures/scenarios';

import { calculateMacroStats }              from '../../src/utils/calculateMacroStats';
import { calculateMonthlyStats }            from '../../src/utils/calculateMonthlyState';
import {
  calculateSetupStats,
  calculateMarketStats,
  calculateLiquidityStats,
  calculateDirectionStats,
  calculateDayStats,
} from '../../src/utils/calculateCategoryStats';
import { calculateRiskPerTradeStats }       from '../../src/utils/calculateRiskPerTrade';
import { computeStrategyStatsRowFromTrades } from '../../src/utils/calculateRMultiple';
import { calculateWinRates }               from '../../src/utils/calculateWinRates';
import { calculateTradeCounts }            from '../../src/utils/calculateTradeCounts';
import { calculateProfit }                 from '../../src/utils/calculateProfit';
import { calculatePartialTradesStats }     from '../../src/utils/calculatePartialTradesStats';
import { calculateStreaks }                from '../../src/utils/calculateStreaks';
import { calculateEvaluationStats }        from '../../src/utils/calculateEvaluationStats';
import { calculateAverageDaysBetweenTrades } from '../../src/utils/calculateAverageDaysBetweenTrades';
import { calculateTradingOverviewStats }   from '../../src/utils/calculateTradingOverviewStats';
import { calculateFilteredMacroStats }     from '../../src/utils/calculateFilteredMacroStats';
import { calculateFromSeries }             from '../../src/utils/calculateFromSeries';

// ── Pre-generate all datasets once at module scope ────────────────────────
// This keeps generation cost out of bench() callbacks without beforeEach issues.
const T_1K:     Trade[] = getSmall();
const T_10K:    Trade[] = getLarge();
const T_30K:    Trade[] = getXLarge();
const T_100K:   Trade[] = getStress();
const T_DIVERSE: Trade[] = getDiverse();

const ACCOUNT_BALANCE = 50_000;
const CURRENT_YEAR    = new Date().getFullYear();

/**
 * Runs all 5 category-stat functions — matches the real dashboard behaviour.
 * (calculateIntervalStats excluded: requires a separate intervals-config arg.)
 */
function runAllCategoryStats(trades: Trade[]): void {
  calculateSetupStats(trades);
  calculateMarketStats(trades, ACCOUNT_BALANCE);
  calculateLiquidityStats(trades);
  calculateDirectionStats(trades);
  calculateDayStats(trades);
}

// ── Pre-built mock inputs for calculateFilteredMacroStats ─────────────────
const MOCK_MONTHLY_STATS: Record<string, { profit: number }> = {};
for (let m = 1; m <= 12; m++) {
  MOCK_MONTHLY_STATS[`Month${m}`] = { profit: (m % 3 === 0 ? -1 : 1) * m * 400 };
}
const MOCK_STATS = {
  totalWins: 600,
  totalLosses: 250,
  averagePnLPercentage: 0.45,
  maxDrawdown: 8.2,
  tradeQualityIndex: 0.72,
  multipleR: 1.8,
};
const MOCK_MACRO = { profitFactor: 1.8, consistencyScore: 0.65, consistencyScoreWithBE: 0.6 };

// ── Pre-built mock series for calculateFromSeries ─────────────────────────
function buildSeries(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    trade_outcome: i % 4 === 0 ? 'Lose' : (i % 5 === 0 ? 'BE' : 'Win'),
    risk_per_trade: 0.5,
    break_even: i % 5 === 0,
    partials_taken: false,
  }));
}
const SERIES_1K  = buildSeries(1_000);
const SERIES_30K = buildSeries(30_000);

// =========================================================================
// 1. calculateMacroStats — profit factor, Sharpe, TQI, consistency
// =========================================================================
describe('calculateMacroStats', () => {
  bench('1k trades',  () => { calculateMacroStats(T_1K,  ACCOUNT_BALANCE); });
  bench('10k trades', () => { calculateMacroStats(T_10K, ACCOUNT_BALANCE); });
  bench('30k trades', () => { calculateMacroStats(T_30K, ACCOUNT_BALANCE); });
});

// =========================================================================
// 2. calculateMonthlyStats — per-month P&L and win rates
// =========================================================================
describe('calculateMonthlyStats', () => {
  bench('1k trades',  () => { calculateMonthlyStats(T_1K,  CURRENT_YEAR, ACCOUNT_BALANCE); });
  bench('10k trades', () => { calculateMonthlyStats(T_10K, CURRENT_YEAR, ACCOUNT_BALANCE); });
  bench('30k trades', () => { calculateMonthlyStats(T_30K, CURRENT_YEAR, ACCOUNT_BALANCE); });
});

// =========================================================================
// 3. Category stats — O(n×m): setup / market / liquidity / direction / day
//    Runs all 5 functions together (matches real dashboard behaviour).
// =========================================================================
describe('calculateCategoryStats — normal distribution', () => {
  bench('1k trades',   () => { runAllCategoryStats(T_1K); });
  bench('30k trades',  () => { runAllCategoryStats(T_30K); });
  bench('100k trades', () => { runAllCategoryStats(T_100K); });
});

describe('calculateCategoryStats — diverse O(n×m) stress', () => {
  bench('30k trades × 50+ setups × 20+ markets', () => { runAllCategoryStats(T_DIVERSE); });
});

// =========================================================================
// 4. calculateRiskPerTradeStats — risk bucket aggregation
// =========================================================================
describe('calculateRiskPerTradeStats', () => {
  bench('1k trades',  () => { calculateRiskPerTradeStats(T_1K); });
  bench('30k trades', () => { calculateRiskPerTradeStats(T_30K); });
});

// =========================================================================
// 5. computeStrategyStatsRowFromTrades — R-multiple aggregates
// =========================================================================
describe('computeStrategyStatsRowFromTrades', () => {
  bench('1k trades',  () => { computeStrategyStatsRowFromTrades(T_1K); });
  bench('30k trades', () => { computeStrategyStatsRowFromTrades(T_30K); });
});

// =========================================================================
// 6. calculateWinRates
// =========================================================================
describe('calculateWinRates', () => {
  bench('1k trades',  () => { calculateWinRates(T_1K); });
  bench('30k trades', () => { calculateWinRates(T_30K); });
});

// =========================================================================
// 7. calculateTradeCounts
// =========================================================================
describe('calculateTradeCounts', () => {
  bench('1k trades',  () => { calculateTradeCounts(T_1K); });
  bench('30k trades', () => { calculateTradeCounts(T_30K); });
});

// =========================================================================
// 8. calculateProfit — max drawdown, average drawdown
// =========================================================================
describe('calculateProfit', () => {
  bench('1k trades',  () => { calculateProfit(T_1K,  ACCOUNT_BALANCE); });
  bench('30k trades', () => { calculateProfit(T_30K, ACCOUNT_BALANCE); });
});

// =========================================================================
// 9. calculatePartialTradesStats
// =========================================================================
describe('calculatePartialTradesStats', () => {
  bench('1k trades',  () => { calculatePartialTradesStats(T_1K); });
  bench('30k trades', () => { calculatePartialTradesStats(T_30K); });
});

// =========================================================================
// 10. calculateStreaks
// =========================================================================
describe('calculateStreaks', () => {
  bench('1k trades',  () => { calculateStreaks(T_1K); });
  bench('30k trades', () => { calculateStreaks(T_30K); });
});

// =========================================================================
// 11. calculateEvaluationStats
// =========================================================================
describe('calculateEvaluationStats', () => {
  bench('1k trades',  () => { calculateEvaluationStats(T_1K); });
  bench('30k trades', () => { calculateEvaluationStats(T_30K); });
});

// =========================================================================
// 12. calculateAverageDaysBetweenTrades — O(n log n) sort
// =========================================================================
describe('calculateAverageDaysBetweenTrades', () => {
  bench('1k trades',  () => { calculateAverageDaysBetweenTrades(T_1K); });
  bench('30k trades', () => { calculateAverageDaysBetweenTrades(T_30K); });
});

// =========================================================================
// 13. calculateTradingOverviewStats
// =========================================================================
describe('calculateTradingOverviewStats', () => {
  bench('1k trades',  () => { calculateTradingOverviewStats(T_1K); });
  bench('30k trades', () => { calculateTradingOverviewStats(T_30K); });
});

// =========================================================================
// 14. calculateFilteredMacroStats — pre-aggregated stats, not raw trades
// =========================================================================
describe('calculateFilteredMacroStats', () => {
  bench('1k trades (trades re-processed internally)', () => {
    calculateFilteredMacroStats({
      viewMode:                    'yearly',
      selectedMarket:              'All',
      tradesToUse:                 T_1K,
      statsToUse:                  MOCK_STATS,
      monthlyStatsToUse:           MOCK_MONTHLY_STATS,
      nonExecutedTrades:           null,
      nonExecutedTotalTradesCount: undefined,
      yearlyPartialTradesCount:    undefined,
      yearlyPartialsBECount:       undefined,
      macroStats:                  MOCK_MACRO,
    });
  });
  bench('30k trades (trades re-processed internally)', () => {
    calculateFilteredMacroStats({
      viewMode:                    'yearly',
      selectedMarket:              'All',
      tradesToUse:                 T_30K,
      statsToUse:                  MOCK_STATS,
      monthlyStatsToUse:           MOCK_MONTHLY_STATS,
      nonExecutedTrades:           null,
      nonExecutedTotalTradesCount: undefined,
      yearlyPartialTradesCount:    undefined,
      yearlyPartialsBECount:       undefined,
      macroStats:                  MOCK_MACRO,
    });
  });
});

// =========================================================================
// 15. calculateFromSeries — max drawdown from ordered RPC series
// =========================================================================
describe('calculateFromSeries', () => {
  bench('1k rows',  () => { calculateFromSeries(SERIES_1K  as Parameters<typeof calculateFromSeries>[0], ACCOUNT_BALANCE); });
  bench('30k rows', () => { calculateFromSeries(SERIES_30K as Parameters<typeof calculateFromSeries>[0], ACCOUNT_BALANCE); });
});
