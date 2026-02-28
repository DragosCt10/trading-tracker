'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';

/**
 * Format win rate value for display
 */
export function formatWinRateValue(winRate: number): string {
  return `${winRate.toFixed(2)}%`;
}

/**
 * Format win rate with BE value for display
 */
export function formatWinRateWithBEValue(winRateWithBE: number): string {
  return `(${winRateWithBE.toFixed(2)}% w/ BE)`;
}

interface WinRateStatCardProps {
  winRate: number;
  winRateWithBE: number;
  /** When false, show placeholder to avoid server/client hydration mismatch. */
  hydrated?: boolean;
}

export const WinRateStatCard: React.FC<WinRateStatCardProps> = React.memo(
  function WinRateStatCard({ winRate, winRateWithBE, hydrated = true }) {
    return (
      <StatCard
        title="Win Rate"
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100" suppressHydrationWarning>
            {hydrated ? formatWinRateValue(winRate) : '—'}
            {hydrated && (
              <span className="text-slate-500 text-sm ml-1">
                {formatWinRateWithBEValue(winRateWithBE)}
              </span>
            )}
          </p>
        }
      />
    );
  }
);
