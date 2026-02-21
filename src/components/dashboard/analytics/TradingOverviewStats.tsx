'use client';

import { useMemo } from 'react';
import { Trade } from '@/types/trade';
import { WinRateStatCard } from './WinRateStatCard';
import { TotalProfitStatCard } from './TotalProfitStatCard';
import { AverageProfitStatCard } from './AverageProfitStatCard';
import { StreakStatisticsCard } from './StreakStatisticsCard';
import { TotalTradesChartCard } from './TotalTradesChartCard';
import { RRMultipleStatCard } from './RRMultipleStatCard';
import { PNLPercentageStatCard } from './PNLPercentageStatCard';
import { AverageDaysBetweenTradesCard } from './AverageDaysBetweenTradesCard';
import { calculateTradingOverviewStats } from '@/utils/calculateTradingOverviewStats';

interface MonthlyStatsForCard {
  monthlyData?: {
    [month: string]: {
      wins: number;
      losses: number;
      beWins: number;
      beLosses: number;
      winRate: number;
      winRateWithBE: number;
    };
  };
}

interface TradingOverviewStatsProps {
  trades: Trade[];
  currencySymbol: string;
  hydrated: boolean;
  accountBalance?: number | null | undefined;
  viewMode?: 'yearly' | 'dateRange';
  monthlyStats?: MonthlyStatsForCard | null;
}

export function TradingOverviewStats({ trades, currencySymbol, hydrated, accountBalance, viewMode = 'yearly', monthlyStats }: TradingOverviewStatsProps) {
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

      {/* Key metrics: RR Multiple, P&L %, and Average Days Between Trades - 3 cards on a single row */}
      <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <RRMultipleStatCard tradesToUse={trades} />
        <PNLPercentageStatCard tradesToUse={trades} accountBalance={accountBalance} />
        <AverageDaysBetweenTradesCard
          averageDaysBetweenTrades={stats.averageDaysBetweenTrades}
          viewMode={viewMode}
          monthlyStats={monthlyStats ?? undefined}
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
