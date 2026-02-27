// src/utils/calculateEvaluationStats.ts

import { Trade } from '@/types/trade';

export interface EvaluationStat {
  grade: string;
  total: number;
  wins: number;
  losses: number;
  beWins: number;
  beLosses: number;
  /** % excluding BE trades, rounded */
  winRate: number;
  /** % including BE trades in the denominator, rounded */
  winRateWithBE: number;
}

/**
 * Group by `trade.evaluation`, then compute stats per grade.
 * Only grades in `gradeOrder` are kept, and the result is sorted
 * in that order.
 */
export function calculateEvaluationStats(
  trades: Trade[],
  gradeOrder: string[] = ['A+', 'A', 'B', 'C']
): EvaluationStat[] {
  // 1) group trades by evaluation
  const groups = trades.reduce<Record<string, Trade[]>>((acc, t) => {
    const key = t.evaluation || 'Not Evaluated';
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  // 2) build stats for each grade in gradeOrder
  const stats = gradeOrder
    .filter(grade => groups[grade] != null)
    .map(grade => {
      const bucket = groups[grade]!;
      const total = bucket.length;

      let wins = 0;
      let losses = 0;
      let beWins = 0;
      let beLosses = 0;

      for (const t of bucket) {
        // Derive final outcome using BE final result when available.
        let outcome: 'Win' | 'Lose' | null = null;

        if (t.break_even) {
          if (t.be_final_result === 'Win' || t.be_final_result === 'Lose') {
            outcome = t.be_final_result;
          } else if (t.trade_outcome === 'Win' || t.trade_outcome === 'Lose') {
            // Legacy data: BE trades may still store Win/Lose in trade_outcome
            outcome = t.trade_outcome as 'Win' | 'Lose';
          }
        } else if (t.trade_outcome === 'Win' || t.trade_outcome === 'Lose') {
          outcome = t.trade_outcome as 'Win' | 'Lose';
        }

        if (outcome === 'Win') {
          wins++;
          if (t.break_even) beWins++;
        } else if (outcome === 'Lose') {
          losses++;
          if (t.break_even) beLosses++;
        }
      }

      const nonBEWins   = wins  - beWins;
      const nonBELosses = losses - beLosses;
      const denomExBE   = nonBEWins + nonBELosses;
      const winRate     = denomExBE > 0
        ? Math.round((nonBEWins / denomExBE) * 100)
        : 0;

      const beCount          = beWins + beLosses;
      const denomWithBE      = nonBEWins + nonBELosses + beCount;
      const winRateWithBE    = denomWithBE > 0
        ? Math.round((nonBEWins / denomWithBE) * 100)
        : 0;

      return {
        grade,
        total,
        wins,
        losses,
        beWins,
        beLosses,
        winRate,
        winRateWithBE,
      };
    });

  return stats;
}
