'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateMssStats as calculateMssStatsUtil } from '@/utils/calculateCategoryStats';
import type { MssStats, BaseStats } from '@/types/dashboard';

// Type that matches both MssStats and filtered stats (which may not have mss property)
type MssStatsLike = BaseStats & {
  mss?: string;
  total?: number;
};

export interface MSSStatisticsCardProps {
  mssStats: MssStatsLike[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate MSS statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of MSS statistics
 */
export function calculateMssStats(trades: Trade[]): MssStats[] {
  return calculateMssStatsUtil(trades);
}

/**
 * Convert MSS stats to chart data format
 * @param mssStats - Array of MSS statistics
 * @param includeTotalTrades - If true, includes totalTrades in the result (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertMssStatsToChartData(
  mssStats: MssStatsLike[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  return mssStats.map((stat) => {
    const statWithTotal = stat as any;
    const totalTrades = includeTotalTrades
      ? (statWithTotal.total !== undefined
          ? statWithTotal.total
          : (stat.wins + stat.losses + stat.beWins + stat.beLosses))
      : (stat.wins + stat.losses);

    return {
      category: stat.mss,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades,
    };
  });
}

/**
 * Convert filtered MSS stats to chart data format (includes totalTrades)
 * @param mssStats - Array of MSS statistics (may include total property)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertFilteredMssStatsToChartData(mssStats: MssStatsLike[]): TradeStatDatum[] {
  return convertMssStatsToChartData(mssStats, true);
}

export const MSSStatisticsCard: React.FC<MSSStatisticsCardProps> = React.memo(
  function MSSStatisticsCard({ mssStats, isLoading, includeTotalTrades = false }) {
    const chartData = convertMssStatsToChartData(mssStats, includeTotalTrades);

    return (
      <TradeStatsBarCard
        title="MSS Statistics"
        description="Distribution of trades based on MSS"
        data={chartData}
        mode="winsLossesWinRate"
        heightClassName="h-72"
        isLoading={isLoading}
      />
    );
  }
);
