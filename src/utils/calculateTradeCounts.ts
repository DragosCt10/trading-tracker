// src/utils/calculateTradeCounts.ts

import { Trade } from '@/types/trade';

export interface TradeCounts {
  /** Total number of trades. */
  totalTrades: number;
  /** Total winning trades (including break-even wins). */
  totalWins: number;
  /** Of the wins, how many were flagged break-even. */
  beWins: number;
  /** Total losing trades (including break-even losses). */
  totalLosses: number;
  /** Of the losses, how many were flagged break-even. */
  beLosses: number;
}

/**
 * Count total trades, wins/losses, and how many of those were break-even.
 */
export function calculateTradeCounts(trades: Trade[]): TradeCounts {
  let totalWins = 0;
  let totalLosses = 0;
  let beWins = 0;
  let beLosses = 0;

  for (const t of trades) {
    if (t.trade_outcome === 'Win') {
      totalWins++;
      if (t.break_even) beWins++;
    } else if (t.trade_outcome === 'Lose') {
      totalLosses++;
      if (t.break_even) beLosses++;
    }
  }

  return {
    totalTrades: trades.length,
    totalWins,
    beWins,
    totalLosses,
    beLosses,
  };
}
