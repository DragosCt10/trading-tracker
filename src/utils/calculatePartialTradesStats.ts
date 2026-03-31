import { Trade } from '@/types/trade';

export interface PartialTradesStats {
  partialWinningTrades: number;
  partialLosingTrades: number;
  /** Partial trades with outcome BE (break-even). */
  partialBETrades: number;
  totalPartialTradesCount: number;
  /** Same as partialBETrades (for backward compatibility). */
  totalPartialsBECount: number;
}

export function calculatePartialTradesStats(trades: Trade[]): PartialTradesStats {
  let partialWinningTrades = 0;
  let partialLosingTrades = 0;
  let partialBETrades = 0;

  for (const trade of trades) {
    if (!trade.partials_taken) continue;

    if (trade.break_even) {
      partialBETrades++;
    } else {
      if (trade.trade_outcome === 'Win') {
        partialWinningTrades++;
      } else if (trade.trade_outcome === 'Lose') {
        partialLosingTrades++;
      }
    }
  }

  const totalPartialTradesCount =
    partialWinningTrades + partialLosingTrades + partialBETrades;

  return {
    partialWinningTrades,
    partialLosingTrades,
    partialBETrades,
    totalPartialTradesCount,
    totalPartialsBECount: partialBETrades,
  };
}
