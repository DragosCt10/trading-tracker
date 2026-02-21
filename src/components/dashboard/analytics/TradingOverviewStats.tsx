'use client';

import React, { useMemo } from 'react';
import { Trade } from '@/types/trade';
import type { DirectionStats } from '@/types/dashboard';
import { WinRateStatCard } from './WinRateStatCard';
import { TotalProfitStatCard } from './TotalProfitStatCard';
import { AverageProfitStatCard } from './AverageProfitStatCard';
import { StreakStatisticsCard } from './StreakStatisticsCard';
import { TotalTradesChartCard } from './TotalTradesChartCard';
import { RRMultipleStatCard } from './RRMultipleStatCard';
import { PNLPercentageStatCard } from './PNLPercentageStatCard';
import { AverageDaysBetweenTradesCard } from './AverageDaysBetweenTradesCard';
import { AverageMonthlyTradesCard } from './AverageMonthlyTradesCard';
import { PartialTradesChartCard } from './PartialTradesChartCard';
import { ExecutedNonExecutedTradesCard } from './ExecutedNonExecutedTradesCard';
import { DirectionStatisticsCard } from './DirectionStatisticsCard';
import { EvaluationStats } from './EvaluationStats';
import { TradeTypesStatisticsCard } from './TradeTypesStatisticsCard';
import type { TradeTypesStatisticsCardProps } from './TradeTypesStatisticsCard';
import type { EvaluationStat } from '@/utils/calculateEvaluationStats';
import RiskPerTrade, { type RiskAnalysis } from './RiskPerTrade';
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

/** Props for the Partial Trades / Executed–Non-Executed / Direction row (optional). */
export interface CoreStatsPartialRowProps {
  partialStats: {
    totalPartials: number;
    partialWinningTrades: number;
    partialLosingTrades: number;
    beWinPartialTrades: number;
    beLosingPartialTrades: number;
    partialWinRate: number;
    partialWinRateWithBE: number;
  };
  initialNonExecutedTotalTradesCount?: number | null;
  directionStats: DirectionStats[];
  includeTotalTradesForDirection: boolean;
  chartsLoadingState?: boolean;
}

interface TradingOverviewStatsProps {
  trades: Trade[];
  currencySymbol: string;
  hydrated: boolean;
  accountBalance?: number | null | undefined;
  viewMode?: 'yearly' | 'dateRange';
  monthlyStats?: MonthlyStatsForCard | null;
  /** When false, the section title and description are not rendered (e.g. when a parent provides them). */
  showTitle?: boolean;
  /** When provided, renders Partial Trades, Executed/Non-Executed, and Long/Short cards. */
  partialRowProps?: CoreStatsPartialRowProps | null;
  /** When provided, renders RiskPerTrade card below the three chart cards (with a separator above). */
  allTradesRiskStats?: RiskAnalysis | null;
  /** When provided, renders Evaluation + Trade Types row above the RiskPerTrade card. */
  aboveRiskPerTradeRow?: {
    evaluationStats: EvaluationStat[];
    reentryStats: TradeTypesStatisticsCardProps['reentryStats'];
    breakEvenStats: TradeTypesStatisticsCardProps['breakEvenStats'];
    chartsLoadingState?: boolean;
    includeTotalTrades: boolean;
  } | null;
}

export function TradingOverviewStats({ trades, currencySymbol, hydrated, accountBalance, viewMode = 'yearly', monthlyStats, showTitle = true, partialRowProps, allTradesRiskStats, aboveRiskPerTradeRow }: TradingOverviewStatsProps) {
  const stats = useMemo(() => calculateTradingOverviewStats(trades), [trades]);
  const totalExecutedTrades = useMemo(() => trades.filter((t) => t.executed === true).length, [trades]);
  const nonExecutedTotalTradesCount = useMemo(() => trades.filter((t) => t.executed !== true).length, [trades]);

  return (
    <>
      {showTitle && (
        <>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-10 mb-2">Core statistics</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Trading statistics and performance metrics.</p>
        </>
      )}

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

      {/* Key metrics: RR Multiple, P&L %, Average Days Between Trades; in year mode also Average Monthly Trades */}
      <div className={`col-span-full grid grid-cols-1 gap-4 ${viewMode === 'yearly' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        <RRMultipleStatCard tradesToUse={trades} />
        <PNLPercentageStatCard tradesToUse={trades} accountBalance={accountBalance} />
        <AverageDaysBetweenTradesCard
          averageDaysBetweenTrades={stats.averageDaysBetweenTrades}
          viewMode={viewMode}
          monthlyStats={monthlyStats ?? undefined}
        />
        {viewMode === 'yearly' && monthlyStats?.monthlyData && (
          <AverageMonthlyTradesCard monthlyStats={monthlyStats} />
        )}
      </div>

      <hr className="col-span-full my-8 border-t border-slate-200 dark:border-slate-700" />

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

      {/* Long/Short (left), Partial Trades (middle), Executed/Non-Executed (right) */}
      {partialRowProps && (
        <div className="col-span-full grid grid-cols-1 lg:grid-cols-3 gap-6 [&>*]:min-h-[340px]">
          <DirectionStatisticsCard
            directionStats={partialRowProps.directionStats}
            isLoading={partialRowProps.chartsLoadingState}
            includeTotalTrades={partialRowProps.includeTotalTradesForDirection}
          />
          <PartialTradesChartCard
            totalPartials={partialRowProps.partialStats.totalPartials}
            partialWinningTrades={partialRowProps.partialStats.partialWinningTrades}
            partialLosingTrades={partialRowProps.partialStats.partialLosingTrades}
            beWinPartialTrades={partialRowProps.partialStats.beWinPartialTrades}
            beLosingPartialTrades={partialRowProps.partialStats.beLosingPartialTrades}
            partialWinRate={partialRowProps.partialStats.partialWinRate}
            partialWinRateWithBE={partialRowProps.partialStats.partialWinRateWithBE}
            isLoading={partialRowProps.chartsLoadingState}
          />
          <ExecutedNonExecutedTradesCard
            totalExecutedTrades={totalExecutedTrades}
            initialNonExecutedTotalTradesCount={partialRowProps.initialNonExecutedTotalTradesCount}
            nonExecutedTotalTradesCount={nonExecutedTotalTradesCount}
            isLoading={partialRowProps.chartsLoadingState}
          />
        </div>
      )}

      {aboveRiskPerTradeRow && (
        <>
        <hr className="col-span-full my-8 border-t border-slate-200 dark:border-slate-700" />
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <EvaluationStats
            stats={aboveRiskPerTradeRow.evaluationStats}
            isLoading={aboveRiskPerTradeRow.chartsLoadingState}
          />
          <TradeTypesStatisticsCard
            reentryStats={aboveRiskPerTradeRow.reentryStats}
            breakEvenStats={aboveRiskPerTradeRow.breakEvenStats}
            isLoading={aboveRiskPerTradeRow.chartsLoadingState}
            includeTotalTrades={aboveRiskPerTradeRow.includeTotalTrades}
          />
        </div>
        </>
      )}

      {allTradesRiskStats !== undefined && (
        <>
          <div className="col-span-full">
            <RiskPerTrade className="mt-2" allTradesRiskStats={allTradesRiskStats} />
          </div>
        </>
      )}
    </>
  );
}
