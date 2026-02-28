// src/utils/calculateEvaluationStats.ts

import { Trade } from '@/types/trade';

export interface EvaluationStat {
  grade: string;
  total: number;
  wins: number;
  losses: number;
  /** Count of trades with outcome BE (break_even). Same as breakEven for BaseStats compatibility. */
  beTradesCount: number;
  /** Break-even count (same as beTradesCount); required for EvaluationStats / BaseStats. */
  breakEven: number;
  /** % excluding BE trades, rounded */
  winRate: number;
  /** Wins as % of all trades (wins / total), rounded */
  winRateWithBE: number;
}

/**
 * Group by `trade.evaluation`, then compute stats per grade.
 * Three buckets: wins (non-BE), losses (non-BE), BE. No beWins/beLosses split.
 */
export function calculateEvaluationStats(
  trades: Trade[],
  gradeOrder: string[] = ['A+', 'A', 'B', 'C']
): EvaluationStat[] {
  const groups = trades.reduce<Record<string, Trade[]>>((acc, t) => {
    const key = t.evaluation || 'Not Evaluated';
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  const stats = gradeOrder
    .filter((grade) => groups[grade] != null)
    .map((grade) => {
      const bucket = groups[grade]!;

      let wins = 0;
      let losses = 0;
      let beTradesCount = 0;

      for (const t of bucket) {
        if (t.break_even) {
          beTradesCount++;
        } else {
          if (t.trade_outcome === 'Win') wins++;
          else if (t.trade_outcome === 'Lose') losses++;
        }
      }

      /** Total = only trades with an outcome (Wins + Losses + BE), so tooltip matches the three buckets. */
      const total = wins + losses + beTradesCount;

      const nonBETotal = wins + losses;
      const winRate = nonBETotal > 0 ? Math.round((wins / nonBETotal) * 100) : 0;
      const winRateWithBE = total > 0 ? Math.round((wins / total) * 100) : 0;

      return {
        grade,
        total,
        wins,
        losses,
        beTradesCount,
        breakEven: beTradesCount,
        winRate,
        winRateWithBE,
      };
    });

  return stats;
}
