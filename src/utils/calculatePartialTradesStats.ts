import { Trade } from '@/types/trade';

interface PartialTradesStats {
  partialWinningTrades: number;
  partialLosingTrades: number;
  beWinPartialTrades: number;
  beLosingPartialTrades: number;
  partialWinRate: number; // without BE
  partialWinRateWithBE: number; // with BE
  totalPartialTradesCount: number;
  totalPartialsBECount: number;
}

export function calculatePartialTradesStats(trades: Trade[]): PartialTradesStats {
  let partialWinningTrades = 0;
  let partialLosingTrades = 0;
  let beWinPartialTrades = 0;
  let beLosingPartialTrades = 0;

  // For winrate calculations
  let totalWithoutBE = 0;
  let totalWithBE = 0;
  let winsWithoutBE = 0;
  let winsWithBE = 0;

  for (const trade of trades) {
    if (!trade.partials_taken) continue;

    if (trade.break_even) {
      totalWithBE++;
      if (trade.trade_outcome === 'Win') {
        beWinPartialTrades++;
        winsWithBE++;
      } else {
        beLosingPartialTrades++;
      }
    } else {
      totalWithBE++;
      totalWithoutBE++;
      if (trade.trade_outcome === 'Win') {
        partialWinningTrades++;
        winsWithoutBE++;
        winsWithBE++;
      } else {
        partialLosingTrades++;
      }
    }
  }

  const partialWinRate = totalWithoutBE > 0 ? (winsWithoutBE / totalWithoutBE) * 100 : 0;
  const partialWinRateWithBE = totalWithBE > 0 ? (winsWithBE / totalWithBE) * 100 : 0;
  const totalPartialTradesCount = partialWinningTrades + partialLosingTrades + beWinPartialTrades + beLosingPartialTrades;
  const totalPartialsBECount = beWinPartialTrades + beLosingPartialTrades;

  return {
    partialWinningTrades,
    partialLosingTrades,
    beWinPartialTrades,
    beLosingPartialTrades,
    partialWinRate,
    partialWinRateWithBE,
    totalPartialTradesCount,
    totalPartialsBECount
  };
}
