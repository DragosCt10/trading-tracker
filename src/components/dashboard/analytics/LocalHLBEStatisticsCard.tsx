'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { isLocalHighLowLiquidated } from '@/utils/calculateCategoryStats';

export interface LocalHLBEStatisticsCardProps {
  trades: Trade[];
  isLoading?: boolean;
}

/**
 * Calculate Local H/L & BE Stats from trades array
 * Returns chart data for trades that are both Local High/Low and Break Even
 * @param trades - Array of trades to compute stats from
 * @returns Array of TradeStatDatum for chart display (single item)
 */
export function getLocalHLBreakEvenChartData(trades: Trade[]): TradeStatDatum[] {
  // trades that are both Local H/L (liquidated) and Break Even
  const liquidatedBETrades = trades.filter(
    (t) => isLocalHighLowLiquidated(t.local_high_low) && t.break_even,
  );
  // All trades in this set are break-even, so wins/losses are BE wins/losses
  const beWins = liquidatedBETrades.filter(
    (t) => t.trade_outcome === 'Win',
  ).length;
  const beLosses = liquidatedBETrades.filter(
    (t) => t.trade_outcome === 'Lose',
  ).length;
  const totalTrades = liquidatedBETrades.length; // Count all trades including non-executed ones
  const executedTradesCount = beWins + beLosses;
  const winRate = executedTradesCount > 0 ? (beWins / executedTradesCount) * 100 : 0;
  const winRateWithBE = winRate; // Same as winRate since all trades are BE

  return [
    {
      category: `Local High/Low + BE`,
      wins: 0, // No regular wins since all are BE
      losses: 0, // No regular losses since all are BE
      beWins,
      beLosses,
      winRate,
      winRateWithBE,
      totalTrades,
    },
  ];
}

export const LocalHLBEStatisticsCard: React.FC<LocalHLBEStatisticsCardProps> = React.memo(
  function LocalHLBEStatisticsCard({ trades, isLoading }) {
    const chartData = getLocalHLBreakEvenChartData(trades);

    return (
      <TradeStatsBarCard
        title="Local H/L & BE Stats"
        description="Analysis of trades marked as both Local High/Low and Break Even"
        data={chartData}
        mode="winsLossesWinRate"
        heightClassName="h-80"
        isLoading={isLoading}
      />
    );
  }
);
