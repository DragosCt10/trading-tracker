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
  let neutralBEPartials = 0;

  for (const trade of trades) {
    if (!trade.partials_taken) continue;

    if (trade.break_even) {
      // For BE trades, prefer the explicit final result when present.
      const explicitFinal =
        trade.be_final_result === 'Win' || trade.be_final_result === 'Lose'
          ? trade.be_final_result
          : null;

      // Backwards‑compatible fallback for legacy data where BE trades still
      // have trade_outcome 'Win' | 'Lose' instead of 'BE'.
      const legacyOutcome =
        trade.trade_outcome === 'Win' || trade.trade_outcome === 'Lose'
          ? trade.trade_outcome
          : null;

      const finalOutcome = explicitFinal ?? legacyOutcome;

      if (finalOutcome === 'Win') {
        beWinPartialTrades++;
      } else if (finalOutcome === 'Lose') {
        beLosingPartialTrades++;
      } else {
        // True neutral BE partial (no final result)
        neutralBEPartials++;
      }
    } else {
      // Non‑BE partials use trade_outcome directly.
      if (trade.trade_outcome === 'Win') {
        partialWinningTrades++;
      } else if (trade.trade_outcome === 'Lose') {
        partialLosingTrades++;
      }
    }
  }

  const nonBEWins = partialWinningTrades;
  const nonBELosses = partialLosingTrades;

  // Win rate excluding BE partials entirely.
  const partialWinRate =
    nonBEWins + nonBELosses > 0
      ? (nonBEWins / (nonBEWins + nonBELosses)) * 100
      : 0;

  // Win rate including BE partials that have a final result.
  const winsWithBE = partialWinningTrades + beWinPartialTrades;
  const effectiveTotalWithBE =
    partialWinningTrades +
    partialLosingTrades +
    beWinPartialTrades +
    beLosingPartialTrades;

  const partialWinRateWithBE =
    effectiveTotalWithBE > 0
      ? (winsWithBE / effectiveTotalWithBE) * 100
      : 0;

  const totalPartialTradesCount =
    partialWinningTrades +
    partialLosingTrades +
    beWinPartialTrades +
    beLosingPartialTrades +
    neutralBEPartials;

  const totalPartialsBECount =
    beWinPartialTrades + beLosingPartialTrades + neutralBEPartials;

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
