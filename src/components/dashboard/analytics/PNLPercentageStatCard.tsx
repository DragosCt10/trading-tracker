'use client';

import React, { useMemo } from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { cn, formatPercent } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { calculateAveragePnLPercentage } from '@/utils/analyticsCalculations';

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
    return `${formatPercent(averagePnLPercentage)}%`;
  }
  return '—';
}

interface PNLPercentageStatCardProps {
  tradesToUse: Trade[];
  accountBalance: number | null | undefined;
  /** When set, display this value to match AccountOverviewCard YTD % (total profit / balance * 100). */
  pnlPercent?: number | null;
  hydrated?: boolean;
}

export const PNLPercentageStatCard: React.FC<PNLPercentageStatCardProps> = React.memo(
  function PNLPercentageStatCard({ tradesToUse, accountBalance, pnlPercent, hydrated = true }) {
    // Use overview YTD % when provided (matches AccountOverviewCard); otherwise average P&L % from trades
    const averagePnLPercentage = useMemo(() => {
      if (typeof pnlPercent === 'number') return pnlPercent;
      return calculateAveragePnLPercentage(tradesToUse, accountBalance);
    }, [pnlPercent, tradesToUse, accountBalance]);

    return (
      <StatCard
        title="P&L %"
        tooltipVariant="default"
        tooltipContent={
          <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-300">
            {typeof pnlPercent === 'number' ? 'Return over starting balance (matches Account overview).' : 'Average P&amp;L % over starting balance.'}
          </p>
        }
        value={
          <p className={cn('text-2xl font-bold', hydrated ? getPNLPercentageColorClass(averagePnLPercentage) : 'text-slate-900 dark:text-slate-100')}>
            {hydrated ? formatPNLPercentageValue(averagePnLPercentage) : '—'}
          </p>
        }
      />
    );
  }
);
