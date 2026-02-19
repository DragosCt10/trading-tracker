'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';

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
  multipleR: number | null | undefined;
}

export const RRMultipleStatCard: React.FC<RRMultipleStatCardProps> = React.memo(
  function RRMultipleStatCard({ multipleR }) {
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
