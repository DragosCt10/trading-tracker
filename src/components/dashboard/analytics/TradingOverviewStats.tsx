'use client';

import { useMemo } from 'react';
import { Trade } from '@/types/trade';
import { StatCard } from './StatCard';
import { TotalTradesStatCard } from './TotalTradesStatCard';
import { WinRateStatCard } from './WinRateStatCard';
import { TotalProfitStatCard } from './TotalProfitStatCard';
import { AverageProfitStatCard } from './AverageProfitStatCard';
import { TotalWinsStatCard } from './TotalWinsStatCard';
import { TotalLossesStatCard } from './TotalLossesStatCard';
import { calculateTradingOverviewStats } from '@/utils/calculateTradingOverviewStats';

interface TradingOverviewStatsProps {
  trades: Trade[];
  currencySymbol: string;
  hydrated: boolean;
}

export function TradingOverviewStats({ trades, currencySymbol, hydrated }: TradingOverviewStatsProps) {
  const stats = useMemo(() => calculateTradingOverviewStats(trades), [trades]);

  const streakColorValue = stats.currentStreak > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : stats.currentStreak < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-900 dark:text-slate-100';

  return (
    <>
      {/* Trading Overview Category */}
      <div className="col-span-full mt-10 mb-4">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Trading Overview</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Core trading statistics and performance metrics</p>
      </div>

      <TotalTradesStatCard totalTrades={stats.totalTrades} />

      <WinRateStatCard winRate={stats.winRate} winRateWithBE={stats.winRateWithBE} />

      <TotalProfitStatCard
        totalProfit={stats.totalProfit}
        currencySymbol={currencySymbol}
        hydrated={hydrated}
      />

      <AverageProfitStatCard
        averageProfit={stats.averageProfit}
        currencySymbol={currencySymbol}
        hydrated={hydrated}
      />

      <TotalWinsStatCard totalWins={stats.totalWins} beWins={stats.beWins} />

      <TotalLossesStatCard totalLosses={stats.totalLosses} beLosses={stats.beLosses} />

      <StatCard
        title="Current Streak"
        tooltipContent={
          <p className="text-xs sm:text-sm text-slate-500">
            Current winning (positive) or losing (negative) streak.
          </p>
        }
        value={
          <p className={`text-2xl font-bold ${streakColorValue}`}>
            {stats.currentStreak > 0 ? '+' : ''}
            {stats.currentStreak}
          </p>
        }
      />

      <StatCard
        title="Best Streaks"
        tooltipContent={
          <p className="text-xs sm:text-sm text-slate-500">
            Best winning and losing streaks in the selected period.
          </p>
        }
        value={
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-xs text-slate-500">Winning</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                +{stats.maxWinningStreak}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Losing</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                -{stats.maxLosingStreak}
              </p>
            </div>
          </div>
        }
      />

      <StatCard
        title="Average Days Between Trades"
        tooltipContent={
          <p className="text-xs sm:text-sm text-slate-800">
            Average number of days between your trades in the selected period.
          </p>
        }
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {stats.averageDaysBetweenTrades.toFixed(1)} <small className="text-sm text-slate-500">days</small>
          </p>
        }
      />
    </>
  );
}
