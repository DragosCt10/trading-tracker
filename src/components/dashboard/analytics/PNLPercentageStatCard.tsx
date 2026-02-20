'use client';

import React, { useMemo } from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { cn } from '@/lib/utils';
import { Trade } from '@/types/trade';

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
  tradesToUse: Trade[];
  accountBalance: number | null | undefined;
}

export const PNLPercentageStatCard: React.FC<PNLPercentageStatCardProps> = React.memo(
  function PNLPercentageStatCard({ tradesToUse, accountBalance }) {
    // Calculate average P&L percentage from trades
    const averagePnLPercentage = useMemo(() => {
      // Check if all trades are non-executed (when execution filter is "nonExecuted")
      const allTradesAreNonExecuted = tradesToUse.length > 0 && tradesToUse.every(t => t.executed === false);
      // Use tradesToUse directly if all are non-executed, otherwise filter to executed trades
      const tradesForProfit = allTradesAreNonExecuted 
        ? tradesToUse 
        : tradesToUse.filter(t => t.executed === true);
      const totalProfit = tradesForProfit.reduce((sum, t) => sum + (t.calculated_profit || 0), 0);
      const balance = accountBalance || 1;
      return balance > 0 ? (totalProfit / balance) * 100 : 0;
    }, [tradesToUse, accountBalance]);

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
