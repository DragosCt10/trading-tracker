'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';

/**
 * Format BE wins count for display
 */
export function formatBEWinsValue(beWins: number): string {
  return `(${beWins} BE)`;
}

interface TotalWinsStatCardProps {
  totalWins: number;
  beWins: number;
}

export const TotalWinsStatCard: React.FC<TotalWinsStatCardProps> = React.memo(
  function TotalWinsStatCard({ totalWins, beWins }) {
    return (
      <StatCard
        title="Total Wins"
        value={
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalWins}
            {beWins > 0 && (
              <span className="text-sm font-medium text-slate-500 ml-1">
                {formatBEWinsValue(beWins)}
              </span>
            )}
          </p>
        }
      />
    );
  }
);
