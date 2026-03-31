'use client';

import React, { useMemo } from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { Trade } from '@/types/trade';
import { calculateRRStats } from '@/utils/calculateRMultiple';

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

/**
 * Format RR Multiple value for display
 */
export function formatRRMultipleValue(multipleR: number | null | undefined): string {
  if (typeof multipleR === 'number') {
    return multipleR.toFixed(2);
  }
  return '—';
}

interface RRMultipleStatCardProps {
  tradesToUse: Trade[];
}

export const RRMultipleStatCard: React.FC<RRMultipleStatCardProps> = React.memo(
  function RRMultipleStatCard({ tradesToUse }) {
    const multipleR = useMemo(() => {
      return calculateRRStats(tradesToUse);
    }, [tradesToUse]);

    return (
      <StatCard
        title="RR Multiple"
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatRRMultipleValue(multipleR)}
          </p>
        }
      />
    );
  }
);
