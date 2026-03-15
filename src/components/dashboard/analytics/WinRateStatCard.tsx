'use client';

import React from 'react';
import { formatPercent } from '@/lib/utils';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { useBECalc } from '@/contexts/BECalcContext';

interface WinRateStatCardProps {
  winRate: number;
  winRateWithBE: number;
  /** When false, show placeholder to avoid server/client hydration mismatch. */
  hydrated?: boolean;
}

export const WinRateStatCard: React.FC<WinRateStatCardProps> = React.memo(
  function WinRateStatCard({ winRate, winRateWithBE, hydrated = true }) {
    const { beCalcEnabled } = useBECalc();
    return (
      <StatCard
        title="Win Rate"
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100" suppressHydrationWarning>
            {hydrated ? `${formatPercent(beCalcEnabled ? winRateWithBE : winRate)}%` : '—'}
          </p>
        }
      />
    );
  }
);
