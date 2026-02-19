'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';

/**
 * Format BE losses count for display
 */
export function formatBELossesValue(beLosses: number): string {
  return `(${beLosses} BE)`;
}

interface TotalLossesStatCardProps {
  totalLosses: number;
  beLosses: number;
}

export const TotalLossesStatCard: React.FC<TotalLossesStatCardProps> = React.memo(
  function TotalLossesStatCard({ totalLosses, beLosses }) {
    return (
      <StatCard
        title="Total Losses"
        value={
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {totalLosses}
            {beLosses > 0 && (
              <span className="text-sm font-medium text-slate-500 ml-1">
                {formatBELossesValue(beLosses)}
              </span>
            )}
          </p>
        }
      />
    );
  }
);
