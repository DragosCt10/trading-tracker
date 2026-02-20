'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateLiquidityStats as calculateLiquidityStatsUtil } from '@/utils/calculateCategoryStats';
import type { LiquidityStats } from '@/types/dashboard';

export interface LiquidityStatisticsCardProps {
  liquidityStats: LiquidityStats[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate liquidity statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of liquidity statistics
 */
export function calculateLiquidityStats(trades: Trade[]): LiquidityStats[] {
  return calculateLiquidityStatsUtil(trades);
}

/**
 * Convert liquidity stats to chart data format
 * @param liquidityStats - Array of liquidity statistics
 * @param includeTotalTrades - If true, includes totalTrades in the result (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertLiquidityStatsToChartData(
  liquidityStats: LiquidityStats[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  return liquidityStats.map((stat) => {
    const baseData: TradeStatDatum = {
      category: `${stat.liquidity}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
    };

    // Use total from stats which includes all trades (including non-executed)
    // This ensures the count shown in parentheses matches the actual number of trades in tradesToUse
    baseData.totalTrades = stat.total ?? (stat.wins + stat.losses);

    return baseData;
  });
}

/**
 * Convert filtered liquidity stats to chart data format (includes totalTrades)
 * @param liquidityStats - Array of liquidity statistics (may include total property)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertFilteredLiquidityStatsToChartData(liquidityStats: LiquidityStats[]): TradeStatDatum[] {
  return convertLiquidityStatsToChartData(liquidityStats, true);
}

export const LiquidityStatisticsCard: React.FC<LiquidityStatisticsCardProps> = React.memo(
  function LiquidityStatisticsCard({ liquidityStats, isLoading, includeTotalTrades = false }) {
    const chartData = convertLiquidityStatsToChartData(liquidityStats, includeTotalTrades);

    return (
      <TradeStatsBarCard
        title="Liquidity Statistics"
        description="Distribution of trades based on market liquidity conditions"
        data={chartData}
        mode="winsLossesWinRate"
        isLoading={isLoading}
      />
    );
  }
);
