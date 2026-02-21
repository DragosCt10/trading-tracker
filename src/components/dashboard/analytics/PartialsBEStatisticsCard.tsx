'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';

export interface PartialsBEStatisticsCardProps {
  trades: Trade[];
  isLoading?: boolean;
}

/**
 * Calculate Partials &  BE Stats from trades array
 * Returns chart data for trades that are both Break Even and have Partials Taken
 * @param trades - Array of trades to compute stats from
 * @returns Array of TradeStatDatum for chart display (single item)
 */
export function getPartialsBEChartData(trades: Trade[]): TradeStatDatum[] {
  // Trades that are both Break Even and have Partials Taken
  const partialsBETrades = trades.filter(
    (t) => t.break_even && t.partials_taken
  );

  const totalPartialsBE = partialsBETrades.length; // Count all trades including non-executed ones

  // All trades in this set are break-even, so wins/losses are BE wins/losses
  const beWins = partialsBETrades.filter((t) => t.trade_outcome === 'Win').length;
  const beLosses = partialsBETrades.filter((t) => t.trade_outcome === 'Lose').length;
  const executedTradesCount = beWins + beLosses;
  const winRate = executedTradesCount > 0 ? (beWins / executedTradesCount) * 100 : 0;
  const winRateWithBE = winRate; // Same as winRate since all trades are BE

  return [
    {
      category: `Partials + BE`,
      wins: 0, // No regular wins since all are BE
      losses: 0, // No regular losses since all are BE
      beWins,
      beLosses,
      winRate,
      winRateWithBE,
      totalTrades: totalPartialsBE,
    },
  ];
}

export const PartialsBEStatisticsCard: React.FC<PartialsBEStatisticsCardProps> = React.memo(
  function PartialsBEStatisticsCard({ trades, isLoading }) {
    const chartData = getPartialsBEChartData(trades);

    return (
      <TradeStatsBarCard
        title="Partials &  BE Stats"
        description="Analysis of trades marked as both Break Even and Partials Taken"
        data={chartData}
        mode="winsLossesWinRate"
        heightClassName="h-80"
        isLoading={isLoading}
      />
    );
  }
);
