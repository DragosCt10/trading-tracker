'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateLocalHLStats as calculateLocalHLStatsUtil } from '@/utils/calculateCategoryStats';
import type { LocalHLStats } from '@/types/dashboard';

export interface LocalHLStatisticsCardProps {
  localHLStats: LocalHLStats;
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate local H/L statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @returns LocalHLStats object with lichidat and nelichidat stats
 */
export function calculateLocalHLStats(trades: Trade[]): LocalHLStats {
  return calculateLocalHLStatsUtil(trades);
}

/**
 * Convert local H/L stats to chart data format
 * @param localHLStats - LocalHLStats object with lichidat and nelichidat stats
 * @param includeTotalTrades - If true, includes totalTrades in the result (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertLocalHLStatsToChartData(
  localHLStats: LocalHLStats,
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  const lichidatData: TradeStatDatum = {
    category: 'Lichidat',
    wins: localHLStats.lichidat.wins,
    losses: localHLStats.lichidat.losses,
    beWins: localHLStats.lichidat.winsWithBE,
    beLosses: localHLStats.lichidat.lossesWithBE,
    winRate: localHLStats.lichidat.winRate,
    winRateWithBE: localHLStats.lichidat.winRateWithBE,
  };

  const nelichidatData: TradeStatDatum = {
    category: 'Nelichidat',
    wins: localHLStats.nelichidat.wins,
    losses: localHLStats.nelichidat.losses,
    beWins: localHLStats.nelichidat.winsWithBE,
    beLosses: localHLStats.nelichidat.lossesWithBE,
    winRate: localHLStats.nelichidat.winRate,
    winRateWithBE: localHLStats.nelichidat.winRateWithBE,
  };

  if (includeTotalTrades) {
    const lichidatWithTotal = localHLStats.lichidat as any;
    const nelichidatWithTotal = localHLStats.nelichidat as any;
    
    lichidatData.totalTrades = lichidatWithTotal.total !== undefined
      ? lichidatWithTotal.total
      : (localHLStats.lichidat.wins + localHLStats.lichidat.losses + localHLStats.lichidat.winsWithBE + localHLStats.lichidat.lossesWithBE);
    
    nelichidatData.totalTrades = nelichidatWithTotal.total !== undefined
      ? nelichidatWithTotal.total
      : (localHLStats.nelichidat.wins + localHLStats.nelichidat.losses + localHLStats.nelichidat.winsWithBE + localHLStats.nelichidat.lossesWithBE);
  }

  return [lichidatData, nelichidatData];
}

/**
 * Convert filtered local H/L stats to chart data format (includes totalTrades)
 * @param localHLStats - LocalHLStats object (may include total property)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertFilteredLocalHLStatsToChartData(localHLStats: LocalHLStats): TradeStatDatum[] {
  return convertLocalHLStatsToChartData(localHLStats, true);
}

export const LocalHLStatisticsCard: React.FC<LocalHLStatisticsCardProps> = React.memo(
  function LocalHLStatisticsCard({ localHLStats, isLoading, includeTotalTrades = false }) {
    const chartData = convertLocalHLStatsToChartData(localHLStats, includeTotalTrades);

    return (
      <TradeStatsBarCard
        title="Local H/L Analysis"
        description="Distribution of trades based on local high/low status"
        data={chartData}
        mode="winsLossesWinRate"
        isLoading={isLoading}
      />
    );
  }
);
