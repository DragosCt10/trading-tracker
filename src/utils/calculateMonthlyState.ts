// utils/calculateMonthlyStats.ts

import { Trade } from '@/types/trade';
import { MonthlyStatsResult, BestWorstMonth, MonthlyStats } from '@/types/dashboard';

/**
 * Calculate per-month P&L and win rates for a given year and account balance.
 */
export function calculateMonthlyStats(
  trades: Trade[],
  selectedYear: number,
  accountBalance: number
): MonthlyStatsResult {
  const monthFormatter = new Intl.DateTimeFormat('default', { month: 'long' });

  type Raw = {
    wins: number;
    losses: number;
    beWins: number;
    beLosses: number;
    totalTrades: number;
    totalNonBE: number;
    nonBEWins: number;
    profit: number;
  };

  const rawByMonth = trades.reduce<Record<number, Raw>>((acc, trade) => {
    const date = new Date(trade.trade_date);
    if (date.getFullYear() !== selectedYear) return acc;

    const m = date.getMonth();
    const bucket = acc[m] ??= {
      wins: 0,
      losses: 0,
      beWins: 0,
      beLosses: 0,
      totalTrades: 0,
      totalNonBE: 0,
      nonBEWins: 0,
      profit: 0,
    };

    bucket.totalTrades++;
    if (trade.trade_outcome === 'Win') {
      bucket.wins++;
      if (trade.break_even) bucket.beWins++;
    } else {
      bucket.losses++;
      if (trade.break_even) bucket.beLosses++;
    }

    if (!trade.break_even) {
      bucket.totalNonBE++;
      if (trade.trade_outcome === 'Win') {
        bucket.nonBEWins++;
      }
      // Calculate profit based on risk_per_trade and risk_reward_ratio
      const pct = trade.risk_per_trade ?? 0.5;
      const rr = trade.risk_reward_ratio ?? 2;
      const riskAmount = accountBalance * (pct / 100);
      bucket.profit += trade.trade_outcome === 'Win' ? riskAmount * rr : -riskAmount;
    } else if (trade.partials_taken) {
      // BE trades with partials are always treated as wins
      const pct = trade.risk_per_trade ?? 0.5;
      const rr = trade.risk_reward_ratio ?? 2;
      const riskAmount = accountBalance * (pct / 100);
      bucket.profit += riskAmount * rr;
    }

    return acc;
  }, {});

  const monthlyData: Record<string, MonthlyStats> = {};
  let best: BestWorstMonth | null = null;
  let worst: BestWorstMonth | null = null;

  for (const [mStr, raw] of Object.entries(rawByMonth)) {
    const idx  = Number(mStr);
    const name = monthFormatter.format(new Date(2025, idx, 1));

    const nonBEWins   = raw.nonBEWins;
    const nonBELosses = raw.totalNonBE - raw.nonBEWins;
    const denomExBE   = nonBEWins + nonBELosses;
    const winRate     = denomExBE > 0
      ? (nonBEWins / denomExBE) * 100
      : 0;

    // with-BE uses same numerator but divides by all trades (non-BE + BE)
    const winRateWithBE = raw.totalTrades > 0
      ? (nonBEWins / raw.totalTrades) * 100
      : 0;

    const stats: MonthlyStats = {
      wins:           raw.wins,
      losses:         raw.losses,
      beWins:         raw.beWins,
      beLosses:       raw.beLosses,
      profit:         raw.profit,
      winRate,
      winRateWithBE,
    };

    monthlyData[name] = stats;

    if (raw.wins + raw.losses > 0) {
      if (!best || stats.profit > best.stats.profit) {
        best = { month: name, stats };
      }
      if (!worst || stats.profit < worst.stats.profit) {
        worst = { month: name, stats };
      }
    }
  }

  return {
    monthlyData,
    bestMonth: best,
    worstMonth: worst,
  };
}
