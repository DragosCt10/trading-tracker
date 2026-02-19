'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

interface MonthlyStatsData {
  [month: string]: {
    wins: number;
    losses: number;
    beWins: number;
    beLosses: number;
    winRate: number;
    winRateWithBE: number;
  };
}

interface MonthlyStats {
  monthlyData?: MonthlyStatsData;
}

/**
 * Calculate average monthly trades from monthly stats
 * Includes all trades: wins, losses, break-even wins, and break-even losses
 */
export function calculateAverageMonthlyTrades(monthlyStats: MonthlyStats): number {
  if (!monthlyStats.monthlyData) {
    return 0;
  }

  const totalTrades = Object.values(monthlyStats.monthlyData).reduce(
    (sum, month) =>
      sum +
      month.wins +
      month.losses +
      month.beWins +
      month.beLosses,
    0
  );
  const monthsCount = Object.keys(monthlyStats.monthlyData).length;
  const avg = monthsCount > 0 ? totalTrades / monthsCount : 0;
  return isNaN(avg) || !isFinite(avg) ? 0 : avg;
}

interface AverageMonthlyTradesCardProps {
  monthlyStats: MonthlyStats;
}

export const AverageMonthlyTradesCard: React.FC<AverageMonthlyTradesCardProps> = React.memo(
  function AverageMonthlyTradesCard({ monthlyStats }) {
    const averageTrades = calculateAverageMonthlyTrades(monthlyStats);

    return (
      <StatCard
        title="Average Monthly Trades"
        tooltipContent={
          <div className="space-y-2 text-slate-500">
            <div className="font-semibold text-slate-800">
              Monthly Trading Volume
            </div>
            <p>
              Average number of trades (including break-even trades) executed per
              month in the selected year. This helps track your total trading
              frequency and consistency.
            </p>
          </div>
        }
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {averageTrades.toFixed(0)}{' '}
            <span className="text-slate-500 text-sm">(incl. BE)</span>
          </p>
        }
      />
    );
  }
);
