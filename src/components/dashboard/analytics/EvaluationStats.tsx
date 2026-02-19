'use client';

import React from 'react';
import { TradeStatDatum, TradeStatsBarCard } from "./TradesStatsBarCard";
import { calculateEvaluationStats as calculateEvaluationStatsUtil } from '@/utils/calculateEvaluationStats';
import type { EvaluationStat } from '@/utils/calculateEvaluationStats';

export interface EvaluationStatsProps {
  stats: EvaluationStat[];
  isLoading?: boolean;
}

export const GRADE_ORDER = ['A+', 'A', 'B', 'C'] as const;

/**
 * Calculate evaluation statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @param gradeOrder - Order of grades to include (default: ['A+', 'A', 'B', 'C'])
 * @returns Array of evaluation statistics
 */
export function calculateEvaluationStats(
  trades: any[],
  gradeOrder: string[] = GRADE_ORDER as unknown as string[]
): EvaluationStat[] {
  return calculateEvaluationStatsUtil(trades, gradeOrder);
}

/**
 * Convert evaluation stats to chart data format
 * Filters out "Not Evaluated" and sorts by grade order
 * @param stats - Array of evaluation statistics
 * @returns Array of TradeStatDatum for chart display
 */
export function convertEvaluationStatsToChartData(stats: EvaluationStat[]): TradeStatDatum[] {
  // Filter out "Not Evaluated" and sort by grade order
  const filtered = stats
    .filter((stat) => GRADE_ORDER.includes(stat.grade as any))
    .sort(
      (a, b) => GRADE_ORDER.indexOf(a.grade as any) - GRADE_ORDER.indexOf(b.grade as any),
    );

  return filtered.map((stat) => ({
    category: `${stat.grade}`,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: stat.winRate,
    winRateWithBE: stat.winRateWithBE,
    totalTrades: stat.total,
  }));
}

export const EvaluationStats: React.FC<EvaluationStatsProps> = React.memo(
  function EvaluationStats({ stats, isLoading }) {
    const chartData = convertEvaluationStatsToChartData(stats);

    return (
      <TradeStatsBarCard
        title="Evaluation Grade Statistics"
        description="Distribution of evaluation trades by grade."
        data={chartData}
        mode="winsLossesWinRate"
        heightClassName="h-80"
        isLoading={isLoading}
      />
    );
  }
);
