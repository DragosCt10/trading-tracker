'use client';

import React, { useMemo } from 'react';
import { Trade } from '@/types/trade';
import type { DirectionStats } from '@/types/dashboard';
import { WinRateStatCard } from './WinRateStatCard';
import { TotalProfitStatCard } from './TotalProfitStatCard';
import { AverageProfitStatCard } from './AverageProfitStatCard';
import { StreakStatisticsCard } from './StreakStatisticsCard';
import { TotalTradesChartCard } from './TotalTradesChartCard';
import { BEStatisticsCard } from './BEStatisticsCard';
import { RRMultipleStatCard } from './RRMultipleStatCard';
import { BestRRStatCard } from './BestRRStatCard';
import { PNLPercentageStatCard } from './PNLPercentageStatCard';
import { AverageDaysBetweenTradesCard } from './AverageDaysBetweenTradesCard';
import { AverageMonthlyTradesCard } from './AverageMonthlyTradesCard';
import { PartialTradesChartCard } from './PartialTradesChartCard';
import { ExecutedNonExecutedTradesCard } from './ExecutedNonExecutedTradesCard';
import { DirectionStatisticsCard } from './DirectionStatisticsCard';
import { EvaluationStats } from './EvaluationStats';
import { ReentryTradesChartCard } from './ReentryTradesChartCard';
import type { ReentryTradesChartCardProps } from './ReentryTradesChartCard';
import { TrendStatisticsCard } from './TrendStatisticsCard';
import type { TradeTypeStats } from '@/types/dashboard';
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
    /** Break-even partial trades (single bucket). */
    partialBETrades: number;
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
  /** When provided, renders Evaluation + Re-entry Trades + Trend Trades row above the RiskPerTrade card. */
  aboveRiskPerTradeRow?: {
    evaluationStats: EvaluationStat[];
    reentryStats: ReentryTradesChartCardProps['reentryStats'];
    breakEvenStats: ReentryTradesChartCardProps['breakEvenStats'];
    trendStats: TradeTypeStats[];
    chartsLoadingState?: boolean;
    includeTotalTrades: boolean;
    /** When false, Evaluation card is hidden (extra card not enabled for strategy). Default true. */
    showEvaluationCard?: boolean;
    /** When false, Trend card is hidden (extra card not enabled for strategy). Default true. */
    showTrendCard?: boolean;
  } | null;
  /** When true, only render chart cards that have data and use a single auto-arranging grid (e.g. share view). */
  hideEmptyChartCards?: boolean;
}

