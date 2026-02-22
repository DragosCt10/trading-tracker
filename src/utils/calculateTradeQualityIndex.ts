import { Trade } from "@/types/trade";
import { stdDev } from '@/utils/helpers/mathHelpers';

/**
 * Trade Quality Index (TQI)
 *
 * TQI = WinRate * RRStability
 * WinRate   = wins / totalTrades (BE counted in total, but not as wins)
 * RRStability = 1 / (1 + StdDev(R))
 *
 * R-values per trade:
 *  - Win (non-BE):   +risk_reward_ratio
 *  - Lose (non-BE):  -1R
 *  - Break-even:     0R
 *
 * Returns a number in [0, 1]. Multiply by 100 if you want a percentage.
 */
export function calculateTradeQualityIndex(trades: Trade[]): number {
  if (!trades.length) return 0;

  const rValues: number[] = [];
  let wins = 0;
  let total = 0;

  trades.forEach(t => {
    const rr =
      typeof t.risk_reward_ratio === 'number' && !isNaN(t.risk_reward_ratio)
        ? t.risk_reward_ratio
        : 0;

    // Determine R-multiple for this trade
    let r: number | undefined;

    if (t.break_even) {
      // Break-even trade: 0R
      r = 0;
      total += 1;
    } else if (t.trade_outcome === 'Win') {
      r = rr;
      wins += 1;
      total += 1;
    } else if (t.trade_outcome === 'Lose') {
      r = -1; // always -1R on a full loss
      total += 1;
    } else {
      // Unknown/other outcome: skip from stats
      return;
    }

    rValues.push(r);
  });

  if (!total || !rValues.length) return 0;

  const winRate = wins / total; // 0–1

  const rrStdDev = stdDev(rValues);
  const rrStability = 1 / (1 + rrStdDev); // 0–1

  const tqi = winRate * rrStability;
  return tqi;
}