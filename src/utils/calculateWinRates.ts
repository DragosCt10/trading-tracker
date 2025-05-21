// src/utils/calculateWinRates.ts

import { Trade } from '@/types/trade';

export interface WinRates {
  /** Win rate excluding break-even trades (percentage). */
  winRate: number;
  /** Win rate including break-even trades in the denominator (percentage). */
  winRateWithBE: number;
}

/**
 * Calculate two measures of win-rate:
 *  - `winRate`       = non-BE wins / (non-BE wins + non-BE losses)
 *  - `winRateWithBE` = non-BE wins / (non-BE wins + non-BE losses + break-even trades)
 */
export function calculateWinRates(trades: Trade[]): WinRates {
  let nonBEWins   = 0;
  let nonBELosses = 0;
  let beCount     = 0;

  for (const t of trades) {
    if (t.break_even) {
      beCount++;
    } else if (t.trade_outcome === 'Win') {
      nonBEWins++;
    } else if (t.trade_outcome === 'Lose') {
      nonBELosses++;
    }
  }

  // Win rate excluding break-even trades
  const denomExBE = nonBEWins + nonBELosses;
  const winRate = denomExBE > 0
    ? (nonBEWins / denomExBE) * 100
    : 0;

  // Win rate including break-even in the denominator
  const denomWithBE = denomExBE + beCount;
  const winRateWithBE = denomWithBE > 0
    ? (nonBEWins / denomWithBE) * 100
    : 0;

  return { winRate, winRateWithBE };
}