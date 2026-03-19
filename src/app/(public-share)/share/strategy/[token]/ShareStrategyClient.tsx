'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import type { Trade } from '@/types/trade';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { StrategyShareRow } from '@/lib/server/publicShares';
import type { SharePageStats } from './sharePageStats';
import { TradeCardsView } from '@/components/trades/TradeCardsView';
import { TradingOverviewStats } from '@/components/dashboard/analytics/TradingOverviewStats';
import { EquityCurveCard } from '@/components/dashboard/analytics/EquityCurveCard';
import {
  MonthlyPerformanceChart,
  computeFullMonthlyStatsFromTrades,
} from '@/components/dashboard/analytics/MonthlyPerformanceChart';
import { RiskRewardStats } from '@/components/dashboard/analytics/RiskRewardStats';
import { SetupStatisticsCard } from '@/components/dashboard/analytics/SetupStatisticsCard';
import { LiquidityStatisticsCard } from '@/components/dashboard/analytics/LiquidityStatisticsCard';
import {
  AccountOverviewCard,
  MONTHS,
  computeMonthlyStatsFromTrades,
  calculateTotalYearProfit,
  calculatePnlPercentFromOverview,
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
import { Card, CardContent } from '@/components/ui/card';
import { Footer } from '@/components/shared/Footer';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Info,
  Lock,
  Share2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buildEquityPointsFromTrades } from '@/components/dashboard/analytics/EquityCurveCard';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { TotalTradesDonut } from '@/components/dashboard/analytics/TotalTradesChartCard';
import { SummaryHalfGauge } from '@/components/dashboard/analytics/SummaryHalfGauge';
import { MonteCarloCard, MONTE_CARLO_MIN_TRADES } from '@/components/trades/MonteCarloCard';
import { calculateTradingOverviewStats } from '@/utils/calculateTradingOverviewStats';
import { calculateAverageDrawdown } from '@/utils/analyticsCalculations';
import { useDarkMode } from '@/hooks/useDarkMode';

type ShareStrategyClientProps = {
  trades: Trade[];
  precomputedStats: SharePageStats;
  strategy: {
    name: string;
    extra_cards: ExtraCardKey[];
  };
  shareData: StrategyShareRow;
  currencySymbol: string;
  accountBalance: number | null;
  isPro: boolean;
};

