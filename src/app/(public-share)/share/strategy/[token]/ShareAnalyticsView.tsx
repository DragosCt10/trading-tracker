'use client';

/**
 * Analytics view for the public share page.
 *
 * Split out of ShareStrategyClient so Recharts and ~25 analytics cards are
 * only loaded when the viewer switches from the default "My trades" tab to
 * the "Analytics" tab. Parent dynamic-imports this file with ssr: false.
 */

import { useMemo } from 'react';
import type { Trade } from '@/types/trade';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { SharePageStats } from './sharePageStats';
import { TradingOverviewStats } from '@/components/dashboard/analytics/TradingOverviewStats';
import { EquityCurveCard } from '@/components/dashboard/analytics/EquityCurveCard';
import {
  MonthlyPerformanceChart,
  computeFullMonthlyStatsFromTrades,
} from '@/components/dashboard/analytics/MonthlyPerformanceChart';
import { RiskRewardStats } from '@/components/dashboard/analytics/RiskRewardStats';
import { SetupStatisticsCard } from '@/components/dashboard/analytics/SetupStatisticsCard';
import { LiquidityStatisticsCard } from '@/components/dashboard/analytics/LiquidityStatisticsCard';
import { AccountOverviewCard } from '@/components/dashboard/analytics/AccountOverviewCard';
import {
  MONTHS,
  calculatePnlPercentFromOverview,
} from '@/utils/accountOverviewHelpers';
import { TradesCalendarCard } from '@/components/dashboard/analytics/TradesCalendarCard';
import {
  ConfidenceStatsCard,
  MindStateStatsCard,
} from '@/components/dashboard/analytics/ConfidenceMindStateCards';
import { ConsistencyScoreChart } from '@/components/dashboard/analytics/ConsistencyScoreChart';
import { AverageDrawdownChart } from '@/components/dashboard/analytics/AverageDrawdownChart';
import { MaxDrawdownChart } from '@/components/dashboard/analytics/MaxDrawdownChart';
import { ProfitFactorChart } from '@/components/dashboard/analytics/ProfitFactorChart';
import { SharpeRatioChart } from '@/components/dashboard/analytics/SharpeRatioChart';
import { TQIChart } from '@/components/dashboard/analytics/TQIChart';
import { chartOptions } from '@/utils/chartConfig';
import { MarketStatisticsCard } from '@/components/dashboard/analytics/MarketStatisticsCard';
import MarketProfitStatisticsCard from '@/components/dashboard/analytics/MarketProfitStats';
import { SLSizeStatisticsCard } from '@/components/dashboard/analytics/SLSizeStatisticsCard';
import { TimeIntervalStatisticsCard } from '@/components/dashboard/analytics/TimeIntervalStatisticsCard';
import { DayStatisticsCard } from '@/components/dashboard/analytics/DayStatisticsCard';
import { NewsNameChartCard } from '@/components/dashboard/analytics/NewsNameChartCard';
import { MSSStatisticsCard } from '@/components/dashboard/analytics/MSSStatisticsCard';
import { LaunchHourTradesCard } from '@/components/dashboard/analytics/LaunchHourTradesCard';
import { AverageDisplacementSizeCard } from '@/components/dashboard/analytics/AverageDisplacementSizeCard';
import { DisplacementSizeStats } from '@/components/dashboard/analytics/DisplacementSizeStats';
import { LocalHLStatisticsCard } from '@/components/dashboard/analytics/LocalHLStatisticsCard';
import { FvgSizeStats } from '@/components/dashboard/analytics/FvgSizeStats';

type WeeklyStats = ReturnType<
  typeof import('@/components/dashboard/analytics/TradesCalendarCard').buildWeeklyStats
>;

export type ShareAnalyticsViewProps = {
  trades: Trade[];
  strategy: { name: string; extra_cards: ExtraCardKey[] };
  precomputedStats: SharePageStats;
  currencySymbol: string;
  accountBalance: number | null;
  isPro: boolean;
  hydrated: boolean;

  // Calendar state — owned by parent so it persists across view toggles
  currentDate: Date;
  onMonthNavigate: (direction: 'prev' | 'next') => void;
  canNavigateMonth: (direction: 'prev' | 'next') => boolean;
  weeklyStats: WeeklyStats;
  calendarMonthTrades: Trade[];
  daysInMonth: Date[];
};

