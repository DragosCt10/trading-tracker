'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { getAverageDisplacementPerMarket as getAverageDisplacementPerMarketUtil } from '@/utils/getAverageDisplacementPerMarket';

export interface AverageDisplacementSizeCardProps {
  trades: Trade[];
  isLoading?: boolean;
}

/**
 * Calculate average displacement size per market from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of TradeStatDatum for chart display
 */
export function getAverageDisplacementPerMarket(trades: Trade[]): TradeStatDatum[] {
  return getAverageDisplacementPerMarketUtil(trades);
}

export const AverageDisplacementSizeCard: React.FC<AverageDisplacementSizeCardProps> = React.memo(
  function AverageDisplacementSizeCard({ trades, isLoading }) {
    const chartData = getAverageDisplacementPerMarket(trades);

    return (
      <TradeStatsBarCard
        title="Average Displacement Size (Points)"
        description="Average displacement size (points) for each market."
        data={chartData}
        mode="singleValue"
        isLoading={isLoading}
        valueKey="value"
      />
    );
  }
);