function SharedMyTradesView({
  trades,
  strategyName,
  currencySymbol,
  accountBalance,
  extraCards,
  isPro,
}: {
  trades: Trade[];
  strategyName: string;
  currencySymbol: string;
  accountBalance: number | null;
  extraCards: string[];
  isPro: boolean;
}) {
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const { isDark } = useDarkMode();

  const markets = useMemo(
    () => Array.from(new Set(trades.map((t) => t.market).filter(Boolean))),
    [trades]
  );

  const filteredTrades = useMemo(() => {
    if (selectedMarket === 'all') return trades;
    return trades.filter((t) => t.market === selectedMarket);
  }, [trades, selectedMarket]);

  const monthlyStatsForPeriod = useMemo(
    () => computeMonthlyStatsFromTrades(filteredTrades),
    [filteredTrades]
  );
  const netCumulativePnl = useMemo(
    () => calculateTotalYearProfit(monthlyStatsForPeriod),
    [monthlyStatsForPeriod]
  );
  const pnlPercent = useMemo(() => {
    const base = accountBalance ?? 1;
    return (netCumulativePnl / base) * 100;
  }, [netCumulativePnl, accountBalance]);

  const equityChartData = useMemo(() => buildEquityPointsFromTrades(filteredTrades), [filteredTrades]);
  const hasEquityData = equityChartData.length > 0;

  const totalTrades = filteredTrades.length;
  const wins = useMemo(
    () => filteredTrades.filter((t) => !t.break_even && t.trade_outcome === 'Win').length,
    [filteredTrades]
  );
  const losses = useMemo(
    () => filteredTrades.filter((t) => !t.break_even && t.trade_outcome === 'Lose').length,
    [filteredTrades]
  );
  const beTrades = useMemo(
    () => filteredTrades.filter((t) => t.break_even || t.trade_outcome === 'BE').length,
    [filteredTrades]
  );

  const overviewStats = useMemo(
    () => calculateTradingOverviewStats(filteredTrades),
    [filteredTrades]
  );

  const averageDrawdown = useMemo(
    () => calculateAverageDrawdown(filteredTrades, accountBalance ?? 0),
    [filteredTrades, accountBalance],
  );
  const normalizedAverageDrawdown = useMemo(() => {
    const capped = Math.max(0, Math.min(averageDrawdown, 20));
    return (capped / 20) * 100;
  }, [averageDrawdown]);

  const avgDrawdownTooltipContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Average Drawdown Interpretation
      </div>
      <div className="space-y-2">
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all',
            averageDrawdown <= 2
              ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30'
          )}
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔹 0% – 2%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Excellent — Very low average drawdown, consistent performance.
          </div>
        </div>
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all',
            averageDrawdown > 2 && averageDrawdown <= 5
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30'
          )}
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">✅ 2% – 5%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Healthy — Acceptable average drawdown for most strategies.
          </div>
        </div>
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all',
            averageDrawdown > 5 && averageDrawdown <= 10
              ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30'
          )}
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">⚠️ 5% – 10%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Moderate — Higher average drawdown, monitor risk management.
          </div>
        </div>
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all',
            averageDrawdown > 10 && averageDrawdown <= 15
              ? 'bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30'
          )}
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">❗ 10% – 15%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            High Risk — Significant average drawdown exposure.
          </div>
        </div>
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all',
            averageDrawdown > 15
              ? 'bg-red-50/80 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30'
          )}
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🚫 15%+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Danger Zone — Extreme average drawdown, immediate review required.
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Summary row: P&L + equity chart + total trades + win rate + avg drawdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Net P&amp;L
                </p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {currencySymbol}
                  {netCumulativePnl.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {netCumulativePnl >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
                <div
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                    netCumulativePnl >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {netCumulativePnl >= 0 ? '+' : ''}
                  {pnlPercent.toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-[80px]">
              {!hasEquityData ? (
                <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    No trades yet
                  </p>
                </div>
              ) : (
                <EquityCurveChart
                  data={equityChartData}
                  currencySymbol={currencySymbol}
                  hasTrades={hasEquityData}
                  isLoading={false}
                  variant="card"
                  hideAxisLabels
                />
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Total Trades
                </p>
              </div>
            </div>
            <div className="flex-1 h-32 min-h-[7rem] w-full">
              <TotalTradesDonut
                totalTrades={totalTrades}
                wins={wins}
                losses={losses}
                beTrades={beTrades}
                variant="compact"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Win Rate
                </p>
              </div>
            </div>
            <div className="flex-1 h-32 min-h-[7rem] relative w-full">
              {totalTrades === 0 ? (
                <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    No trades yet
                  </p>
                </div>
              ) : (
                <SummaryHalfGauge
                  variant="winRate"
                  valueNormalized={overviewStats.winRate}
                  centerLabel={`${overviewStats.winRate.toFixed(1)}%`}
                  minLabel="0%"
                  maxLabel="100%"
                />
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Avg Drawdown
                </p>
                <TooltipProvider>
                  <UITooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={0}
                        className="inline-flex h-3.5 w-3.5 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                        aria-label="Average drawdown info"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="center"
                      className="w-[320px] text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-700/80 bg-slate-900/90 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.7)] text-slate-50"
                      sideOffset={8}
                    >
                      {isDark && (
                        <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />
                      )}
                      <div className="relative text-left">
                        <div className="text-[11px] font-extrabold tracking-[0.18em] text-slate-300 mb-2">
                          AVERAGE DRAWDOWN INTERPRETATION
                        </div>
                        {avgDrawdownTooltipContent}
                      </div>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex-1 h-32 min-h-[7rem] relative w-full">
              {totalTrades === 0 ? (
                <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    No trades yet
                  </p>
                </div>
              ) : (
                <SummaryHalfGauge
                  variant="avgDrawdown"
                  valueNormalized={normalizedAverageDrawdown}
                  centerLabel={`${averageDrawdown.toFixed(2)}%`}
                  minLabel="0%"
                  maxLabel="20%"
                  rawValueForTooltip={averageDrawdown}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Future Equity (Monte Carlo) card — PRO only, only when enough trades for simulation */}
      {isPro && filteredTrades.length >= MONTE_CARLO_MIN_TRADES && (
        <div>
          <MonteCarloCard trades={filteredTrades} currencySymbol={currencySymbol} />
        </div>
      )}

      <TradeCardsView
        trades={filteredTrades}
        readOnly
        strategyName={strategyName}
        extraCards={extraCards}
        resetKey={selectedMarket}
        emptyMessage="No trades found."
        marketFilter={{
          selectedMarket,
          onSelectedMarketChange: setSelectedMarket,
          markets,
        }}
      />
    </div>
  );
}

export default function ShareStrategyClient({
  trades,
  precomputedStats,
  strategy,
  shareData,
  currencySymbol,
  accountBalance,
  isPro,
}: ShareStrategyClientProps) {
  const [hydrated, setHydrated] = useState(false);
  const [activeView, setActiveView] = useState<'trades' | 'analytics'>('trades');
  useEffect(() => {
    const timer = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

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

  // Precomputed server values — no client-side useMemo needed for these
  const {
    dateRangeLabel,
    setupStats, liquidityStats, marketStats, slSizeStats,
    timeIntervalChartData, dayStats, mssStats, localHLStats,
    monthlyProfitStats, totalRangeProfit, updatedBalance,
    partials: partialStatsFromTrades,
    evaluationStats, reentryStats, breakEvenStats, trendStats,
    directionStats,
    allTradesRiskStats, statsToUse, macroStatsToUse,
    calendarMonthKeys,
    hasSetupData, hasLiquidityData, hasMarketData, hasSLSizeData,
    hasTimeIntervalData, hasDayStatsData, hasMssData, hasLocalHLData,
    hasNewsNameData, hasPotentialRRData, hasLaunchHourData,
    hasAvgDisplacementData, hasDisplacementSizeData, hasFvgSizeData,
    hasConfidenceData, hasMindStateData,
  } = precomputedStats;

  // Still computed client-side — fast, pure, from compact_trades
  const monthlyStatsAllTrades = useMemo(
    () => computeFullMonthlyStatsFromTrades(trades),
    [trades]
  );

  const hasSetupCard = strategy.extra_cards.includes('setup_stats');
  const hasLiquidityCard = strategy.extra_cards.includes('liquidity_stats');

  const getCurrencySymbol = () => currencySymbol;

  // Calendar range: built from precomputed trade_months (YYYY-MM strings)
  const calendarRange = useMemo(() => {
    const sorted = [...calendarMonthKeys].sort();
    if (sorted.length === 0) {
      const fallback = startOfMonth(new Date(shareData.start_date));
      return { firstMonth: fallback, lastMonth: fallback, initialCalendarMonth: fallback };
    }
    const [fy, fm] = sorted[0].split('-').map(Number);
    const [ly, lm] = sorted[sorted.length - 1].split('-').map(Number);
    const firstMonth = new Date(fy, fm - 1, 1);
    const lastMonth = new Date(ly, lm - 1, 1);
    return { firstMonth, lastMonth, initialCalendarMonth: lastMonth };
  }, [calendarMonthKeys, shareData.start_date]);

  const { firstMonth, lastMonth } = calendarRange;

  const [currentDate, setCurrentDate] = useState(calendarRange.initialCalendarMonth);

  // When trades change, keep current month within the new range (only months with trades)
  useEffect(() => {
    const currentKey = format(currentDate, 'yyyy-MM');
    const firstKey = format(firstMonth, 'yyyy-MM');
    const lastKey = format(lastMonth, 'yyyy-MM');
    if (currentKey < firstKey || currentKey > lastKey) {
      const timer = setTimeout(() => setCurrentDate(lastMonth), 0);
      return () => clearTimeout(timer);
    }
  }, [firstMonth, lastMonth, currentDate]);

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

  const hasCard = (key: ExtraCardKey) => strategy.extra_cards.includes(key);

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
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-50 w-full">
      <main className="flex-1 w-full mt-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--tc-primary)]/50 px-3 py-1 text-xs font-medium shadow-sm bg-[var(--tc-primary)]/10 text-[var(--tc-primary)]">
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
                className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full border-[var(--tc-primary)]/60 bg-[var(--tc-primary)]/15 text-[var(--tc-primary)]"
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
            <div
              className="inline-flex items-center gap-1 rounded-full border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-1 text-[11px] backdrop-blur-sm"
              aria-label="Shared strategy view"
            >
              <button
                type="button"
                onClick={() => setActiveView('trades')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  activeView === 'trades'
                    ? 'themed-btn-primary text-white'
                    : 'text-slate-600 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/50 focus-visible:ring-[var(--tc-primary)]'
                }`}
                aria-pressed={activeView === 'trades'}
              >
                <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
                <span>My trades</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('analytics')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  activeView === 'analytics'
                    ? 'themed-btn-primary text-white'
                    : 'text-slate-600 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/50 focus-visible:ring-[var(--tc-primary)]'
                }`}
                aria-pressed={activeView === 'analytics'}
              >
                <BarChart3 className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Analytics</span>
              </button>
            </div>
          </div>
        </header>

        <hr className="col-span-full my-8 border-t border-slate-200 dark:border-slate-700" />

        {activeView === 'trades' && (
          <SharedMyTradesView
            trades={trades}
            strategyName={strategy.name}
            currencySymbol={currencySymbol}
            accountBalance={accountBalance}
            extraCards={strategy.extra_cards}
            isPro={isPro}
          />
        )}

        {activeView === 'analytics' && (
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

        {isPro && (
        <section className="space-y-4">
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

        <section className="space-y-4 mt-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Equity curve</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Cumulative P&amp;L over the shared period, starting from zero.
            </p>
          </div>
          <EquityCurveCard trades={trades} currencySymbol={currencySymbol} />
        </section>

        {isPro && (
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
        )}

        {isPro && (
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
        )}

        <Footer />
      </main>
    </div>
  );
}

