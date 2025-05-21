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
      const wins  = bucket.filter(t => t.trade_outcome === 'Win').length;
      const losses = bucket.filter(t => t.trade_outcome === 'Lose').length;
      const beWins = bucket.filter(t => t.trade_outcome === 'Win'  && t.break_even).length;
      const beLosses = bucket.filter(t => t.trade_outcome === 'Lose' && t.break_even).length;

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
