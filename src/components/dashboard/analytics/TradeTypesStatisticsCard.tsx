'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateReentryStats as calculateReentryStatsUtil } from '@/utils/calculateCategoryStats';
import { calculateBreakEvenStats as calculateBreakEvenStatsUtil } from '@/utils/calculateCategoryStats';
import type { TradeTypeStats, BaseStats } from '@/types/dashboard';

// Type that matches both TradeTypeStats and filtered stats (which may not have tradeType)
type TradeTypeStatsLike = BaseStats & {
  tradeType?: string;
  total?: number;
};

export interface TradeTypesStatisticsCardProps {
  reentryStats: TradeTypeStatsLike[];
  breakEvenStats: TradeTypeStatsLike[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate reentry statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of reentry statistics
 */
export function calculateReentryStats(trades: Trade[]): TradeTypeStats[] {
  return calculateReentryStatsUtil(trades);
}

/**
 * Calculate break-even statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of break-even statistics
 */
export function calculateBreakEvenStats(trades: Trade[]): TradeTypeStats[] {
  return calculateBreakEvenStatsUtil(trades);
}

/**
 * Convert trade types stats (reentry + break-even) to chart data format
 * @param reentryStats - Array of reentry statistics
 * @param breakEvenStats - Array of break-even statistics
 * @param includeTotalTrades - If true, includes totalTrades in the result (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertTradeTypesStatsToChartData(
  reentryStats: TradeTypeStatsLike[],
  breakEvenStats: TradeTypeStatsLike[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  const reentryData: TradeStatDatum[] = reentryStats.map((stat) => {
    const statWithTotal = stat as any;
    const baseData: TradeStatDatum = {
      category: 'Re-entry',
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
    };

    if (includeTotalTrades) {
      baseData.totalTrades = statWithTotal.total !== undefined
        ? statWithTotal.total
        : (stat.wins + stat.losses + stat.beWins + stat.beLosses);
    }

    return baseData;
  });

  const breakEvenData: TradeStatDatum[] = breakEvenStats.map((stat) => {
    const statWithTotal = stat as any;
    const baseData: TradeStatDatum = {
      category: 'Break-even',
      wins: stat.wins,
      losses: stat.losses,
      // typically no BE expansion here
      winRate: stat.winRate,
    };

    if (includeTotalTrades) {
      baseData.totalTrades = statWithTotal.total !== undefined
        ? statWithTotal.total
        : (stat.wins + stat.losses + stat.beWins + stat.beLosses);
    }

    return baseData;
  });

  return [...reentryData, ...breakEvenData];
}

/**
 * Convert filtered trade types stats to chart data format (includes totalTrades)
 * @param reentryStats - Array of reentry statistics (may include total property)
 * @param breakEvenStats - Array of break-even statistics (may include total property)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertFilteredTradeTypesStatsToChartData(
  reentryStats: TradeTypeStatsLike[],
  breakEvenStats: TradeTypeStatsLike[]
): TradeStatDatum[] {
  return convertTradeTypesStatsToChartData(reentryStats, breakEvenStats, true);
}

export const TradeTypesStatisticsCard: React.FC<TradeTypesStatisticsCardProps> = React.memo(
  function TradeTypesStatisticsCard({ reentryStats, breakEvenStats, isLoading, includeTotalTrades = false }) {
    const chartData = convertTradeTypesStatsToChartData(reentryStats, breakEvenStats, includeTotalTrades);

    return (
      <TradeStatsBarCard
        title="Trade Types Statistics"
        description="Distribution of trades based on trade type"
        data={chartData}
        mode="winsLossesWinRate"
        isLoading={isLoading}
      />
    );
  }
);
