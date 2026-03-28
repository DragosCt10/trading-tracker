// src/utils/calculatePeriodMetrics.ts
import type { Trade } from '@/types/trade';
import { calculateWinRates } from '@/utils/calculateWinRates';
import { calculateMacroStats } from '@/utils/calculateMacroStats';
import { calculateExpectancy } from '@/utils/analyticsCalculations';
import { calculateStreaksFromTrades } from '@/utils/calculateStreaks';
import { calculateDirectionStats } from '@/utils/calculateCategoryStats';

export interface PeriodMetrics {
  winRate: number;
  netPnlPct: number;           // (totalPnL / accountBalance) * 100
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;         // peak-to-trough of cumulative PnL, as positive %
  recoveryFactor: number;      // totalPnL / maxDrawdown (0 when maxDD=0)
  avgWinLossRatio: number;     // avgWin / avgLoss
  tradeFrequency: number;      // trades per day
  longWinRate: number;
  shortWinRate: number;
  consistencyScore: number;
  currentStreak: number;
  maxWinStreak: number;        // maps from calculateStreaksFromTrades().maxWinningStreak
  maxLossStreak: number;       // maps from calculateStreaksFromTrades().maxLosingStreak
  tradeCount: number;
  dayCount: number;
}

export const EMPTY_PERIOD_METRICS: PeriodMetrics = {
  winRate: 0,
  netPnlPct: 0,
  profitFactor: 0,
  expectancy: 0,
  maxDrawdown: 0,
  recoveryFactor: 0,
  avgWinLossRatio: 0,
  tradeFrequency: 0,
  longWinRate: 0,
  shortWinRate: 0,
  consistencyScore: 0,
  currentStreak: 0,
  maxWinStreak: 0,
  maxLossStreak: 0,
  tradeCount: 0,
  dayCount: 0,
};

/**
 * Compute all AI Vision metrics for a set of trades over a period.
 *
 * @param trades - Trades in the period (already filtered by market/execution if needed)
 * @param accountBalance - Account balance in account currency (used for PnL% and profitFactor)
 * @param dayCount - Number of calendar days in the period (for tradeFrequency)
 */
export function calculatePeriodMetrics(
  trades: Trade[],
  accountBalance: number,
  dayCount: number,
): PeriodMetrics {
  if (trades.length === 0) {
    return { ...EMPTY_PERIOD_METRICS, dayCount };
  }

  const balance = accountBalance || 1; // guard against 0 balance (division safety)

  // Win rate
  const { winRate } = calculateWinRates(trades);

  // Profit factor + consistency score
  const macro = calculateMacroStats(trades, balance);
  const { profitFactor, consistencyScore } = macro;

  // Expectancy + avg win/loss ratio
  const { expectancy, avgWin, avgLoss } = calculateExpectancy(trades);
  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;

  // Net PnL %: sum of calculated_profit / accountBalance * 100
  const totalPnL = trades.reduce((sum, t) => sum + (t.calculated_profit ?? 0), 0);
  const netPnlPct = (totalPnL / balance) * 100;

  // Max Drawdown: peak-to-trough of cumulative PnL series
  // Sort by date ascending, then walk the series
  const sorted = [...trades].sort((a, b) => a.trade_date.localeCompare(b.trade_date));
  let cumPnL = 0;
  let peak = 0;
  let maxDrawdownAbs = 0;
  for (const t of sorted) {
    cumPnL += t.calculated_profit ?? 0;
    if (cumPnL > peak) peak = cumPnL;
    const drawdown = peak - cumPnL;
    if (drawdown > maxDrawdownAbs) maxDrawdownAbs = drawdown;
  }
  // Express as % of account balance
  const maxDrawdown = (maxDrawdownAbs / balance) * 100;

  // Recovery Factor = totalPnL / maxDrawdownAbs (absolute, not %)
  // Guard: if no drawdown, recovery factor is 0 (not meaningful to show infinity)
  const recoveryFactor = maxDrawdownAbs > 0 ? totalPnL / maxDrawdownAbs : 0;

  // Trade frequency
  const tradeFrequency = dayCount > 0 ? trades.length / dayCount : 0;

  // Long/short win rates
  const directionStats = calculateDirectionStats(trades);
  const longStats = directionStats.find(
    (d) => d.direction.toLowerCase() === 'long' || d.direction.toLowerCase() === 'buy',
  );
  const shortStats = directionStats.find(
    (d) => d.direction.toLowerCase() === 'short' || d.direction.toLowerCase() === 'sell',
  );
  const longWinRate = longStats?.winRate ?? 0;
  const shortWinRate = shortStats?.winRate ?? 0;

  // Streaks
  const streaks = calculateStreaksFromTrades(trades);

  return {
    winRate,
    netPnlPct,
    profitFactor,
    expectancy,
    maxDrawdown,
    recoveryFactor,
    avgWinLossRatio,
    tradeFrequency,
    longWinRate,
    shortWinRate,
    consistencyScore,
    currentStreak: streaks.currentStreak,
    maxWinStreak: streaks.maxWinningStreak,
    maxLossStreak: streaks.maxLosingStreak,
    tradeCount: trades.length,
    dayCount,
  };
}