export function TradingOverviewStats({ trades, currencySymbol, hydrated, accountBalance, viewMode = 'yearly', monthlyStats, showTitle = true, partialRowProps, allTradesRiskStats, aboveRiskPerTradeRow, hideEmptyChartCards = false }: TradingOverviewStatsProps) {
  const stats = useMemo(() => calculateTradingOverviewStats(trades), [trades]);
  const totalExecutedTrades = useMemo(() => trades.filter((t) => t.executed === true).length, [trades]);
  const nonExecutedTotalTradesCount = useMemo(() => trades.filter((t) => t.executed !== true).length, [trades]);

  const chartCardsSection = useMemo(() => {
    if (!hideEmptyChartCards) return null;

    const directionHasData = (partialRowProps?.directionStats?.reduce((s, d) => s + (d.total ?? 0), 0) ?? 0) > 0;
    const partialHasData = (partialRowProps?.partialStats?.totalPartials ?? 0) > 0;
    const hasAnyTrades = stats.totalTrades > 0;
    const executedNonExecutedHasData = totalExecutedTrades + (partialRowProps?.initialNonExecutedTotalTradesCount ?? nonExecutedTotalTradesCount) > 0;

    const cards: React.ReactNode[] = [];

    if (hasAnyTrades) {
      cards.push(
        <TotalTradesChartCard
          key="total-trades"
          totalTrades={stats.totalTrades}
          wins={stats.wins}
          losses={stats.losses}
          beTrades={stats.beTradesCount}
        />
      );
      cards.push(
        <StreakStatisticsCard
          key="streak"
          currentStreak={stats.currentStreak}
          maxWinningStreak={stats.maxWinningStreak}
          maxLosingStreak={stats.maxLosingStreak}
        />
      );
    }
    if (stats.beTradesCount > 0) {
      cards.push(<BEStatisticsCard key="be" trades={trades} />);
    }
    if (partialRowProps && directionHasData) {
      cards.push(
        <DirectionStatisticsCard
          key="direction"
          directionStats={partialRowProps.directionStats}
          isLoading={partialRowProps.chartsLoadingState}
          includeTotalTrades={partialRowProps.includeTotalTradesForDirection}
        />
      );
    }
    if (partialRowProps && partialHasData) {
      cards.push(
        <PartialTradesChartCard
          key="partial"
          totalPartials={partialRowProps.partialStats.totalPartials}
          partialWinningTrades={partialRowProps.partialStats.partialWinningTrades}
          partialLosingTrades={partialRowProps.partialStats.partialLosingTrades}
          partialBETrades={partialRowProps.partialStats.partialBETrades}
          isLoading={partialRowProps.chartsLoadingState}
        />
      );
    }
    if (partialRowProps && executedNonExecutedHasData) {
      cards.push(
        <ExecutedNonExecutedTradesCard
          key="executed"
          totalExecutedTrades={totalExecutedTrades}
          initialNonExecutedTotalTradesCount={partialRowProps.initialNonExecutedTotalTradesCount}
          nonExecutedTotalTradesCount={nonExecutedTotalTradesCount}
          isLoading={partialRowProps.chartsLoadingState}
        />
      );
    }

    if (cards.length === 0) return null;

    return (
      <div className="col-span-full grid grid-cols-2 lg:grid-cols-3 gap-6 [&>*]:min-h-[340px]">
        {cards}
      </div>
    );
  }, [
    hideEmptyChartCards,
    partialRowProps,
    stats.totalTrades,
    stats.wins,
    stats.losses,
    stats.beTradesCount,
    stats.currentStreak,
    stats.maxWinningStreak,
    stats.maxLosingStreak,
    totalExecutedTrades,
    nonExecutedTotalTradesCount,
    trades,
  ]);

  return (
    <>
      {showTitle && (
        <>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-10 mb-2">Core statistics</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Trading statistics and performance metrics.</p>
        </>
      )}

      <WinRateStatCard winRate={stats.winRate} winRateWithBE={stats.winRateWithBE} hydrated={hydrated} />

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

      <BestRRStatCard tradesToUse={trades} />

      {/* Key metrics: RR Multiple, P&L %, Average Days Between Trades; in year mode also Average Monthly Trades */}
      <div className={`col-span-full grid grid-cols-1 gap-6 ${viewMode === 'yearly' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
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

      {/* Six cards: when hideEmptyChartCards, only visible cards in one auto-arranging grid; otherwise fixed 3-col grid */}
      {hideEmptyChartCards ? (
        chartCardsSection
      ) : (
        <div className="col-span-full grid grid-cols-1 lg:grid-cols-3 gap-6 [&>*:nth-child(n+4)]:min-h-[340px]">
          <TotalTradesChartCard
            totalTrades={stats.totalTrades}
            wins={stats.wins}
            losses={stats.losses}
            beTrades={stats.beTradesCount}
          />
          <StreakStatisticsCard
            currentStreak={stats.currentStreak}
            maxWinningStreak={stats.maxWinningStreak}
            maxLosingStreak={stats.maxLosingStreak}
          />
          <BEStatisticsCard trades={trades} />
          {partialRowProps && (
            <>
              <DirectionStatisticsCard
                directionStats={partialRowProps.directionStats}
                isLoading={partialRowProps.chartsLoadingState}
                includeTotalTrades={partialRowProps.includeTotalTradesForDirection}
              />
              <PartialTradesChartCard
                totalPartials={partialRowProps.partialStats.totalPartials}
                partialWinningTrades={partialRowProps.partialStats.partialWinningTrades}
                partialLosingTrades={partialRowProps.partialStats.partialLosingTrades}
                partialBETrades={partialRowProps.partialStats.partialBETrades}
                isLoading={partialRowProps.chartsLoadingState}
              />
              <ExecutedNonExecutedTradesCard
                totalExecutedTrades={totalExecutedTrades}
                initialNonExecutedTotalTradesCount={partialRowProps.initialNonExecutedTotalTradesCount}
                nonExecutedTotalTradesCount={nonExecutedTotalTradesCount}
                isLoading={partialRowProps.chartsLoadingState}
              />
            </>
          )}
        </div>
      )}

      {aboveRiskPerTradeRow && (() => {
        const showEvaluationCard = aboveRiskPerTradeRow.showEvaluationCard !== false;
        const showTrendCard = aboveRiskPerTradeRow.showTrendCard !== false;
        const evalTotal = aboveRiskPerTradeRow.evaluationStats.reduce((s, e) => s + e.total, 0);
        const reentryTotal = aboveRiskPerTradeRow.reentryStats.reduce((s, r) => s + (r.total ?? 0), 0);
        const trendTotal = aboveRiskPerTradeRow.trendStats.reduce((s, t) => s + (t.total ?? 0), 0);
        const showEval = showEvaluationCard && (!hideEmptyChartCards || evalTotal > 0);
        const showReentry = !hideEmptyChartCards || reentryTotal > 0;
        const showTrend = showTrendCard && (!hideEmptyChartCards || trendTotal > 0);
        const hasAny = showEval || showReentry || showTrend;
        if (!hasAny) return null;
        const gridClass = hideEmptyChartCards
          ? 'col-span-full grid grid-cols-1 lg:grid-cols-3 gap-6 w-full [&>*]:min-h-[340px] [&>*]:min-w-0'
          : 'col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 w-full [&>*]:min-w-0';
        return (
          <>
            <hr className="col-span-full my-8 border-t border-slate-200 dark:border-slate-700" />
            <div className={gridClass}>
              {showEval && (
                <EvaluationStats
                  stats={aboveRiskPerTradeRow.evaluationStats}
                  isLoading={aboveRiskPerTradeRow.chartsLoadingState}
                />
              )}
              {showReentry && (
                <ReentryTradesChartCard
                  reentryStats={aboveRiskPerTradeRow.reentryStats}
                  breakEvenStats={aboveRiskPerTradeRow.breakEvenStats}
                  isLoading={aboveRiskPerTradeRow.chartsLoadingState}
                />
              )}
              {showTrend && (
                <TrendStatisticsCard
                  trendStats={aboveRiskPerTradeRow.trendStats}
                  isLoading={aboveRiskPerTradeRow.chartsLoadingState}
                  includeTotalTrades={aboveRiskPerTradeRow.includeTotalTrades}
                />
              )}
            </div>
          </>
        );
      })()}

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
