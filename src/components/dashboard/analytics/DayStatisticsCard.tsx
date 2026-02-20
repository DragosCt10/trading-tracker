'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateDayStats as calculateDayStatsUtil } from '@/utils/calculateCategoryStats';
import type { DayStats, BaseStats } from '@/types/dashboard';

// Type that matches both DayStats and filtered stats (which may not have day property)
type DayStatsLike = BaseStats & {
  day?: string;
  total?: number;
};

export interface DayStatisticsCardProps {
  dayStats: DayStatsLike[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate day statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of day statistics
 */
export function calculateDayStats(trades: Trade[]): DayStats[] {
  return calculateDayStatsUtil(trades);
}

/**
 * Convert day stats to chart data format
 * @param dayStats - Array of day statistics
 * @param includeTotalTrades - If true, includes totalTrades in the result (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertDayStatsToChartData(
  dayStats: DayStatsLike[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  return dayStats.map((stat) => {
    const statWithTotal = stat as any;
    // Always calculate from executed trades only, not stat.total which includes non-executed trades
    const totalTrades = includeTotalTrades
      ? (stat.wins + stat.losses + stat.beWins + stat.beLosses)
      : (stat.wins + stat.losses);

    return {
      category: `${stat.day}`,
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
 * Convert filtered day stats to chart data format (includes totalTrades)
 * @param dayStats - Array of day statistics (may include total property)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertFilteredDayStatsToChartData(dayStats: DayStatsLike[]): TradeStatDatum[] {
  return convertDayStatsToChartData(dayStats, true);
}

export const DayStatisticsCard: React.FC<DayStatisticsCardProps> = React.memo(
  function DayStatisticsCard({ dayStats, isLoading, includeTotalTrades = false }) {
    const chartData = convertDayStatsToChartData(dayStats, includeTotalTrades);

    return (
      <TradeStatsBarCard
        title="Day Statistics"
        description="Distribution of trades based on day of the week"
        data={chartData}
        mode="winsLossesWinRate"
        heightClassName="h-72"
        isLoading={isLoading}
      />
    );
  }
);
