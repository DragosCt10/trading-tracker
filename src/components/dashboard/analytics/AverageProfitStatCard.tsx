'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { cn } from '@/lib/utils';

/**
 * Get average profit color class based on the value
 */
export function getAverageProfitColorClass(averageProfit: number): string {
  return averageProfit >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
}

/**
 * Format average profit value for display
 */
export function formatAverageProfitValue(
  averageProfit: number,
  currencySymbol: string,
  hydrated: boolean
): string {
  if (!hydrated) {
    return '—';
  }
  return `${currencySymbol}${averageProfit.toFixed(2)}`;
}

interface AverageProfitStatCardProps {
  averageProfit: number;
  currencySymbol: string;
  hydrated: boolean;
}

export const AverageProfitStatCard: React.FC<AverageProfitStatCardProps> = React.memo(
  function AverageProfitStatCard({ averageProfit, currencySymbol, hydrated }) {
    const colorClass = hydrated ? getAverageProfitColorClass(averageProfit) : 'text-slate-900 dark:text-slate-100';
    
    return (
      <StatCard
        title="Average Profit"
        value={
          <p className={cn('text-2xl font-bold', colorClass)}>
            {formatAverageProfitValue(averageProfit, currencySymbol, hydrated)}
          </p>
        }
      />
    );
  }
);
