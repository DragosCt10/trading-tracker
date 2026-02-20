'use client';

import { useMemo } from 'react';
import { Trade } from '@/types/trade';
import { StatCard } from './StatCard';
import { WinRateStatCard } from './WinRateStatCard';
import { TotalProfitStatCard } from './TotalProfitStatCard';
import { AverageProfitStatCard } from './AverageProfitStatCard';
import { StreakStatisticsCard } from './StreakStatisticsCard';
import { TotalTradesChartCard } from './TotalTradesChartCard';
import { RRMultipleStatCard } from './RRMultipleStatCard';
import { PNLPercentageStatCard } from './PNLPercentageStatCard';
import { calculateTradingOverviewStats } from '@/utils/calculateTradingOverviewStats';

interface TradingOverviewStatsProps {
  trades: Trade[];
  currencySymbol: string;
  hydrated: boolean;
  accountBalance?: number | null | undefined;
}

export function TradingOverviewStats({ trades, currencySymbol, hydrated, accountBalance }: TradingOverviewStatsProps) {
  const stats = useMemo(() => calculateTradingOverviewStats(trades), [trades]);

  return (
    <>
      {/* Trading Overview Category */}
      <div className="col-span-full mt-10 mb-4">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Trading Overview</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Core trading statistics and performance metrics</p>
      </div>

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

      {/* RR Multiple, P&L %, and Average Days Between Trades - 3 columns */}
      <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <RRMultipleStatCard tradesToUse={trades} />
        <PNLPercentageStatCard tradesToUse={trades} accountBalance={accountBalance} />
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
      </div>

      {/* Total Trades Chart and Streak Statistics - 2 columns */}
      <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TotalTradesChartCard
          totalTrades={stats.totalTrades}
          totalWins={stats.totalWins}
          totalLosses={stats.totalLosses}
          beWins={stats.beWins}
          beLosses={stats.beLosses}
        />
        <StreakStatisticsCard
          currentStreak={stats.currentStreak}
          maxWinningStreak={stats.maxWinningStreak}
          maxLosingStreak={stats.maxLosingStreak}
        />
      </div>
    </>
  );
}
