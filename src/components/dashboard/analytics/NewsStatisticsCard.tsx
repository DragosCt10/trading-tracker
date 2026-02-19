'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateNewsStats as calculateNewsStatsUtil } from '@/utils/calculateCategoryStats';
import type { NewsStats, BaseStats } from '@/types/dashboard';

// Type that matches both NewsStats and filtered stats (which may not have news property)
type NewsStatsLike = BaseStats & {
  news?: string;
  total?: number;
};

export interface NewsStatisticsCardProps {
  newsStats: NewsStatsLike[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate news statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of news statistics
 */
export function calculateNewsStats(trades: Trade[]): NewsStats[] {
  return calculateNewsStatsUtil(trades);
}

/**
 * Convert news stats to chart data format
 * @param newsStats - Array of news statistics
 * @param includeTotalTrades - If true, includes totalTrades in the result (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertNewsStatsToChartData(
  newsStats: NewsStatsLike[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  return newsStats.map((stat) => {
    const statWithTotal = stat as any;
    const totalTrades = includeTotalTrades
      ? (statWithTotal.total !== undefined
          ? statWithTotal.total
          : (stat.wins + stat.losses + stat.beWins + stat.beLosses))
      : (stat.wins + stat.losses);

    return {
      category: `${stat.news}`,
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
 * Convert filtered news stats to chart data format (includes totalTrades)
 * @param newsStats - Array of news statistics (may include total property)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertFilteredNewsStatsToChartData(newsStats: NewsStatsLike[]): TradeStatDatum[] {
  return convertNewsStatsToChartData(newsStats, true);
}

export const NewsStatisticsCard: React.FC<NewsStatisticsCardProps> = React.memo(
  function NewsStatisticsCard({ newsStats, isLoading, includeTotalTrades = false }) {
    const chartData = convertNewsStatsToChartData(newsStats, includeTotalTrades);

    return (
      <TradeStatsBarCard
        title="News Statistics"
        description="Distribution of trades based on news"
        data={chartData}
        mode="winsLossesWinRate"
        heightClassName="h-72"
        isLoading={isLoading}
      />
    );
  }
);
