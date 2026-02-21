'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateSLSizeStats as calculateSLSizeStatsUtil } from '@/utils/calculateCategoryStats';
import type { SLSizeStats } from '@/types/dashboard';

export interface SLSizeStatisticsCardProps {
  slSizeStats: SLSizeStats[];
  isLoading?: boolean;
}

/**
 * Calculate Stop Loss Size Stats from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of Stop Loss Size Stats
 */
export function calculateSLSizeStats(trades: Trade[]): SLSizeStats[] {
  return calculateSLSizeStatsUtil(trades);
}

/**
 * Convert SL size stats to chart data format
 * @param slSizeStats - Array of Stop Loss Size Stats
 * @returns Array of TradeStatDatum for chart display
 */
export function convertSLSizeStatsToChartData(slSizeStats: SLSizeStats[]): TradeStatDatum[] {
  return slSizeStats.map((stat) => ({
    category: stat.market,
    value: stat.averageSlSize,
  }));
}

export const SLSizeStatisticsCard: React.FC<SLSizeStatisticsCardProps> = React.memo(
  function SLSizeStatisticsCard({ slSizeStats, isLoading }) {
    const chartData = convertSLSizeStatsToChartData(slSizeStats);

    return (
      <TradeStatsBarCard
        title="Stop Loss Size Stats"
        description="Distribution of trades based on SL size"
        data={chartData}
        mode="singleValue"
        valueKey="value"
        isLoading={isLoading}
      />
    );
  }
);
