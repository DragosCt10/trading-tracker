'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

/**
 * Get P&L percentage color class based on the value
 */
export function getPNLPercentageColorClass(averagePnLPercentage: number | null | undefined): string {
  if (typeof averagePnLPercentage !== 'number') {
    return 'text-slate-900 dark:text-slate-100';
  }
  if (averagePnLPercentage > 0) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (averagePnLPercentage < 0) {
    return 'text-rose-600 dark:text-rose-400';
  }
  return 'text-slate-900 dark:text-slate-100';
}

/**
 * Format P&L percentage value for display
 */
export function formatPNLPercentageValue(averagePnLPercentage: number | null | undefined): string {
  if (typeof averagePnLPercentage === 'number') {
    return `${averagePnLPercentage.toFixed(2)}%`;
  }
  return '—';
}

interface PNLPercentageStatCardProps {
  averagePnLPercentage: number | null | undefined;
}

export const PNLPercentageStatCard: React.FC<PNLPercentageStatCardProps> = React.memo(
  function PNLPercentageStatCard({ averagePnLPercentage }) {
    return (
      <StatCard
        title="P&L %"
        tooltipContent={
          <p className="text-xs sm:text-sm text-slate-500">
            Average P&amp;L % over starting balance.
          </p>
        }
        value={
          <p className={cn('text-2xl font-bold', getPNLPercentageColorClass(averagePnLPercentage))}>
            {formatPNLPercentageValue(averagePnLPercentage)}
          </p>
        }
      />
    );
  }
);
