'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import type { Trade } from '@/types/trade';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { StrategyShareRow } from '@/lib/server/publicShares';
import { TradingOverviewStats } from '@/components/dashboard/analytics/TradingOverviewStats';
import { EquityCurveCard } from '@/components/dashboard/analytics/EquityCurveCard';
import {
  MonthlyPerformanceChart,
  computeFullMonthlyStatsFromTrades,
} from '@/components/dashboard/analytics/MonthlyPerformanceChart';
import { RiskRewardStats, DISPLAY_RATIOS } from '@/components/dashboard/analytics/RiskRewardStats';
import {
  SetupStatisticsCard,
  calculateSetupStats,
} from '@/components/dashboard/analytics/SetupStatisticsCard';
import {
  LiquidityStatisticsCard,
  calculateLiquidityStats,
} from '@/components/dashboard/analytics/LiquidityStatisticsCard';
import {
  AccountOverviewCard,
  MONTHS,
  computeMonthlyStatsFromTrades,
  calculateTotalYearProfit,
  calculateUpdatedBalance,
} from '@/components/dashboard/analytics/AccountOverviewCard';
import {
  TradesCalendarCard,
  getDaysInMonthForDate,
  buildWeeklyStats,
} from '@/components/dashboard/analytics/TradesCalendarCard';
import {
  ConfidenceStatsCard,
  MindStateStatsCard,
} from '@/components/dashboard/analytics/ConfidenceMindStateCards';
import {
  calculateDirectionStats,
  calculateReentryStats,
  calculateBreakEvenStats,
  calculateTrendStats,
  calculateMarketStats,
  calculateSLSizeStats,
  calculateMssStats,
  calculateLocalHLStats,
  calculateDayStats,
  calculateNewsNameStats,
  isLocalHighLowLiquidated,
} from '@/utils/calculateCategoryStats';
import { calculatePartialTradesStats } from '@/utils/calculatePartialTradesStats';
import { calculateEvaluationStats } from '@/utils/calculateEvaluationStats';
import type { EvaluationStat } from '@/utils/calculateEvaluationStats';
import { calculateRiskPerTradeStats } from '@/utils/calculateRiskPerTrade';
import { ConsistencyScoreChart } from '@/components/dashboard/analytics/ConsistencyScoreChart';
import { AverageDrawdownChart } from '@/components/dashboard/analytics/AverageDrawdownChart';
import { MaxDrawdownChart } from '@/components/dashboard/analytics/MaxDrawdownChart';
import { ProfitFactorChart } from '@/components/dashboard/analytics/ProfitFactorChart';
import { SharpeRatioChart } from '@/components/dashboard/analytics/SharpeRatioChart';
import { TQIChart } from '@/components/dashboard/analytics/TQIChart';
import {
  computeStrategyStatsFromTrades,
  computeTimeIntervalChartData,
} from '@/utils/computeStrategyStatsFromTrades';
import { calculateFilteredMacroStats } from '@/utils/calculateFilteredMacroStats';
import { chartOptions } from '@/utils/chartConfig';
import { MarketStatisticsCard } from '@/components/dashboard/analytics/MarketStatisticsCard';
import MarketProfitStatisticsCard from '@/components/dashboard/analytics/MarketProfitStats';
import { SLSizeStatisticsCard } from '@/components/dashboard/analytics/SLSizeStatisticsCard';
import { TimeIntervalStatisticsCard } from '@/components/dashboard/analytics/TimeIntervalStatisticsCard';
import {
  DayStatisticsCard,
} from '@/components/dashboard/analytics/DayStatisticsCard';
import { NewsNameChartCard } from '@/components/dashboard/analytics/NewsNameChartCard';
import {
  MSSStatisticsCard,
} from '@/components/dashboard/analytics/MSSStatisticsCard';
import {
  LaunchHourTradesCard,
} from '@/components/dashboard/analytics/LaunchHourTradesCard';
import {
  LocalHLBEStatisticsCard,
} from '@/components/dashboard/analytics/LocalHLBEStatisticsCard';
import {
  PartialsBEStatisticsCard,
} from '@/components/dashboard/analytics/PartialsBEStatisticsCard';
import {
  AverageDisplacementSizeCard,
} from '@/components/dashboard/analytics/AverageDisplacementSizeCard';
import {
  DisplacementSizeStats,
} from '@/components/dashboard/analytics/DisplacementSizeStats';
import {
  LocalHLStatisticsCard,
} from '@/components/dashboard/analytics/LocalHLStatisticsCard';
import {
  FvgSizeStats,
} from '@/components/dashboard/analytics/FvgSizeStats';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/shared/Footer';
import { Lock, Share2 } from 'lucide-react';

