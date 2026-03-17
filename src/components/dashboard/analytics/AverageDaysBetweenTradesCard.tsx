'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { Crown } from 'lucide-react';

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
  isPro?: boolean;
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
  function AverageDaysBetweenTradesCard({ averageDaysBetweenTrades, isPro }) {
    const effectiveValue = isPro ? averageDaysBetweenTrades : NaN;
    return (
      <StatCard
        title={
          <span className="flex items-center gap-2">
            Avg days between trades
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
              <Crown className="w-3 h-3" /> PRO
            </span>
          </span>
        }
        tooltipVariant="default"
        tooltipContent={
          <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-300">
            Average number of days between consecutive trade dates in the selected period.
          </p>
        }
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatAverageDays(effectiveValue)}
          </p>
        }
      />
    );
  }
);
