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
  // 1) prepare a formatter just once
  const monthFormatter = new Intl.DateTimeFormat('default', { month: 'long' });

  // 2) accumulate everything in one pass
  type Raw = {
    wins: number;
    losses: number;
    beWins: number;
    beLosses: number;
    totalTrades: number;
    totalWins: number;
    totalNonBE: number;
    nonBEWins: number;
    profit: number;
  };

  const rawByMonth = trades.reduce<Record<number, Raw>>((acc, trade) => {
    const date = new Date(trade.trade_date);
    if (date.getFullYear() !== selectedYear) return acc;

    const m = date.getMonth(); // 0 = Jan, …, 11 = Dec
    const bucket = acc[m] ??= {
      wins: 0,
      losses: 0,
      beWins: 0,
      beLosses: 0,
      totalTrades: 0,
      totalWins: 0,
      totalNonBE: 0,
      nonBEWins: 0,
      profit:   0,
    };

    bucket.totalTrades++;
    if (trade.trade_outcome === 'Win') {
      bucket.wins++;
      bucket.totalWins++;
      if (trade.break_even) {
        bucket.beWins++;
      }
    } else {
      bucket.losses++;
      if (trade.break_even) {
        bucket.beLosses++;
      }
    }

    if (!trade.break_even) {
      bucket.totalNonBE++;
      if (trade.trade_outcome === 'Win') {
        bucket.nonBEWins++;
      }
      // profit calculation
      const riskPct = trade.risk_per_trade ?? 0.5;
      const riskAmt = accountBalance * (riskPct / 100);
      const rr = trade.risk_reward_ratio ?? 2;
      bucket.profit += (trade.trade_outcome === 'Win')
        ? riskAmt * rr
        : -riskAmt;
    }

    return acc;
  }, {});

  // 3) build final MonthlyStats and track best/worst
  const monthlyData: Record<string, MonthlyStats> = {};
  let best: BestWorstMonth | null = null;
  let worst: BestWorstMonth | null = null;

  for (const [mStr, raw] of Object.entries(rawByMonth)) {
    const monthIndex = Number(mStr);
    const name = monthFormatter.format(new Date(2025, monthIndex, 1));

    const stats: MonthlyStats = {
      wins:          raw.wins,
      losses:        raw.losses,
      beWins:        raw.beWins,
      beLosses:      raw.beLosses,
      profit:        raw.profit,
      winRate:       raw.totalNonBE > 0 ? (raw.nonBEWins / raw.totalNonBE) * 100 : 0,
      winRateWithBE: raw.totalTrades > 0 ? (raw.totalWins  / raw.totalTrades) * 100 : 0,
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
