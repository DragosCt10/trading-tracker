'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateDirectionStats as calculateDirectionStatsUtil } from '@/utils/calculateCategoryStats';
import type { DirectionStats } from '@/types/dashboard';

export interface DirectionStatisticsCardProps {
  directionStats: DirectionStats[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate direction statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of direction statistics
 */
export function calculateDirectionStats(trades: Trade[]): DirectionStats[] {
  return calculateDirectionStatsUtil(trades);
}

/**
 * Convert direction stats to chart data format
 * @param directionStats - Array of direction statistics
 * @param includeTotalTrades - If true, includes totalTrades and calculates percentage from total (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertDirectionStatsToChartData(
  directionStats: DirectionStats[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  // Calculate total trades for percentage calculation
  const totalDirectionTrades = includeTotalTrades
    ? directionStats.reduce((sum, stat) => {
        const statWithTotal = stat as any;
        const total = statWithTotal.total !== undefined 
          ? statWithTotal.total 
          : ((stat.wins ?? 0) + (stat.losses ?? 0) + (stat.beWins ?? 0) + (stat.beLosses ?? 0));
        return sum + total;
      }, 0)
    : directionStats.reduce(
        (sum, stat) => sum + (stat.wins ?? 0) + (stat.losses ?? 0),
        0
      );

  return directionStats.map((stat) => {
    const statWithTotal = stat as any;
    const directionTotal = includeTotalTrades
      ? (statWithTotal.total !== undefined 
          ? statWithTotal.total 
          : ((stat.wins ?? 0) + (stat.losses ?? 0) + (stat.beWins ?? 0) + (stat.beLosses ?? 0)))
      : ((stat.wins ?? 0) + (stat.losses ?? 0));
    
    const percentage =
      totalDirectionTrades > 0
        ? ((directionTotal / totalDirectionTrades) * 100).toFixed(1)
        : "0.0";

    const baseData: TradeStatDatum = {
      category: `${stat.direction} - ${percentage}%`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
    };

    if (includeTotalTrades) {
      baseData.totalTrades = directionTotal;
    }

    return baseData;
  });
}

/**
 * Convert filtered direction stats to chart data format (includes totalTrades and percentage)
 * @param directionStats - Array of direction statistics (may include total property)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertFilteredDirectionStatsToChartData(directionStats: DirectionStats[]): TradeStatDatum[] {
  return convertDirectionStatsToChartData(directionStats, true);
}

export const DirectionStatisticsCard: React.FC<DirectionStatisticsCardProps> = React.memo(
  function DirectionStatisticsCard({ directionStats, isLoading, includeTotalTrades = false }) {
    const chartData = convertDirectionStatsToChartData(directionStats, includeTotalTrades);

    return (
      <TradeStatsBarCard
        title="Long/Short Statistics"
        description="Distribution of trades based on direction"
        data={chartData}
        mode="winsLossesWinRate"
        isLoading={isLoading}
      />
    );
  }
);
