// src/utils/calculateWinRates.ts

import { Trade } from '@/types/trade';

export interface WinRates {
  /** Win rate excluding break-even trades (percentage). */
  winRate: number;
  /** Win rate including break-even trades (percentage). */
  winRateWithBE: number;
}

/**
 * Calculate two measures of win-rate:
 *  - `winRate`: only counts non-break-even trades
 *  - `winRateWithBE`: counts all trades
 */
export function calculateWinRates(trades: Trade[]): WinRates {
  const acc = trades.reduce(
    (s, t) => {
      // total wins (for with-BE)
      if (t.trade_outcome === 'Win') s.totalWins++;
      // non-BE counts
      if (!t.break_even) {
        if (t.trade_outcome === 'Win')  s.nonBEWins++;
        else if (t.trade_outcome === 'Lose') s.nonBELosses++;
      }
      return s;
    },
    { totalWins: 0, nonBEWins: 0, nonBELosses: 0 }
  );

  const totalNonBE = acc.nonBEWins + acc.nonBELosses;
  const winRate = totalNonBE > 0
    ? (acc.nonBEWins / totalNonBE) * 100
    : 0;

  const totalTrades = trades.length;
  const winRateWithBE = totalTrades > 0
    ? (acc.totalWins / totalTrades) * 100
    : 0;

  return { winRate, winRateWithBE };
}
