'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

/**
 * Get non-executed trades count with fallback logic
 * Prioritizes initial prop value, then falls back to hook value
 */
export function getNonExecutedTradesCount(
  initialCount?: number | null,
  hookCount?: number | null
): number {
  if (typeof initialCount === 'number') {
    return initialCount;
  }
  if (typeof hookCount === 'number') {
    return hookCount;
  }
  return 0;
}

interface NonExecutedTradesStatCardProps {
  initialNonExecutedTotalTradesCount?: number | null;
  nonExecutedTotalTradesCount?: number | null;
}

export const NonExecutedTradesStatCard: React.FC<NonExecutedTradesStatCardProps> = React.memo(
  function NonExecutedTradesStatCard({
    initialNonExecutedTotalTradesCount,
    nonExecutedTotalTradesCount,
  }) {
    const count = getNonExecutedTradesCount(
      initialNonExecutedTotalTradesCount,
      nonExecutedTotalTradesCount
    );

    return (
      <StatCard
        title="Non-Executed Trades"
        tooltipContent={
          <div className="space-y-2 text-slate-500">
            <div className="font-semibold text-slate-900">
              Non-Executed Trades
            </div>
            <p>
              Total number of trades that were planned but not executed, including
              break-even (BE) trades, in the selected year. This helps track missed
              or skipped opportunities.
            </p>
          </div>
        }
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {count}
            <span className="text-slate-500 text-sm ml-1">(incl. BE)</span>
          </p>
        }
      />
    );
  }
);
