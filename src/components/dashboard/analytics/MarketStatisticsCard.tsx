'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateMarketStats as calculateMarketStatsUtil } from '@/utils/calculateCategoryStats';
import type { MarketStats, BaseStats } from '@/types/dashboard';

// Type that matches both MarketStats and filtered stats (which may not have all MarketStats properties)
type MarketStatsLike = BaseStats & {
  market?: string;
  total?: number;
};

export interface MarketStatisticsCardProps {
  marketStats: MarketStatsLike[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate market statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @param accountBalance - Account balance for profit calculations
 * @returns Array of market statistics
 */
export function calculateMarketStats(trades: Trade[], accountBalance: number): MarketStats[] {
  return calculateMarketStatsUtil(trades, accountBalance);
}

/**
 * Convert market stats to chart data format
 * @param marketStats - Array of market statistics
 * @param includeTotalTrades - If true, includes totalTrades in the result (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertMarketStatsToChartData(
  marketStats: MarketStatsLike[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  return marketStats.map((stat) => {
    const statWithTotal = stat as any;
    // Always calculate from executed trades only, not stat.total which includes non-executed trades
    const totalTrades = includeTotalTrades
      ? (stat.wins + stat.losses + stat.beWins + stat.beLosses)
      : (stat.wins + stat.losses);
    
    // keep behavior similar to your original chart: compute rate from wins/total
    const computedWinRate = totalTrades > 0 ? (stat.wins / totalTrades) * 100 : 0;

    const chartData: TradeStatDatum = {
      category: `${stat.market}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: computedWinRate,
      winRateWithBE: stat.winRateWithBE ?? stat.winRate,
      totalTrades,
    };

    return chartData;
  });
}

/**
 * Convert filtered market stats to chart data format (includes totalTrades)
 * @param marketStats - Array of market statistics (may include total property)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertFilteredMarketStatsToChartData(marketStats: MarketStatsLike[]): TradeStatDatum[] {
  return convertMarketStatsToChartData(marketStats, true);
}

export const MarketStatisticsCard: React.FC<MarketStatisticsCardProps> = React.memo(
  function MarketStatisticsCard({ marketStats, isLoading, includeTotalTrades = false }) {
    const chartData = convertMarketStatsToChartData(marketStats, includeTotalTrades);

    return (
      <TradeStatsBarCard
        title="Market Statistics"
        description="Distribution of trades based on market"
        data={chartData}
        mode="winsLossesWinRate"
        heightClassName="h-72"
        isLoading={isLoading}
      />
    );
  }
);
