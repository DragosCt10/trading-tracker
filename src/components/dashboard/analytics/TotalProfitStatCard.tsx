'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { cn } from '@/lib/utils';

/**
 * Get total profit color class based on the value
 */
export function getTotalProfitColorClass(totalProfit: number): string {
  return totalProfit >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
}

/**
 * Format total profit value for display
 */
export function formatTotalProfitValue(
  totalProfit: number,
  currencySymbol: string,
  hydrated: boolean
): string {
  if (!hydrated) {
    return '—';
  }
  return `${currencySymbol}${totalProfit.toFixed(2)}`;
}

interface TotalProfitStatCardProps {
  totalProfit: number;
  currencySymbol: string;
  hydrated: boolean;
}

export const TotalProfitStatCard: React.FC<TotalProfitStatCardProps> = React.memo(
  function TotalProfitStatCard({ totalProfit, currencySymbol, hydrated }) {
    const colorClass = hydrated ? getTotalProfitColorClass(totalProfit) : 'text-slate-900 dark:text-slate-100';
    
    return (
      <StatCard
        title="Total Profit"
        value={
          <p className={cn('text-2xl font-bold', colorClass)}>
            {formatTotalProfitValue(totalProfit, currencySymbol, hydrated)}
          </p>
        }
      />
    );
  }
);
