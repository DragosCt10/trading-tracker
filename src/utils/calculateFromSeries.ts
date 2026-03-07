/**
 * Layer 2: compute time-series-dependent stats from the compact ordered series
 * returned by the get_dashboard_aggregates RPC.
 *
 * These 4 stats need an ordered sequence of trades and cannot be expressed
 * as simple SQL aggregates without window functions + result stitching:
 *  - maxDrawdown    (equity-curve peak-to-trough)
 *  - currentStreak / maxWinningStreak / maxLosingStreak
 *  - sharpeWithBE   (sample Sharpe on per-trade returns)
 *  - tradeQualityIndex (winRate × 1/(1+stdDev(R)))
 *
 * The series arrives pre-sorted by (trade_date, trade_time) from the RPC.
 */

import type { RpcSeriesRow } from '@/types/dashboard-rpc';
import { stdDev, calcSharpe } from '@/utils/helpers/mathHelpers';

export interface SeriesStats {
  maxDrawdown: number;
  currentStreak: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
  sharpeWithBE: number;
  tradeQualityIndex: number;
}

/**
 * Derives all time-series stats from the ordered series returned by the RPC.
 *
 * @param series         Ordered rows from RPC (already sorted by date+time)
 * @param accountBalance Starting account balance (for drawdown %)
 */
export function calculateFromSeries(
  series: RpcSeriesRow[],
  accountBalance: number
): SeriesStats {
  if (!series.length) {
    return {
      maxDrawdown: 0,
      currentStreak: 0,
      maxWinningStreak: 0,
      maxLosingStreak: 0,
      sharpeWithBE: 0,
      tradeQualityIndex: 0,
    };
  }

  // ── maxDrawdown ──────────────────────────────────────────────────────────
  // Running equity curve on non-BE trades only, identical to calculateProfit.ts
  let balance = accountBalance;
  let peak = balance;
  let maxDrawdown = 0;

  // ── streaks ──────────────────────────────────────────────────────────────
  // Excludes BE trades, identical to calculateStreaks(trades) default options
  let currentWinStreak = 0;
  let currentLoseStreak = 0;
  let maxWinStreak = 0;
  let maxLoseStreak = 0;
  let lastOutcome: 'Win' | 'Lose' | null = null;

  // ── Sharpe + TQI ─────────────────────────────────────────────────────────
  const returnsWithBE: number[] = [];   // per-trade return (BE without partials = 0)
  const rValues: number[] = [];          // R-multiple per trade (for TQI)
  let tqiWins = 0;
  let tqiTotal = 0;

  for (const row of series) {
    const { trade_outcome, break_even, partials_taken, calculated_profit,
            risk_per_trade, risk_reward_ratio } = row;

    const riskAmt = accountBalance * (risk_per_trade / 100);
    const isRealTrade = !break_even || (break_even && partials_taken);
    const returnAmount = isRealTrade
      ? (trade_outcome === 'Win' ? riskAmt * risk_reward_ratio : -riskAmt)
      : 0;

    // ── drawdown (non-BE only) ────────────────────────────────────────────
    if (!break_even) {
      balance += calculated_profit;
      if (balance > peak) peak = balance;
      const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // ── streaks (exclude BE, only Win/Lose count) ─────────────────────────
    if (!break_even) {
      if (trade_outcome === 'Win') {
        currentWinStreak++;
        currentLoseStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
        lastOutcome = 'Win';
      } else if (trade_outcome === 'Lose') {
        currentLoseStreak++;
        currentWinStreak = 0;
        if (currentLoseStreak > maxLoseStreak) maxLoseStreak = currentLoseStreak;
        lastOutcome = 'Lose';
      }
    }

    // ── Sharpe returns (BE without partials = 0) ─────────────────────────
    returnsWithBE.push(returnAmount);

    // ── TQI R-values ──────────────────────────────────────────────────────
    // Mirrors calculateTradeQualityIndex: Win=+RR, Lose=-1, BE=0
    if (break_even) {
      rValues.push(0);
      tqiTotal++;
    } else if (trade_outcome === 'Win') {
      rValues.push(risk_reward_ratio);
      tqiWins++;
      tqiTotal++;
    } else if (trade_outcome === 'Lose') {
      rValues.push(-1);
      tqiTotal++;
    }
  }

  const currentStreak = lastOutcome === 'Win'
    ? currentWinStreak
    : lastOutcome === 'Lose'
      ? -currentLoseStreak
      : 0;

  const sharpeWithBE = calcSharpe(returnsWithBE);

  const tqiWinRate = tqiTotal > 0 ? tqiWins / tqiTotal : 0;
  const rrStability = 1 / (1 + stdDev(rValues));
  const tradeQualityIndex = tqiWinRate * rrStability;

  return {
    maxDrawdown,
    currentStreak,
    maxWinningStreak: maxWinStreak,
    maxLosingStreak: maxLoseStreak,
    sharpeWithBE,
    tradeQualityIndex,
  };
}
