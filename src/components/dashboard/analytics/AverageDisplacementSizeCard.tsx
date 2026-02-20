'use client';

import React from 'react';
import { Trade } from '@/types/trade';
import { TradeStatsBarCard, TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { getAverageDisplacementPerMarket } from '@/utils/getAverageDisplacementPerMarket';

export interface AverageDisplacementSizeCardProps {
  trades: Trade[];
  isLoading?: boolean;
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
