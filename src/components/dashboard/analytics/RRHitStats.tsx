'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatDatum, TradeStatsBarCard } from './TradesStatsBarCard';

export interface RRHitStatsProps {
  trades: Trade[];
  isLoading?: boolean;
}

/**
 * Calculate RR Hit statistics from trades array
 * Groups trades by market and counts only losing trades that hit RR1.4
 * @param trades - Array of trades to compute stats from
 * @returns Array of TradeStatDatum for chart display
 */
export function calculateRRHitStats(trades: Trade[]): TradeStatDatum[] {
  // Group trades by market and count only losing trades that hit RR1.4
  const marketStats = trades.reduce<Record<string, number>>((acc, trade) => {
    if (trade.trade_outcome === 'Lose' && trade.rr_hit_1_4) {
      acc[trade.market] = (acc[trade.market] || 0) + 1;
    }
    return acc;
  }, {});

  // Convert to array and sort by count
  const stats = Object.entries(marketStats)
    .map(([market, count]) => ({ market, count }))
    .sort((a, b) => b.count - a.count);

  return stats.map(({ market, count }) => ({
    category: `${market} (${count})`,
    value: count, // single numeric value per market
  }));
}

export const RRHitStats: React.FC<RRHitStatsProps> = React.memo(
  function RRHitStats({ trades, isLoading }) {
    const chartData = calculateRRHitStats(trades);

    return (
      <TradeStatsBarCard
        title="Lose Trades that Hit 1.4RR"
        description="Only losing trades that hit the 1.4 Risk/Reward ratio target, grouped by market."
        data={chartData}
        mode="singleValue"
        valueKey="value"
        valueLabel="Setups:"
        heightClassName="h-80"
        isLoading={isLoading}
      />
    );
  }
);
