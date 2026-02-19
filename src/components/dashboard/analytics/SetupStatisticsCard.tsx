'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateSetupStats as calculateSetupStatsUtil } from '@/utils/calculateCategoryStats';
import type { SetupStats } from '@/types/dashboard';

export interface SetupStatisticsCardProps {
  setupStats: SetupStats[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate setup statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of setup statistics
 */
export function calculateSetupStats(trades: Trade[]): SetupStats[] {
  return calculateSetupStatsUtil(trades);
}

/**
 * Convert setup stats to chart data format
 * @param setupStats - Array of setup statistics
 * @param includeTotalTrades - If true, includes totalTrades in the result (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertSetupStatsToChartData(
  setupStats: SetupStats[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  return setupStats.map((stat) => {
    const statWithTotal = stat as any;
    const baseData: TradeStatDatum = {
      category: `${stat.setup}`,
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
}

/**
 * Convert filtered setup stats to chart data format (includes totalTrades)
 * @param setupStats - Array of setup statistics (may include total property)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertFilteredSetupStatsToChartData(setupStats: SetupStats[]): TradeStatDatum[] {
  return convertSetupStatsToChartData(setupStats, true);
}

export const SetupStatisticsCard: React.FC<SetupStatisticsCardProps> = React.memo(
  function SetupStatisticsCard({ setupStats, isLoading, includeTotalTrades = false }) {
    const chartData = convertSetupStatsToChartData(setupStats, includeTotalTrades);

    return (
      <TradeStatsBarCard
        title="Setup Statistics"
        description="Distribution of trades based on trading setup"
        data={chartData}
        mode="winsLossesWinRate"
        isLoading={isLoading}
      />
    );
  }
);