export default function ShareAnalyticsView({
  trades,
  strategy,
  precomputedStats,
  currencySymbol,
  accountBalance,
  isPro,
  hydrated,
  currentDate,
  onMonthNavigate,
  canNavigateMonth,
  weeklyStats,
  calendarMonthTrades,
  daysInMonth,
}: ShareAnalyticsViewProps) {
  const {
    setupStats, liquidityStats, marketStats, slSizeStats,
    timeIntervalChartData, dayStats, mssStats, localHLStats,
    monthlyProfitStats, totalRangeProfit, updatedBalance,
    partials: partialStatsFromTrades,
    evaluationStats, reentryStats, breakEvenStats, trendStats,
    directionStats,
    allTradesRiskStats, statsToUse, macroStatsToUse,
    hasSetupData, hasLiquidityData, hasMarketData, hasSLSizeData,
    hasTimeIntervalData, hasDayStatsData, hasMssData, hasLocalHLData,
    hasNewsNameData, hasPotentialRRData, hasLaunchHourData,
    hasAvgDisplacementData, hasDisplacementSizeData, hasFvgSizeData,
    hasConfidenceData, hasMindStateData,
  } = precomputedStats;

  const monthlyStatsAllTrades = useMemo(
    () => computeFullMonthlyStatsFromTrades(trades),
    [trades]
  );

  const hasCard = (key: ExtraCardKey) => strategy.extra_cards.includes(key);
  const hasSetupCard = hasCard('setup_stats');
  const hasLiquidityCard = hasCard('liquidity_stats');

  const getCurrencySymbol = () => currencySymbol;

  const partialRowProps = {
    partialStats: {
      totalPartials: partialStatsFromTrades.totalPartialTradesCount,
      partialWinningTrades: partialStatsFromTrades.partialWinningTrades,
      partialLosingTrades: partialStatsFromTrades.partialLosingTrades,
      partialBETrades: partialStatsFromTrades.partialBETrades,
    },
    initialNonExecutedTotalTradesCount: null as number | null,
    directionStats,
    includeTotalTradesForDirection: true,
    chartsLoadingState: false,
  };

  const aboveRiskPerTradeRow = {
    evaluationStats,
    reentryStats,
    breakEvenStats,
    trendStats,
    chartsLoadingState: false,
    includeTotalTrades: true,
    showEvaluationCard: hasCard('evaluation_stats') && evaluationStats.length > 0,
    showTrendCard: hasCard('trend_stats') && trendStats.length > 0,
  };

  return (
    <>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Account overview
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Balance and P&amp;L over this shared period.
            </p>
          </div>
        </div>
        <AccountOverviewCard
          accountName={null}
          currencySymbol={currencySymbol}
          updatedBalance={updatedBalance}
          totalYearProfit={totalRangeProfit}
          accountBalance={accountBalance ?? 0}
          months={MONTHS}
          monthlyStatsAllTrades={monthlyProfitStats}
          isYearDataLoading={false}
          tradesCount={trades.length}
          fallbackAccountName="Read-only Account"
        />
      </section>

      <section className="space-y-4 mt-14">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Trades calendar</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            See how trades are distributed across days and weeks in this shared period.
          </p>
        </div>
        <TradesCalendarCard
          currentDate={currentDate}
          onMonthNavigate={onMonthNavigate}
          canNavigateMonth={canNavigateMonth}
          weeklyStats={weeklyStats}
          calendarMonthTrades={calendarMonthTrades}
          selectedMarket="all"
          currencySymbol={currencySymbol}
          accountBalance={accountBalance ?? 0}
          getDaysInMonth={() => daysInMonth}
        />
      </section>

      {isPro && (
        <section className="space-y-4 mt-14">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Core statistics</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Win rate, profit, R-multiples, streaks, and more computed from this shared period.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full [&>*]:min-w-0">
            <TradingOverviewStats
              trades={trades}
              currencySymbol={currencySymbol}
              hydrated={hydrated}
              accountBalance={accountBalance ?? undefined}
              totalProfitFromOverview={totalRangeProfit}
              pnlPercentFromOverview={calculatePnlPercentFromOverview(totalRangeProfit, accountBalance)}
              viewMode="dateRange"
              showTitle={false}
              partialRowProps={partialRowProps}
              aboveRiskPerTradeRow={aboveRiskPerTradeRow}
              allTradesRiskStats={allTradesRiskStats}
              hideEmptyChartCards
            />
          </div>
        </section>
      )}

      {isPro && (hasConfidenceData || hasMindStateData) && (
        <section className="space-y-4 mt-14">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Psychological Factors</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Confidence and mind state at entry across these shared trades.
            </p>
          </div>
          <div
            className={
              hasConfidenceData && hasMindStateData
                ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                : 'grid grid-cols-1 gap-6'
            }
          >
            {hasConfidenceData && <ConfidenceStatsCard trades={trades} isLoading={false} />}
            {hasMindStateData && <MindStateStatsCard trades={trades} isLoading={false} />}
          </div>
        </section>
      )}

      <section className="space-y-4 mt-14">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Equity curve</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Cumulative P&amp;L over the shared period, starting from zero.
          </p>
        </div>
        <EquityCurveCard trades={trades} currencySymbol={currencySymbol} />
      </section>

      {isPro && (
        <section className="space-y-4 mt-14">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Consistency &amp; drawdown</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Consistency and capital preservation metrics over this shared period.
            </p>
          </div>
          <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full">
            <ConsistencyScoreChart consistencyScore={macroStatsToUse.consistencyScore ?? 0} />
            <AverageDrawdownChart averageDrawdown={statsToUse.averageDrawdown ?? 0} />
            <MaxDrawdownChart maxDrawdown={statsToUse.maxDrawdown ?? null} />
          </div>
        </section>
      )}

      {isPro && (
        <section className="space-y-4 mt-14">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Performance ratios</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Return and risk-adjusted metrics.
            </p>
          </div>
          <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full">
            <ProfitFactorChart
              tradesToUse={trades}
              totalWins={statsToUse.totalWins}
              totalLosses={statsToUse.totalLosses}
            />
            <SharpeRatioChart sharpeRatio={macroStatsToUse.sharpeWithBE ?? 0} />
            <TQIChart tradesToUse={trades} />
          </div>
        </section>
      )}

      {isPro && (
        <section className="my-8">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Trade Performance Analysis
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              See your trading performance metrics and statistics.
            </p>
          </div>
          <MonthlyPerformanceChart
            monthlyStatsAllTrades={monthlyStatsAllTrades}
            months={MONTHS}
          />
        </section>
      )}

      {isPro && hasMarketData && (
        <div className="my-8">
          <MarketStatisticsCard
            marketStats={marketStats}
            isLoading={false}
            includeTotalTrades
          />
        </div>
      )}

      {isPro && hasMarketData && (
        <div className="my-8">
          <MarketProfitStatisticsCard
            trades={trades}
            marketStats={marketStats}
            chartOptions={chartOptions}
            getCurrencySymbol={getCurrencySymbol}
          />
        </div>
      )}

      {isPro && hasTimeIntervalData && (
        <div className="my-8">
          <TimeIntervalStatisticsCard
            data={timeIntervalChartData}
            isLoading={false}
          />
        </div>
      )}

      {hasDayStatsData && (
        <div className="my-8">
          <DayStatisticsCard
            dayStats={dayStats}
            isLoading={false}
            includeTotalTrades
          />
        </div>
      )}

      {hasNewsNameData && (
        <div className="my-8">
          <NewsNameChartCard trades={trades} isLoading={false} />
        </div>
      )}

      {(hasCard('potential_rr') && hasPotentialRRData) ||
      (hasCard('sl_size_stats') && hasSLSizeData) ? (
        <section className="my-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full [&>*]:min-w-0">
            {hasCard('potential_rr') && hasPotentialRRData && (
              <RiskRewardStats trades={trades} isLoading={false} />
            )}
            {hasCard('sl_size_stats') && hasSLSizeData && (
              <SLSizeStatisticsCard
                slSizeStats={slSizeStats}
                isLoading={false}
              />
            )}
          </div>
        </section>
      ) : null}

      {hasSetupCard && hasSetupData && (
        <div className="my-8">
          <SetupStatisticsCard
            setupStats={setupStats}
            isLoading={false}
            includeTotalTrades
          />
        </div>
      )}

      {hasLiquidityCard && hasLiquidityData && (
        <div className="my-8">
          <LiquidityStatisticsCard
            liquidityStats={liquidityStats}
            isLoading={false}
            includeTotalTrades
          />
        </div>
      )}

      {((hasCard('mss_stats') && hasMssData) ||
        (hasCard('launch_hour') && hasLaunchHourData) ||
        (hasCard('avg_displacement') && hasAvgDisplacementData) ||
        (hasCard('displacement_size') && hasDisplacementSizeData) ||
        (hasCard('local_hl_stats') && hasLocalHLData) ||
        (hasCard('fvg_size') && hasFvgSizeData)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8 w-full [&>*]:min-w-0">
          {hasCard('mss_stats') && hasMssData && (
            <MSSStatisticsCard
              mssStats={mssStats}
              isLoading={false}
              includeTotalTrades
            />
          )}
          {hasCard('launch_hour') && hasLaunchHourData && (
            <LaunchHourTradesCard
              filteredTrades={trades}
              isLoading={false}
            />
          )}
          {hasCard('avg_displacement') && hasAvgDisplacementData && (
            <AverageDisplacementSizeCard trades={trades} isLoading={false} />
          )}
          {hasCard('displacement_size') && hasDisplacementSizeData && (
            <DisplacementSizeStats trades={trades} isLoading={false} />
          )}
          {hasCard('local_hl_stats') && hasLocalHLData && (
            <LocalHLStatisticsCard
              localHLStats={localHLStats}
              isLoading={false}
              includeTotalTrades
            />
          )}
          {hasCard('fvg_size') && hasFvgSizeData && (
            <FvgSizeStats trades={trades} isLoading={false} />
          )}
        </div>
      )}
    </>
  );
}