type ShareStrategyClientProps = {
  trades: Trade[];
  strategy: {
    name: string;
    extra_cards: ExtraCardKey[];
  };
  shareData: StrategyShareRow;
  currencySymbol: string;
  accountBalance: number | null;
};

export default function ShareStrategyClient({
  trades,
  strategy,
  shareData,
  currencySymbol,
  accountBalance,
}: ShareStrategyClientProps) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const searchParams = useSearchParams();

  // Ensure the public share page applies the owner-selected color theme
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const themeFromUrl = searchParams.get('theme');
    if (!themeFromUrl) return;

    const allowedThemes = ['cyan', 'purple', 'emerald', 'gold', 'ice'] as const;
    if (!allowedThemes.includes(themeFromUrl as (typeof allowedThemes)[number])) {
      return;
    }

    try {
      document.documentElement.setAttribute('data-color-theme', themeFromUrl);
      window.localStorage.setItem('color-theme', themeFromUrl);
    } catch {
      // ignore storage errors
    }
  }, [searchParams]);

  const dateRangeLabel = useMemo(() => {
    const start = new Date(shareData.start_date);
    const end = new Date(shareData.end_date);
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();

    if (sameYear && sameMonth) {
      return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
    }
    if (sameYear) {
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
  }, [shareData.start_date, shareData.end_date]);

  const monthlyStatsAllTrades = useMemo(
    () => computeFullMonthlyStatsFromTrades(trades),
    [trades]
  );

  const hasSetupCard = strategy.extra_cards.includes('setup_stats');
  const hasLiquidityCard = strategy.extra_cards.includes('liquidity_stats');
  const setupStats = useMemo(
    () => (hasSetupCard ? calculateSetupStats(trades) : []),
    [hasSetupCard, trades]
  );
  const liquidityStats = useMemo(
    () => (hasLiquidityCard ? calculateLiquidityStats(trades) : []),
    [hasLiquidityCard, trades]
  );

  const marketStats = useMemo(
    () => calculateMarketStats(trades, accountBalance ?? 0),
    [trades, accountBalance]
  );

  const slSizeStats = useMemo(() => calculateSLSizeStats(trades), [trades]);

  const { timeIntervalChartData } = useMemo(
    () => computeTimeIntervalChartData(trades),
    [trades]
  );

  const dayStats = useMemo(() => calculateDayStats(trades), [trades]);

  const mssStats = useMemo(() => calculateMssStats(trades), [trades]);

  const localHLStats = useMemo(() => calculateLocalHLStats(trades), [trades]);

  const getCurrencySymbol = () => currencySymbol;

  // Monthly profit stats for the shared period (date range)
  const monthlyProfitStats = useMemo(
    () => computeMonthlyStatsFromTrades(trades),
    [trades]
  );

  const totalRangeProfit = useMemo(
    () => calculateTotalYearProfit(monthlyProfitStats),
    [monthlyProfitStats]
  );

  const updatedBalance = useMemo(
    () => calculateUpdatedBalance(accountBalance ?? 0, totalRangeProfit),
    [accountBalance, totalRangeProfit]
  );

  // Calendar state: current month within the shared range
  const [currentDate, setCurrentDate] = useState(() => {
    // Start from the start_date month
    return startOfMonth(new Date(shareData.start_date));
  });

  const firstMonth = useMemo(
    () => startOfMonth(new Date(shareData.start_date)),
    [shareData.start_date]
  );
  const lastMonth = useMemo(
    () => startOfMonth(new Date(shareData.end_date)),
    [shareData.end_date]
  );

  const canNavigateMonth = useMemo(
    () =>
      (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
          const prev = startOfMonth(addMonths(currentDate, -1));
          return prev >= firstMonth;
        }
        const next = startOfMonth(addMonths(currentDate, 1));
        return next <= lastMonth;
      },
    [currentDate, firstMonth, lastMonth]
  );

  const handleMonthNavigate = (direction: 'prev' | 'next') => {
    if (!canNavigateMonth(direction)) return;
    setCurrentDate((prev) =>
      direction === 'prev' ? startOfMonth(addMonths(prev, -1)) : startOfMonth(addMonths(prev, 1))
    );
  };

  const daysInMonth = useMemo(
    () => getDaysInMonthForDate(currentDate),
    [currentDate]
  );

  // Filter trades to the currently visible calendar month (respecting share date range)
  const calendarMonthTrades = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

    return trades.filter((trade) => {
      let tradeDate: Date;
      if (typeof trade.trade_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(trade.trade_date)) {
        const [year, month, day] = trade.trade_date.split('-').map(Number);
        tradeDate = new Date(year, month - 1, day);
      } else {
        tradeDate = new Date(trade.trade_date);
      }

      const tradeDateStr = format(tradeDate, 'yyyy-MM-dd');
      return tradeDateStr >= monthStartStr && tradeDateStr <= monthEndStr;
    });
  }, [currentDate, trades]);

  const weeklyStats = useMemo(
    () =>
      buildWeeklyStats(
        currentDate,
        calendarMonthTrades,
        'all',
        accountBalance ?? 0
      ),
    [currentDate, calendarMonthTrades, accountBalance]
  );

  const directionStats = useMemo(() => calculateDirectionStats(trades), [trades]);
  const partialStatsFromTrades = useMemo(
    () => calculatePartialTradesStats(trades),
    [trades]
  );

  const partialRowProps = useMemo(
    () => ({
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
    }),
    [
      partialStatsFromTrades,
      directionStats,
    ]
  );

  const evaluationStats = useMemo(
    () => calculateEvaluationStats(trades) as EvaluationStat[],
    [trades]
  );
  const reentryStats = useMemo(() => calculateReentryStats(trades), [trades]);
  const breakEvenStats = useMemo(() => calculateBreakEvenStats(trades), [trades]);
  const trendStats = useMemo(() => calculateTrendStats(trades), [trades]);
  const allTradesRiskStats = useMemo(() => calculateRiskPerTradeStats(trades), [trades]);

  // Same calculation as StrategyClient: statsToUse and macroStatsToUse for Consistency & drawdown and Performance ratios
  const statsToUse = useMemo(
    () =>
      computeStrategyStatsFromTrades({
        tradesToUse: trades,
        accountBalance: accountBalance ?? 0,
        selectedExecution: null,
        viewMode: 'dateRange',
        selectedMarket: 'all',
        statsFromHook: {},
      }),
    [trades, accountBalance]
  );

  const macroStatsToUse = useMemo(
    () =>
      calculateFilteredMacroStats({
        viewMode: 'dateRange',
        selectedMarket: 'all',
        tradesToUse: trades,
        statsToUse,
        monthlyStatsToUse: monthlyProfitStats,
        nonExecutedTrades: null,
        nonExecutedTotalTradesCount: 0,
        yearlyPartialTradesCount: 0,
        yearlyPartialsBECount: 0,
        macroStats: {},
      }),
    [trades, statsToUse, monthlyProfitStats]
  );

  const hasConfidenceData = useMemo(
    () =>
      trades.some(
        (t) =>
          t.confidence_at_entry != null &&
          t.confidence_at_entry >= 1 &&
          t.confidence_at_entry <= 5
      ),
    [trades]
  );
  const hasMindStateData = useMemo(
    () =>
      trades.some(
        (t) =>
          t.mind_state_at_entry != null &&
          t.mind_state_at_entry >= 1 &&
          t.mind_state_at_entry <= 5
      ),
    [trades]
  );

  const hasCard = (key: ExtraCardKey) => strategy.extra_cards.includes(key);

  // Only show cards when trades have data for that card type
  const newsNameStats = useMemo(
    () => calculateNewsNameStats(trades, { includeUnnamed: true }),
    [trades]
  );
  const hasNewsNameData = newsNameStats.length > 0;
  const hasPotentialRRData = useMemo(
    () =>
      trades.some(
        (t) =>
          typeof t.risk_reward_ratio_long === 'number' &&
          DISPLAY_RATIOS.includes(t.risk_reward_ratio_long)
      ),
    [trades]
  );
  const hasSLSizeData = slSizeStats.length > 0;
  const hasMarketData = marketStats.length > 0;
  const hasTimeIntervalData = useMemo(
    () => timeIntervalChartData.some((d) => (d.totalTrades ?? 0) > 0),
    [timeIntervalChartData]
  );
  const hasDayStatsData = dayStats.length > 0;
  const hasMssData = mssStats.length > 0;
  const hasLaunchHourData = useMemo(
    () => trades.some((t) => t.launch_hour === true),
    [trades]
  );
  const hasLocalHLBEData = useMemo(
    () =>
      trades.some(
        (t) => isLocalHighLowLiquidated(t.local_high_low) && t.break_even === true
      ),
    [trades]
  );
  const hasPartialsBEData = useMemo(
    () => trades.some((t) => t.break_even === true && t.partials_taken === true),
    [trades]
  );
  const hasAvgDisplacementData = useMemo(
    () =>
      trades.some(
        (t) => typeof t.displacement_size === 'number' && t.displacement_size > 0
      ),
    [trades]
  );
  const hasDisplacementSizeData = useMemo(
    () => trades.some((t) => typeof t.displacement_size === 'number'),
    [trades]
  );
  const hasLocalHLData = useMemo(
    () =>
      (localHLStats.liquidated?.total ?? 0) > 0 ||
      (localHLStats.notLiquidated?.total ?? 0) > 0,
    [localHLStats]
  );
  const hasFvgSizeData = useMemo(
    () => trades.some((t) => typeof t.fvg_size === 'number'),
    [trades]
  );
  const hasSetupData = setupStats.length > 0;
  const hasLiquidityData = liquidityStats.length > 0;

  const aboveRiskPerTradeRow = useMemo(
    () => ({
      evaluationStats,
      reentryStats,
      breakEvenStats,
      trendStats,
      chartsLoadingState: false,
      includeTotalTrades: true,
      showEvaluationCard:
        hasCard('evaluation_stats') && evaluationStats.length > 0,
      showTrendCard: hasCard('trend_stats') && trendStats.length > 0,
    }),
    [evaluationStats, reentryStats, breakEvenStats, trendStats, strategy.extra_cards]
  );

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-50 w-full">
      <main className="flex-1 w-full mt-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm themed-badge-live">
              <Share2 className="h-3.5 w-3.5" />
              <span>Read-only shared view</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {strategy.name}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                Public snapshot of this strategy&apos;s performance for the selected period. Trades
                and notes are hidden; only aggregated statistics are shown.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="themed-badge-live text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full"
              >
                {shareData.mode.toUpperCase()} MODE
              </Badge>
              <Badge
                variant="outline"
                className="text-[11px] font-medium uppercase tracking-wide rounded-full border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-200 px-3 py-1 backdrop-blur-sm"
              >
                {dateRangeLabel}
              </Badge>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-1 text-[11px] text-slate-600 dark:text-slate-300 backdrop-blur-sm">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Viewer cannot edit or see individual trades</span>
            </div>
          </div>
        </header>

        <hr className="col-span-full my-8 border-t border-slate-200 dark:border-slate-700" />

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

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Trades calendar</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              See how trades are distributed across days and weeks in this shared period.
            </p>
          </div>
          <TradesCalendarCard
            currentDate={currentDate}
            onMonthNavigate={handleMonthNavigate}
            canNavigateMonth={canNavigateMonth}
            weeklyStats={weeklyStats}
            calendarMonthTrades={calendarMonthTrades}
            selectedMarket="all"
            currencySymbol={currencySymbol}
            accountBalance={accountBalance ?? 0}
            getDaysInMonth={() => daysInMonth}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Core statistics</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Win rate, profit, R-multiples, streaks, and more computed from this shared period.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <TradingOverviewStats
              trades={trades}
              currencySymbol={currencySymbol}
              hydrated={hydrated}
              accountBalance={accountBalance ?? undefined}
              viewMode="dateRange"
              showTitle={false}
              partialRowProps={partialRowProps}
              aboveRiskPerTradeRow={aboveRiskPerTradeRow}
              allTradesRiskStats={allTradesRiskStats}
              hideEmptyChartCards
            />
          </div>
        </section>

        {(hasConfidenceData || hasMindStateData) && (
          <section className="space-y-4">
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

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Equity curve</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Cumulative P&amp;L over the shared period, starting from zero.
            </p>
          </div>
          <EquityCurveCard trades={trades} currencySymbol={currencySymbol} />
        </section>

        <section className="space-y-4">
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

        <section className="space-y-4">
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

        {hasMarketData && (
          <div className="my-8">
            <MarketStatisticsCard
              marketStats={marketStats}
              isLoading={false}
              includeTotalTrades
            />
          </div>
        )}

        {hasMarketData && (
          <div className="my-8">
            <MarketProfitStatisticsCard
              trades={trades}
              marketStats={marketStats}
              chartOptions={chartOptions}
              getCurrencySymbol={getCurrencySymbol}
            />
          </div>
        )}

        {hasTimeIntervalData && (
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          (hasCard('launch_hour') && hasLaunchHourData)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
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
          </div>
        )}

        {((hasCard('local_hl_be_stats') && hasLocalHLBEData) ||
          (hasCard('partials_be_stats') && hasPartialsBEData)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
            {hasCard('local_hl_be_stats') && hasLocalHLBEData && (
              <LocalHLBEStatisticsCard trades={trades} isLoading={false} />
            )}
            {hasCard('partials_be_stats') && hasPartialsBEData && (
              <PartialsBEStatisticsCard trades={trades} isLoading={false} />
            )}
          </div>
        )}

        {((hasCard('avg_displacement') && hasAvgDisplacementData) ||
          (hasCard('displacement_size') && hasDisplacementSizeData)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
            {hasCard('avg_displacement') && hasAvgDisplacementData && (
              <AverageDisplacementSizeCard trades={trades} isLoading={false} />
            )}
            {hasCard('displacement_size') && hasDisplacementSizeData && (
              <DisplacementSizeStats trades={trades} isLoading={false} />
            )}
          </div>
        )}

        {((hasCard('local_hl_stats') && hasLocalHLData) ||
          (hasCard('fvg_size') && hasFvgSizeData)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
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

        <Footer />
      </main>
    </div>
  );
}

