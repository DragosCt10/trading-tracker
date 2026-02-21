'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';

/* ---------------------------------------------------------
 * Types
 * ------------------------------------------------------ */

interface MonthlyStatsForCard {
  monthlyData?: {
    [month: string]: {
      wins: number;
      losses: number;
      beWins: number;
      beLosses: number;
      winRate: number;
      winRateWithBE: number;
    };
  };
}

interface AverageDaysBetweenTradesCardProps {
  averageDaysBetweenTrades: number;
  viewMode?: 'yearly' | 'dateRange';
  monthlyStats?: MonthlyStatsForCard;
}

/**
 * Format average days for display
 */
function formatAverageDays(value: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(1);
}

export const AverageDaysBetweenTradesCard: React.FC<AverageDaysBetweenTradesCardProps> = React.memo(
  function AverageDaysBetweenTradesCard({ averageDaysBetweenTrades }) {
    return (
      <StatCard
        title="Avg days between trades"
        tooltipContent={
          <p className="text-xs sm:text-sm text-slate-500">
            Average number of days between consecutive trade dates in the selected period.
          </p>
        }
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatAverageDays(averageDaysBetweenTrades)}
          </p>
        }
      />
    );
  }
);
