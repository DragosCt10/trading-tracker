'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
  useRef,
  type ReactNode,
} from 'react';
import {
  startOfMonth,
  endOfMonth,
  format,
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { PRO_ONLY_EXTRA_CARD_KEYS, type ExtraCardKey } from '@/constants/extraCards';

import { Trade } from '@/types/trade';
import type { AccountSettings } from '@/types/account-settings';
import type { DashboardApiResponse } from '@/types/dashboard-rpc';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';
import { useSubscription } from '@/hooks/useSubscription';
import { useStrategyDashboardContext } from '@/hooks/useStrategyDashboardContext';
import { hydrateStrategyDashboardCache } from '@/utils/hydrateStrategyDashboardCache';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
} from 'chart.js';
import { RiskRewardStats } from '@/components/dashboard/analytics/RiskRewardStats';
import MarketProfitStatisticsCard from '@/components/dashboard/analytics/MarketProfitStats';
import { MonthPerformanceCards } from '@/components/dashboard/analytics/MonthPerformanceCard';
import {
  AccountOverviewCard,
} from '@/components/dashboard/analytics/AccountOverviewCard';
import {
  MONTHS,
  calculatePnlPercentFromOverview,
  calculateTotalYearProfit,
  calculateUpdatedBalance,
  computeMonthlyStatsFromTrades,
  getCurrencySymbolFromAccount,
} from '@/utils/accountOverviewHelpers';
import { ViewModeToggle } from '@/components/dashboard/analytics/ViewModeToggle';
import { YearSelector } from '@/components/dashboard/analytics/YearSelector';
import { AnalysisModal } from '@/components/dashboard/analytics/AnalysisModal';
import { TradingOverviewStats } from '@/components/dashboard/analytics/TradingOverviewStats';
import type { RiskAnalysis } from '@/components/dashboard/analytics/RiskPerTrade';
import { MonthlyPerformanceChart, computeFullMonthlyStatsFromTrades } from '@/components/dashboard/analytics/MonthlyPerformanceChart';
import { DateRangeValue, TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { 
  TradesCalendarCard,
  getDaysInMonthForDate,
  buildWeeklyStats,
} from '@/components/dashboard/analytics/TradesCalendarCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import {
  SetupStatisticsCard,
  convertSetupStatsToChartData,
  convertFilteredSetupStatsToChartData,
} from '@/components/dashboard/analytics/SetupStatisticsCard';
import {
  LiquidityStatisticsCard,
} from '@/components/dashboard/analytics/LiquidityStatisticsCard';
import {
  LocalHLStatisticsCard,
} from '@/components/dashboard/analytics/LocalHLStatisticsCard';
import {
  SLSizeStatisticsCard,
} from '@/components/dashboard/analytics/SLSizeStatisticsCard';
import {
  type ReentryTradesChartCardProps,
} from '@/components/dashboard/analytics/ReentryTradesChartCard';
import {
  DayStatisticsCard,
  type DayStatisticsCardProps,
} from '@/components/dashboard/analytics/DayStatisticsCard';
import {
  MSSStatisticsCard,
} from '@/components/dashboard/analytics/MSSStatisticsCard';
import { NewsNameChartCard } from '@/components/dashboard/analytics/NewsNameChartCard';
import {
  MarketStatisticsCard,
  type MarketStatisticsCardProps,
} from '@/components/dashboard/analytics/MarketStatisticsCard';
import { TimeIntervalStatisticsCard } from '@/components/dashboard/analytics/TimeIntervalStatisticsCard';
import type { EvaluationStat } from '@/utils/calculateEvaluationStats';
import {
  LaunchHourTradesCard,
} from '@/components/dashboard/analytics/LaunchHourTradesCard';
import {
  DisplacementSizeStats,
} from '@/components/dashboard/analytics/DisplacementSizeStats';
import {
  AverageDisplacementSizeCard,
} from '@/components/dashboard/analytics/AverageDisplacementSizeCard';
import {
  FvgSizeStats,
} from '@/components/dashboard/analytics/FvgSizeStats';
import dynamic from 'next/dynamic';
import { chartOptions } from '@/utils/chartConfig';
import { computeRecoveryFactorAndDrawdownCount } from '@/utils/analyticsCalculations';

// Below-fold components: code-split so they don't block the initial bundle parse.
const ProfitFactorChart      = dynamic(() => import('@/components/dashboard/analytics/ProfitFactorChart').then(m => ({ default: m.ProfitFactorChart })));
const SharpeRatioChart       = dynamic(() => import('@/components/dashboard/analytics/SharpeRatioChart').then(m => ({ default: m.SharpeRatioChart })));
const RecoveryFactorChart    = dynamic(() => import('@/components/dashboard/analytics/RecoveryFactorChart').then(m => ({ default: m.RecoveryFactorChart })));
const DrawdownCountChart     = dynamic(() => import('@/components/dashboard/analytics/DrawdownCountChart').then(m => ({ default: m.DrawdownCountChart })));
const AverageDrawdownChart = dynamic(() => import('@/components/dashboard/analytics/AverageDrawdownChart').then(m => ({ default: m.AverageDrawdownChart })));
const MaxDrawdownChart     = dynamic(() => import('@/components/dashboard/analytics/MaxDrawdownChart').then(m => ({ default: m.MaxDrawdownChart })));
const TQIChart             = dynamic(() => import('@/components/dashboard/analytics/TQIChart').then(m => ({ default: m.TQIChart })));
const ConsistencyScoreChart = dynamic(() => import('@/components/dashboard/analytics/ConsistencyScoreChart').then(m => ({ default: m.ConsistencyScoreChart })));
const EquityCurveCard      = dynamic(() => import('@/components/dashboard/analytics/EquityCurveCard').then(m => ({ default: m.EquityCurveCard })));
const ConfidenceStatsCard  = dynamic(() => import('@/components/dashboard/analytics/ConfidenceMindStateCards').then(m => ({ default: m.ConfidenceStatsCard })));
const MindStateStatsCard   = dynamic(() => import('@/components/dashboard/analytics/ConfidenceMindStateCards').then(m => ({ default: m.MindStateStatsCard })));

import {
  type DateRangeState,
  type FilterType,
  createInitialDateRange,
  isCustomDateRange,
  createAllTimeRange,
} from '@/utils/dateRangeHelpers';
import { getFilteredTrades } from '@/lib/server/trades';
import { useDateRangeManagement } from '@/hooks/useDateRangeManagement';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { useFilteredStats } from '@/hooks/useFilteredStats';
import { calculateFilteredMacroStats } from '@/utils/calculateFilteredMacroStats';
import {
  computeStrategyStatsFromTrades,
  convertIntervalStatsToChartData,
} from '@/utils/computeStrategyStatsFromTrades';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/* ---------------------------------------------------------
 * Props from server (StrategyData)
 * ------------------------------------------------------ */

export type StrategyClientInitialProps = {
  initialUserId: string;
  initialFilteredTrades: Trade[];
  initialAllTrades: Trade[];
  initialNonExecutedTrades: Trade[];
  initialNonExecutedTotalTradesCount: number;
  initialDateRange: DateRangeState;
  initialSelectedYear: number;
  initialMode: 'live' | 'backtesting' | 'demo';
  initialActiveAccount: { id: string; [key: string]: unknown } | null;
  initialStrategyId: string | null;
  initialStrategyName: string | null;
  initialExtraCards: ExtraCardKey[];
  /** Server-fetched dashboard stats (API shape) for initial hydration — avoids client /api/dashboard-stats call (audit 2.1). */
  initialDashboardStats?: DashboardApiResponse | null;
};

const defaultInitialRange = createInitialDateRange();
const defaultSelectedYear = new Date().getFullYear();
type FullWidthSectionKey =
  | 'overview'
  | 'calendar'
  | 'coreStatistics'
  | 'psychologicalFactors'
  | 'equityCurve'
  | 'consistencyDrawdown'
  | 'performanceRatios'
  | 'monthlyPerformanceChart'
  | 'marketStats'
  | 'marketProfitStats'
  | 'timeIntervalStats'
  | 'dayStats'
  | 'newsByEvent'
  | 'setupStats'
  | 'liquidityStats';
type ExecutionFilter = 'all' | 'executed' | 'nonExecuted';

const DEFAULT_SECTION_EXPANDED: Record<FullWidthSectionKey, boolean> = {
  overview: true,
  calendar: true,
  coreStatistics: true,
  psychologicalFactors: true,
  equityCurve: true,
  consistencyDrawdown: true,
  performanceRatios: true,
  monthlyPerformanceChart: true,
  marketStats: true,
  marketProfitStats: true,
  timeIntervalStats: true,
  dayStats: true,
  newsByEvent: true,
  setupStats: true,
  liquidityStats: true,
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function applyExecutionFilter(trades: Trade[], selectedExecution: ExecutionFilter): Trade[] {
  if (selectedExecution === 'nonExecuted') {
    return trades.filter((trade) => trade.executed !== true);
  }
  if (selectedExecution === 'executed') {
    return trades.filter((trade) => trade.executed === true);
  }
  return trades;
}

function applyMarketFilter(trades: Trade[], selectedMarket: string): Trade[] {
  if (selectedMarket === 'all') {
    return trades;
  }
  return trades.filter((trade) => trade.market === selectedMarket);
}

function parseTradeDateToTimestamp(tradeDate: Trade['trade_date']): number | null {
  if (!tradeDate) {
    return null;
  }

  if (typeof tradeDate === 'string' && DATE_ONLY_REGEX.test(tradeDate)) {
    const [year, month, day] = tradeDate.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  const parsedDate = new Date(tradeDate);
  const timestamp = parsedDate.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getTradeMonthKey(tradeDate: Trade['trade_date']): string | null {
  if (!tradeDate) {
    return null;
  }

  if (typeof tradeDate === 'string') {
    return tradeDate.length >= 7 ? tradeDate.slice(0, 7) : null;
  }

  const timestamp = parseTradeDateToTimestamp(tradeDate);
  if (timestamp == null) {
    return null;
  }
  return format(new Date(timestamp), 'yyyy-MM');
}

type SectionHeadingProps = {
  title: string;
  description: string;
  action?: ReactNode;
  containerClassName?: string;
  descriptionClassName?: string;
};

function SectionHeading({
  title,
  description,
  action,
  containerClassName,
  descriptionClassName,
}: SectionHeadingProps) {
  return (
    <>
      <div className={cn('flex items-center justify-between mt-14 mb-2', containerClassName)}>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        {action ?? null}
      </div>
      <p className={cn('text-slate-500 dark:text-slate-400 mb-6', descriptionClassName)}>
        {description}
      </p>
    </>
  );
}

type StrategyControlsProps = {
  viewMode: 'yearly' | 'dateRange';
  onViewModeChange: (mode: 'yearly' | 'dateRange') => void;
  isPro: boolean;
  showProCards: boolean;
  onShowProCardsChange: (value: boolean) => void;
  dateRange: DateRangeState;
  setDateRange: (range: DateRangeValue) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  isCustomRange: boolean;
  selectedMarket: string;
  onSelectedMarketChange: (market: string) => void;
  markets: string[];
  selectedExecution: ExecutionFilter;
  onSelectedExecutionChange: (execution: ExecutionFilter) => void;
  displayStartDate: string | undefined;
};

function StrategyControls(props: StrategyControlsProps) {
  const {
    viewMode,
    onViewModeChange,
    isPro,
    showProCards,
    onShowProCardsChange,
    dateRange,
    setDateRange,
    activeFilter,
    onFilterChange,
    isCustomRange,
    selectedMarket,
    onSelectedMarketChange,
    markets,
    selectedExecution,
    onSelectedExecutionChange,
    displayStartDate,
  } = props;

  return (
    <>
      <ViewModeToggle
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        isPro={isPro}
        showProCards={showProCards}
        onShowProCardsChange={onShowProCardsChange}
      />

      {/* Date Range and Filter Buttons - Only show when in dateRange mode, above AccountOverviewCard */}
      {viewMode === 'dateRange' && (
        <TradeFiltersBar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          isCustomRange={isCustomRange}
          selectedMarket={selectedMarket}
          onSelectedMarketChange={onSelectedMarketChange}
          markets={markets}
          selectedExecution={selectedExecution}
          onSelectedExecutionChange={onSelectedExecutionChange}
          displayStartDate={displayStartDate}
        />
      )}

      <hr className="my-10 border-t border-slate-200 dark:border-slate-700" />
    </>
  );
}

type UseAllTimePrefetchParams = {
  isLoadingStats: boolean;
  resolvedAccountId?: string;
  resolvedAccountBalance?: number;
  userId?: string;
  mode: 'live' | 'demo' | 'backtesting';
  strategyId: string | null;
  selectedYear: number;
  selectedExecution: ExecutionFilter;
  selectedMarket: string;
  includeCompactTrades: boolean;
  queryClient: QueryClient;
};

function useAllTimePrefetch({
  isLoadingStats,
  resolvedAccountId,
  resolvedAccountBalance,
  userId,
  mode,
  strategyId,
  selectedYear,
  selectedExecution,
  selectedMarket,
  includeCompactTrades,
  queryClient,
}: UseAllTimePrefetchParams) {
  const runAllTimePrefetch = useRef<(() => void) | null>(null);

  const doAllTimePrefetch = useCallback(() => {
    if (isLoadingStats || !resolvedAccountId || !userId || !mode) {
      return;
    }

    const { startDate: allStart, endDate: allEnd } = createAllTimeRange();

    // 1. Prefetch dashboardStats all-time (for "All Trades" filter switch)
    const dashKey = queryKeys.dashboardStats(
      mode,
      resolvedAccountId,
      userId,
      strategyId,
      selectedYear,
      'dateRange',
      allStart,
      allEnd,
      selectedExecution,
      selectedMarket,
    );
    if (queryClient.getQueryData(dashKey) === undefined) {
      void queryClient.prefetchQuery({
        queryKey: dashKey,
        queryFn: async () => {
          const params = new URLSearchParams({
            accountId: resolvedAccountId,
            mode,
            startDate: allStart,
            endDate: allEnd,
            accountBalance: String(resolvedAccountBalance ?? 0),
            execution: selectedExecution,
            market: selectedMarket,
            ...(strategyId ? { strategyId } : {}),
            ...(includeCompactTrades ? { includeCompactTrades: 'true' } : {}),
          });
          const response = await fetch(`/api/dashboard-stats?${params}`);
          if (!response.ok) {
            return null;
          }
          return response.json();
        },
        ...TRADES_DATA,
      });
    }

    // 2 & 3. Fetch full Trade[] once, seed under both page-specific keys
    const myTradesKey = queryKeys.trades.filtered(
      mode,
      resolvedAccountId,
      userId,
      'dateRange',
      allStart,
      allEnd,
      strategyId
    );
    const dailyJournalKey = queryKeys.trades.filtered(
      mode,
      resolvedAccountId,
      userId,
      'all',
      allStart,
      allEnd,
      strategyId
    );
    const needsMyTrades = queryClient.getQueryData(myTradesKey) === undefined;
    const needsDailyJournal = queryClient.getQueryData(dailyJournalKey) === undefined;

    if (needsMyTrades || needsDailyJournal) {
      void getFilteredTrades({
        userId,
        accountId: resolvedAccountId,
        mode,
        startDate: allStart,
        endDate: allEnd,
        includeNonExecuted: true,
        strategyId,
      })
        .then((trades) => {
          if (needsMyTrades) {
            queryClient.setQueryData(myTradesKey, trades);
          }
          if (needsDailyJournal) {
            queryClient.setQueryData(dailyJournalKey, trades);
          }
        })
        .catch(() => {
          // Pages will fetch on demand if this fails.
        });
    }
  }, [
    includeCompactTrades,
    isLoadingStats,
    mode,
    queryClient,
    resolvedAccountBalance,
    resolvedAccountId,
    selectedExecution,
    selectedMarket,
    selectedYear,
    strategyId,
    userId,
  ]);

  useEffect(() => {
    doAllTimePrefetch();
    runAllTimePrefetch.current = doAllTimePrefetch;
  }, [doAllTimePrefetch]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && runAllTimePrefetch.current) {
        runAllTimePrefetch.current();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}

/* ---------------------------------------------------------
 * Dashboard component
 * ------------------------------------------------------ */

export default function StrategyClient(
  props?: Partial<StrategyClientInitialProps>
) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const initialRange = props?.initialDateRange ?? defaultInitialRange;
  const initialYear = props?.initialSelectedYear ?? defaultSelectedYear;

  const [analysisResults, setAnalysisResults] = useState<string | null>(null);
  const [openAnalyzeModal, setOpenAnalyzeModal] = useState(false);
  const [calendarTradeDetails, setCalendarTradeDetails] = useState<Trade | null>(null);

  // view mode: 'yearly' or 'dateRange'
  const [viewMode, setViewMode] = useState<'yearly' | 'dateRange'>('dateRange');
  const [showProCards, setShowProCards] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<FullWidthSectionKey, boolean>>(
    () => DEFAULT_SECTION_EXPANDED
  );
  // startTransition marks filter/view-mode changes as non-urgent so React can yield to
  // user input before re-running the heavy useMemo chains — fixes INP > 200 ms.
  const [, startFilterTransition] = useTransition();

  // date range + calendar state management
  const {
    dateRange,
    setDateRange,
    calendarDateRange,
    setCalendarDateRange,
    currentDate,
    setCurrentDate,
    selectedYear,
    setSelectedYear,
    activeFilter,
    setActiveFilter,
    updateCalendarFromDateRange,
    updateDateRangeForYearlyMode,
    resetFilterOnModeSwitch,
    handleFilter,
  } = useDateRangeManagement(initialRange);
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [selectedExecution, setSelectedExecution] = useState<ExecutionFilter>('executed');

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const {
    userDetails: userData,
    userLoading,
    selection,
    actionBarloading,
    userId,
    activeAccount,
    resolvedAccount,
  } = useStrategyDashboardContext({
    initialUserId: props?.initialUserId ?? '',
    initialMode: props?.initialMode ?? 'live',
    initialActiveAccount: props?.initialActiveAccount ?? null,
  });

  // Store strategyId from props
  const strategyId = props?.initialStrategyId ?? null;

  const { isPro } = useSubscription({ userId: props?.initialUserId });
  /** PRO subscribers always see PRO sections; toggle only applies to Starter. */
  const showProContent = isPro || showProCards;
  const toggleSection = useCallback((key: FullWidthSectionKey) => {
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  }, []);
  const isSectionExpanded = useCallback(
    (key: FullWidthSectionKey) => !isPro || expandedSections[key],
    [expandedSections, isPro]
  );
  const renderSectionCollapseButton = useCallback(
    (key: FullWidthSectionKey) => {
      if (!isPro) {
        return null;
      }
      const expanded = isSectionExpanded(key);
      return (
        <button
          type="button"
          onClick={() => toggleSection(key)}
          aria-expanded={expanded}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors [&_svg]:text-slate-700 dark:[&_svg]:text-slate-200"
        >
          <ChevronDown
            size={16}
            strokeWidth={2}
            className={cn(
              'shrink-0 transition-transform duration-200 ease-out',
              expanded ? '-rotate-180' : 'rotate-0'
            )}
            aria-hidden
          />
          {expanded ? 'Hide' : 'Expand'}
        </button>
      );
    },
    [isPro, isSectionExpanded, toggleSection]
  );

  // Per-strategy extra cards configuration
  const extraCards = useMemo(() => props?.initialExtraCards ?? [], [props?.initialExtraCards]);
  const extraCardsSet = useMemo(() => new Set(extraCards), [extraCards]);
  const hasCard = useCallback((key: ExtraCardKey) => extraCardsSet.has(key), [extraCardsSet]);

  // compact_trades is only needed for extra cards whose components read fields
  // that are not in series[]: launch_hour, displacement_size, fvg_size, risk_reward_ratio_long.
  // All other components (EquityCurveCard, ConfidenceStatsCard, NewsNameChartCard, etc.)
  // now get their data from series[] which includes market, executed, confidence_at_entry,
  // mind_state_at_entry, news_name. ~60% smaller payload for most strategies.
  const includeCompactTrades = extraCards.some((k) =>
    (['launch_hour', 'avg_displacement', 'displacement_size', 'fvg_size', 'potential_rr'] as ExtraCardKey[]).includes(k)
  );

  // Hydrate React Query cache once on mount. Calling setQueryData during render is a
  // side-effect anti-pattern — moved to useEffect to prevent infinite render loops.
  useEffect(() => {
    hydrateStrategyDashboardCache({
      queryClient,
      props,
      strategyId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount with server initial data
  }, []);

  const currencySymbol = useMemo(
    () =>
      getCurrencySymbolFromAccount(
        activeAccount as
          | { currency?: string | null }
          | undefined
      ),
    [activeAccount]
  );
  const getCurrencySymbol = useCallback(() => currencySymbol, [currencySymbol]);
  
  // update calendar when main date range changes (without allTrades dependency - handled separately)
  useEffect(() => {
    updateCalendarFromDateRange(viewMode);
  }, [dateRange, viewMode, updateCalendarFromDateRange]);

  // update dateRange when switching to yearly mode or when selectedYear changes
  useEffect(() => {
    updateDateRangeForYearlyMode(viewMode);
  }, [viewMode, selectedYear, updateDateRangeForYearlyMode]);

  // reset filter to '30days' when switching back to dateRange mode from yearly mode
  useEffect(() => {
    resetFilterOnModeSwitch(viewMode);
  }, [viewMode, resetFilterOnModeSwitch]);

  const {
    allTrades,
    filteredTrades,
    calendarMonthTrades,
    filteredTradesLoading,
    allTradesLoading,
    stats,
    monthlyStats,
    localHLStats,
    setupStats,
    liquidityStats,
    directionStats,
    intervalStats,
    mssStats,
    sessionStats,
    newsStats,
    dayStats,
    marketStats,
    marketAllTradesStats,
    slSizeStats,
    macroStats,
    evaluationStats,
    nonExecutedTrades,
    nonExecutedTotalTradesCount,
    yearlyPartialTradesCount,
    yearlyPartialsBECount,
    allTradesRiskStats,
    riskStats,
    tradeMonths,
    isLoadingStats,
    reentryStats,
    breakEvenStats,
    trendStats,
  } = useDashboardData({
    session: userData?.session,
    dateRange,
    mode: selection.mode,
    activeAccount: (resolvedAccount ?? null) as AccountSettings | null,
    contextLoading: actionBarloading,
    isSessionLoading: userLoading,
    calendarDateRange,
    selectedYear,
    selectedMarket,
    strategyId,
    viewMode,
    selectedExecution,
    includeCompactTrades,
  });

  const baseTrades = useMemo(
    () => (viewMode === 'yearly' ? allTrades : filteredTrades),
    [viewMode, allTrades, filteredTrades]
  );
  const tradesToUse = useMemo(() => {
    if (selectedExecution === 'nonExecuted') {
      return nonExecutedTrades ?? [];
    }
    return applyExecutionFilter(baseTrades, selectedExecution);
  }, [baseTrades, nonExecutedTrades, selectedExecution]);

  // tradeMonths from RPC covers all trades (no execution filter).
  // When non-executed filter is active, derive months from nonExecutedTrades instead.
  const filteredTradeMonths = useMemo(() => {
    if (selectedExecution === 'nonExecuted') {
      const months = new Set<string>();
      for (const t of nonExecutedTrades) {
        const monthKey = getTradeMonthKey(t.trade_date);
        if (monthKey) {
          months.add(monthKey);
        }
      }
      return Array.from(months).sort();
    }
    return tradeMonths;
  }, [selectedExecution, nonExecutedTrades, tradeMonths]);

  // Calendar navigation logic
  const {
    canNavigateMonth,
    handleMonthNavigation,
  } = useCalendarNavigation({
    viewMode,
    dateRange,
    currentDate,
    selectedYear,
    selectedMarket,
    selectedExecution,
    tradeMonths: filteredTradeMonths,
    statsLoading: isLoadingStats,
    setCurrentDate,
    setCalendarDateRange,
    setSelectedYear,
  });


  // Background-prefetch all-time data after initial stats load and on tab re-focus.
  // Seeds three cache entries so subsequent filter/page switches are instant.
  useAllTimePrefetch({
    isLoadingStats,
    resolvedAccountId: resolvedAccount?.id,
    resolvedAccountBalance: (resolvedAccount as { account_balance?: number } | null)?.account_balance,
    userId: userData?.user?.id,
    mode: selection.mode,
    strategyId,
    selectedYear,
    selectedExecution,
    selectedMarket,
    includeCompactTrades,
    queryClient,
  });

  // session check
  useEffect(() => {
    if (!userLoading && !userData?.session) {
      router.replace('/login');
    }
  }, [userLoading, userData, router]);

  // streaming analysis listener
  useEffect(() => {
    const handleAnalysisUpdate = (event: CustomEvent) => {
      setAnalysisResults(event.detail);
    };

    window.addEventListener(
      'analysisUpdate',
      handleAnalysisUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        'analysisUpdate',
        handleAnalysisUpdate as EventListener
      );
    };
  }, []);

  const setupChartData: TradeStatDatum[] = useMemo(
    () => convertSetupStatsToChartData(setupStats),
    [setupStats]
  );

  const timeIntervalChartData: TradeStatDatum[] = useMemo(
    () => convertIntervalStatsToChartData(intervalStats),
    [intervalStats]
  );


  // Use correct market stats based on view mode
  const marketStatsToUse = viewMode === 'yearly' ? marketAllTradesStats : marketStats;

  const earliestTradeDate = useMemo(() => {
    if (activeFilter !== 'all' || filteredTrades.length === 0) return undefined;
    return filteredTrades.reduce((min, t) => t.trade_date < min ? t.trade_date : min, filteredTrades[0].trade_date);
  }, [activeFilter, filteredTrades]);

  // Category stats come from the DB (already market + execution filtered via the RPC).
  // No client-side recalculation needed — the API query key includes selectedMarket and
  // selectedExecution, so a new RPC call fires whenever either filter changes.

  // Compute filtered statistics when filters are applied
  const {
    filteredChartStats,
    filteredRiskStats,
    filteredMarketStats,
    filteredEvaluationStats,
    statsToUseForCharts,
  } = useFilteredStats({
    viewMode,
    selectedMarket,
    selectedExecution,
    tradesToUse,
    accountBalance: selection.activeAccount?.account_balance || 0,
    hookStats: {
      setupStats,
      liquidityStats,
      directionStats,
      localHLStats,
      slSizeStats,
      reentryStats,
      breakEvenStats,
      trendStats,
      intervalStats,
      mssStats,
      newsStats,
      dayStats,
      marketStats: viewMode === 'yearly' ? marketAllTradesStats : marketStats,
    },
  });

  // Recompute chart data arrays using filtered stats when filters are applied
  const setupChartDataFiltered: TradeStatDatum[] = useMemo(
    () => convertFilteredSetupStatsToChartData(statsToUseForCharts.setupStats),
    [statsToUseForCharts.setupStats]
  );

  const timeIntervalChartDataFiltered: TradeStatDatum[] = useMemo(
    () => convertIntervalStatsToChartData(statsToUseForCharts.intervalStats),
    [statsToUseForCharts.intervalStats]
  );

  // Use filtered chart data when filters are applied, otherwise use original
  const setupChartDataToUse = filteredChartStats ? setupChartDataFiltered : setupChartData;
  const timeIntervalChartDataToUse = filteredChartStats ? timeIntervalChartDataFiltered : timeIntervalChartData;

  // Determine loading state for charts
  // When filters are applied, data is computed synchronously, so isLoading should be false
  // Otherwise, use the appropriate loading state based on view mode
  // Also check if chart data has content - if it does, don't show loading
  const chartsLoadingState = useMemo(() => {
    if (filteredChartStats) {
      // Filters are applied (market filter), data computed synchronously
      return false;
    }
    
    // Check if chart data has content - if it does, data is ready, don't show loading
    const hasChartData = setupChartDataToUse.length > 0 && 
                         setupChartDataToUse.some(d => 
                           (d.wins ?? 0) > 0 || 
                           (d.losses ?? 0) > 0 || 
                           (d.breakEven ?? 0) > 0
                         );
    
    if (hasChartData) {
      return false;
    }
    
    // No filters applied and no data yet, use normal loading state
    return viewMode === 'yearly' ? allTradesLoading : filteredTradesLoading;
  }, [filteredChartStats, viewMode, allTradesLoading, filteredTradesLoading, setupChartDataToUse]);

  // All data comes from the API — always use the hook loading state.
  const accountOverviewLoadingState = viewMode === 'yearly' ? allTradesLoading : filteredTradesLoading;

  // AccountOverviewCard only needs { profit } per month.
  // When execution filter is "nonExecuted", derive monthly stats from tradesToUse
  // so the card reflects non-executed activity instead of executed-only RPC data.
  const monthlyStatsToUse = useMemo(() => {
    if (selectedExecution === 'nonExecuted') {
      return computeMonthlyStatsFromTrades(tradesToUse);
    }
    return monthlyStats?.monthlyData ?? {};
  }, [selectedExecution, tradesToUse, monthlyStats]);

  // MonthlyPerformanceChart needs the full wins/losses/winRate shape which differs from RPC MonthlyStats,
  // so compute from tradesToUse. This is now non-blocking because MonthlyPerformanceChart is lazy-loaded.
  const monthlyPerformanceStatsToUse = useMemo(
    () => computeFullMonthlyStatsFromTrades(tradesToUse),
    [tradesToUse]
  );

  const totalYearProfit = useMemo(
    () => calculateTotalYearProfit(monthlyStatsToUse),
    [monthlyStatsToUse]
  );

  const updatedBalance = useMemo(
    () => calculateUpdatedBalance(
      (resolvedAccount as { account_balance?: number } | null)?.account_balance,
      totalYearProfit
    ),
    [resolvedAccount, totalYearProfit]
  );

  const rawAccountBalance = (activeAccount as { account_balance?: number } | null)?.account_balance;
  const pnlPercentFromOverview = useMemo(
    () => calculatePnlPercentFromOverview(totalYearProfit, rawAccountBalance),
    [totalYearProfit, rawAccountBalance]
  );

  const getDaysInMonth = useMemo(
    () => getDaysInMonthForDate(currentDate),
    [currentDate]
  );

  // Get trades for the current calendar month based on view mode
  const calendarMonthTradesToUse = useMemo(() => {
    // Get base trades based on view mode
    // In yearly mode: use allTrades (full year).
    // In dateRange mode: use calendarMonthTrades (allTrades filtered by calendar month),
    // so trades outside the date-range filter window but within the calendar month still appear.
    const tradesSource: Trade[] = viewMode === 'yearly' ? allTrades : calendarMonthTrades;
    const executionFilteredTrades = applyExecutionFilter(tradesSource, selectedExecution);
    const marketFilteredTrades = applyMarketFilter(executionFilteredTrades, selectedMarket);

    const monthStartTimestamp = startOfMonth(currentDate).getTime();
    const monthEndTimestamp = endOfMonth(currentDate).getTime();

    return marketFilteredTrades.filter((trade) => {
      const tradeTimestamp = parseTradeDateToTimestamp(trade.trade_date);
      return (
        tradeTimestamp !== null &&
        tradeTimestamp >= monthStartTimestamp &&
        tradeTimestamp <= monthEndTimestamp
      );
    });
  }, [viewMode, allTrades, calendarMonthTrades, currentDate, selectedMarket, selectedExecution]);

  const weeklyStats = useMemo(
    () =>
      buildWeeklyStats(
        currentDate,
        calendarMonthTradesToUse,
        selectedMarket,
        selection.activeAccount?.account_balance || 0
      ),
    [
      currentDate,
      calendarMonthTradesToUse,
      selectedMarket,
      selection.activeAccount?.account_balance,
    ]
  );

  const isCustomRange = isCustomDateRange(dateRange);

  // DB stats are authoritative for all metrics. Only averageDrawdown is missing from the
  // DB response (hardcoded to 0 in mapApiToStats), so we compute it from the trade series.
  // partialsTaken is an alias for totalPartialTradesCount (different field name convention).
  const statsToUse = useMemo(() => {
    const safeStats = stats ?? ({} as typeof stats & object);
    const { averageDrawdown } = computeStrategyStatsFromTrades({
      tradesToUse,
      accountBalance: selection.activeAccount?.account_balance || 0,
      selectedExecution,
      viewMode,
      selectedMarket,
      statsFromHook: { tradeQualityIndex: safeStats?.tradeQualityIndex ?? 0, multipleR: safeStats?.multipleR ?? 0 },
    });
    return {
      ...(safeStats ?? {}),
      averageDrawdown,
      partialsTaken: safeStats?.totalPartialTradesCount ?? 0,
    };
  }, [viewMode, tradesToUse, selectedMarket, selectedExecution, stats, selection.activeAccount?.account_balance]);

  // Compute filtered macroStats when filters are applied or in date range mode
  // In date range mode, always compute from current data to reflect the selected date range
  // In yearly mode with no filters, use hook stats
  const macroStatsToUse = useMemo(() => {
    return calculateFilteredMacroStats({
      viewMode,
      selectedMarket,
      tradesToUse,
      statsToUse,
      monthlyStatsToUse,
      nonExecutedTrades,
      nonExecutedTotalTradesCount,
      yearlyPartialTradesCount,
      yearlyPartialsBECount,
      macroStats: macroStats ?? {},
    });
  }, [viewMode, selectedMarket, tradesToUse, statsToUse, monthlyStatsToUse, nonExecutedTrades, nonExecutedTotalTradesCount, yearlyPartialTradesCount, yearlyPartialsBECount, macroStats]);

  // Recovery Factor & Drawdown Count — derived from statsToUse via shared helper.
  const { recoveryFactor, drawdownCount } = useMemo(
    () =>
      computeRecoveryFactorAndDrawdownCount({
        averagePnLPercentage: statsToUse.averagePnLPercentage,
        maxDrawdown: statsToUse.maxDrawdown,
        drawdownCount: statsToUse.drawdownCount,
      }),
    [statsToUse.averagePnLPercentage, statsToUse.maxDrawdown, statsToUse.drawdownCount],
  );

  // Derive market list from pre-aggregated RPC market stats — no O(n) trade iteration.
  const markets = useMemo(
    () => marketStats.map((s) => s.market).filter(Boolean),
    [marketStats]
  );

  // Half-width extra cards — rendered dynamically in a 2-column grid
  const halfWidthExtraCards = useMemo(
    () =>
      [
        {
          key: 'mss_stats' as const,
          element: (
            <MSSStatisticsCard
              mssStats={statsToUseForCharts.mssStats}
              isLoading={chartsLoadingState}
              includeTotalTrades={filteredChartStats !== null}
            />
          ),
        },
        {
          key: 'launch_hour' as const,
          element: <LaunchHourTradesCard filteredTrades={tradesToUse} isLoading={chartsLoadingState} />,
        },
        {
          key: 'avg_displacement' as const,
          element: <AverageDisplacementSizeCard trades={tradesToUse} isLoading={chartsLoadingState} />,
        },
        {
          key: 'displacement_size' as const,
          element: <DisplacementSizeStats trades={tradesToUse} isLoading={chartsLoadingState} />,
        },
        {
          key: 'local_hl_stats' as const,
          element: (
            <LocalHLStatisticsCard
              localHLStats={statsToUseForCharts.localHLStats}
              isLoading={chartsLoadingState}
              includeTotalTrades={filteredChartStats !== null}
            />
          ),
        },
        {
          key: 'fvg_size' as const,
          element: <FvgSizeStats trades={tradesToUse} isLoading={chartsLoadingState} />,
        },
      ] satisfies { key: ExtraCardKey; element: ReactNode }[],
    [
      chartsLoadingState,
      filteredChartStats,
      statsToUseForCharts.localHLStats,
      statsToUseForCharts.mssStats,
      tradesToUse,
    ]
  );

  const selectedHalfWidthCards = useMemo(
    () =>
      halfWidthExtraCards.filter(
        (card) =>
          hasCard(card.key) &&
          (showProContent || !PRO_ONLY_EXTRA_CARD_KEYS.includes(card.key))
      ),
    [halfWidthExtraCards, hasCard, showProContent]
  );

  return (
    <>
      <StrategyControls
        viewMode={viewMode}
        onViewModeChange={(mode) => startFilterTransition(() => setViewMode(mode))}
        isPro={isPro}
        showProCards={showProCards}
        onShowProCardsChange={setShowProCards}
        dateRange={dateRange}
        setDateRange={setDateRange}
        activeFilter={activeFilter}
        onFilterChange={handleFilter}
        isCustomRange={isCustomRange}
        selectedMarket={selectedMarket}
        onSelectedMarketChange={(market) => startFilterTransition(() => setSelectedMarket(market))}
        markets={markets}
        selectedExecution={selectedExecution}
        onSelectedExecutionChange={(execution) =>
          startFilterTransition(() =>
            setSelectedExecution(execution === 'all' ? 'executed' : execution)
          )
        }
        displayStartDate={earliestTradeDate}
      />

      {/* Overview & monthly highlights */}
      <SectionHeading
        title="Overview & Monthly highlights"
        description="Account balance, yearly P&L, and best and worst month for the selected period."
        containerClassName="mt-8"
        action={(
          <div className="flex items-center gap-3">
            {/* Year Selection - Only show when in yearly mode */}
            {viewMode === 'yearly' && (
              <YearSelector
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
              />
            )}
            {renderSectionCollapseButton('overview')}
          </div>
        )}
      />

      {isSectionExpanded('overview') && (
        <>
          {/* Account Overview Card - use resolved account (props first) so server and client match; card defers display until mount to avoid hydration when e.g. no subaccounts */}
          <AccountOverviewCard
            accountName={props?.initialStrategyName ?? null}
            currencySymbol={currencySymbol}
            updatedBalance={updatedBalance}
            totalYearProfit={totalYearProfit}
            accountBalance={(activeAccount as { account_balance?: number } | null)?.account_balance || 1}
            months={MONTHS}
            monthlyStatsAllTrades={monthlyStatsToUse}
            isYearDataLoading={accountOverviewLoadingState}
            isFetching={isLoadingStats}
            tradesCount={stats?.totalTrades ?? tradesToUse.length}
          />

          {/* Month Stats Cards - Only show in yearly mode */}
          {viewMode === 'yearly' && (
            <MonthPerformanceCards
              trades={tradesToUse}
              selectedYear={selectedYear}
              currencySymbol={getCurrencySymbol()}
              accountBalance={(resolvedAccount as { account_balance?: number } | null)?.account_balance}
              isLoading={accountOverviewLoadingState}
            />
          )}
        </>
      )}

      {/* Calendar View - Show in both modes */}
      <SectionHeading
        title="Trades Calendar"
        description="See your trades and activity by calendar day and week."
        action={renderSectionCollapseButton('calendar')}
      />
      {isSectionExpanded('calendar') && (
        <>
          <TradesCalendarCard
            key={`${viewMode}-${dateRange.startDate}-${dateRange.endDate}-${selectedMarket}-${selectedExecution}`}
            currentDate={currentDate}
            onMonthNavigate={handleMonthNavigation}
            canNavigateMonth={canNavigateMonth}
            weeklyStats={weeklyStats}
            calendarMonthTrades={calendarMonthTradesToUse}
            selectedMarket={selectedMarket}
            currencySymbol={currencySymbol}
            accountBalance={selection.activeAccount?.account_balance}
            getDaysInMonth={() => getDaysInMonth}
            onTradeClick={setCalendarTradeDetails}
          />
          <TradeDetailsModal
            trade={calendarTradeDetails}
            isOpen={!!calendarTradeDetails}
            onClose={() => setCalendarTradeDetails(null)}
          />
        </>
      )}

      {/* Core statistics: title + description, then core stats, then Partial/Executed/Direction cards, then Evaluation + Re-entry Trades above RiskPerTrade */}
      <SectionHeading
        title="Core statistics"
        description="Trading statistics and performance metrics."
        action={renderSectionCollapseButton('coreStatistics')}
      />

      {isSectionExpanded('coreStatistics') && (
        <div className="flex flex-col md:grid md:grid-cols-4 gap-6 w-full">
          <TradingOverviewStats
            trades={tradesToUse}
            currencySymbol={currencySymbol}
            hydrated={hydrated}
            accountBalance={selection.activeAccount?.account_balance}
            totalProfitFromOverview={totalYearProfit}
            pnlPercentFromOverview={pnlPercentFromOverview}
            viewMode={viewMode}
            monthlyStats={viewMode === 'yearly' ? monthlyStats : undefined}
            showTitle={false}
            partialRowProps={{
              partialStats: {
                totalPartials: statsToUse.partialsTaken,
                partialWinningTrades: statsToUse.partialWinningTrades,
                partialLosingTrades: statsToUse.partialLosingTrades,
                partialBETrades: statsToUse.partialBETrades,
              },
              initialNonExecutedTotalTradesCount: props?.initialNonExecutedTotalTradesCount,
              directionStats: statsToUseForCharts.directionStats,
              includeTotalTradesForDirection: filteredChartStats !== null,
              chartsLoadingState: chartsLoadingState,
            }}
            aboveRiskPerTradeRow={{
              evaluationStats: (filteredEvaluationStats ?? evaluationStats) as EvaluationStat[],
              reentryStats: statsToUseForCharts.reentryStats as ReentryTradesChartCardProps['reentryStats'],
              breakEvenStats: statsToUseForCharts.breakEvenStats as ReentryTradesChartCardProps['breakEvenStats'],
              trendStats: statsToUseForCharts.trendStats ?? [],
              sessionStats: sessionStats,
              chartsLoadingState: chartsLoadingState,
              includeTotalTrades: filteredChartStats !== null,
              showEvaluationCard: showProContent && hasCard('evaluation_stats'),
              showTrendCard: hasCard('trend_stats'),
              showSessionCard: showProContent && hasCard('session_stats'),
            }}
            beforeRiskPerTradeRow={{
              trades: tradesToUse,
              currencySymbol,
              isLoading: chartsLoadingState,
            }}
            allTradesRiskStats={
              (viewMode === 'yearly'
                ? (filteredRiskStats || allTradesRiskStats)
                : (filteredRiskStats || riskStats)
              ) as RiskAnalysis | null ?? null
            }
            showProCards={showProContent}
            isPro={isPro}
          />
        </div>
      )}

      {/* Confidence & Mind State — PRO */}
      {showProContent && (
        <>
          <SectionHeading
            title="Psychological Factors"
            description="Confidence and mind state at entry across your trades."
            descriptionClassName="mt-1"
            action={renderSectionCollapseButton('psychologicalFactors')}
          />
          {isSectionExpanded('psychologicalFactors') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-6">
              <ConfidenceStatsCard trades={tradesToUse} isLoading={chartsLoadingState} isPro={isPro} />
              <MindStateStatsCard trades={tradesToUse} isLoading={chartsLoadingState} isPro={isPro} />
            </div>
          )}
        </>
      )}

      {/* Equity Curve */}
      <>
        <SectionHeading
          title="Equity Curve"
          description="Cumulative P&L over time."
          action={renderSectionCollapseButton('equityCurve')}
        />
        {isSectionExpanded('equityCurve') && (
          <div className="w-full mb-6">
            <EquityCurveCard trades={tradesToUse} currencySymbol={currencySymbol} />
          </div>
        )}
      </>

      {/* Consistency & drawdown — PRO */}
      {showProContent && (
        <>
          <SectionHeading
            title="Consistency & drawdown"
            description="Consistency and capital preservation metrics."
            action={renderSectionCollapseButton('consistencyDrawdown')}
          />
          {isSectionExpanded('consistencyDrawdown') && (
            <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full">
              <ConsistencyScoreChart consistencyScore={macroStatsToUse.consistencyScore ?? 0} isPro={isPro} />
              <AverageDrawdownChart averageDrawdown={statsToUse.averageDrawdown ?? 0} isPro={isPro} />
              <MaxDrawdownChart maxDrawdown={statsToUse.maxDrawdown ?? null} isPro={isPro} />
            </div>
          )}

          {/* Performance ratios — PRO */}
          <SectionHeading
            title="Performance ratios"
            description="Return and risk-adjusted metrics."
            action={renderSectionCollapseButton('performanceRatios')}
          />
          {isSectionExpanded('performanceRatios') && (
            <>
              <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full">
                <ProfitFactorChart tradesToUse={tradesToUse} totalWins={statsToUse.totalWins} totalLosses={statsToUse.totalLosses} isPro={isPro} />
                <SharpeRatioChart sharpeRatio={macroStatsToUse.sharpeWithBE ?? 0} isPro={isPro} />
                <TQIChart tradesToUse={tradesToUse} isPro={isPro} />
              </div>
              <div className="flex flex-col md:grid md:grid-cols-2 gap-6 w-full mt-6">
                <RecoveryFactorChart recoveryFactor={recoveryFactor} isPro={isPro} />
                <DrawdownCountChart drawdownCount={drawdownCount} isPro={isPro} />
              </div>
            </>
          )}
        </>
      )}

      <AnalysisModal
        isOpen={openAnalyzeModal}
        analysisResults={analysisResults}
        onClose={() => {
          setOpenAnalyzeModal(false);
          setAnalysisResults(null);
        }}
      />

      <div className="my-8 mt-12">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Trade Performance Analysis
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          See your trading performance metrics and statistics.
        </p>
      </div>

      {/* Monthly Performance Chart - Hide/Expand control lives inside the card (PRO) */}
      <div className="w-full mb-8">
        <MonthlyPerformanceChart
          monthlyStatsAllTrades={monthlyPerformanceStatsToUse}
          months={MONTHS}
          chartOptions={chartOptions}
          headerAction={isPro ? renderSectionCollapseButton('monthlyPerformanceChart') : undefined}
          bodyVisible={!isPro || isSectionExpanded('monthlyPerformanceChart')}
        />
      </div>

      {showProContent && (
        <>
          <div className="my-8">
            <MarketStatisticsCard
              marketStats={
                filteredChartStats
                  ? (statsToUseForCharts.marketStats as MarketStatisticsCardProps['marketStats'])
                  : marketStatsToUse
              }
              isLoading={chartsLoadingState}
              includeTotalTrades={filteredChartStats !== null}
              isPro={isPro}
              headerAction={isPro ? renderSectionCollapseButton('marketStats') : undefined}
              bodyVisible={!isPro || isSectionExpanded('marketStats')}
            />
          </div>

          <div className="my-8">
            <MarketProfitStatisticsCard
              trades={tradesToUse}
              marketStats={
                viewMode === 'yearly'
                  ? (filteredMarketStats || marketAllTradesStats) as any
                  : (filteredMarketStats || marketStats) as any
              }
              chartOptions={chartOptions}
              getCurrencySymbol={getCurrencySymbol}
              isPro={isPro}
              headerAction={isPro ? renderSectionCollapseButton('marketProfitStats') : undefined}
              bodyVisible={!isPro || isSectionExpanded('marketProfitStats')}
            />
          </div>
        </>
      )}

      <hr className="col-span-full my-10 border-t border-slate-200 dark:border-slate-700" />

      {showProContent && (
        <div className="my-8">
          <TimeIntervalStatisticsCard
            data={timeIntervalChartDataToUse}
            isLoading={chartsLoadingState}
            isPro={isPro}
            headerAction={isPro ? renderSectionCollapseButton('timeIntervalStats') : undefined}
            bodyVisible={!isPro || isSectionExpanded('timeIntervalStats')}
          />
        </div>
      )}

      {/* Day Stats - full width */}
      <div className="my-8">
        <DayStatisticsCard
          dayStats={filteredChartStats ? (statsToUseForCharts.dayStats as DayStatisticsCardProps['dayStats']) : dayStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
          headerAction={isPro ? renderSectionCollapseButton('dayStats') : undefined}
          bodyVisible={!isPro || isSectionExpanded('dayStats')}
        />
      </div>
      {/* News by event - full width */}
      {showProContent && (
        <div className="my-8">
          <NewsNameChartCard
            trades={tradesToUse}
            isLoading={chartsLoadingState}
            isPro={isPro}
            headerAction={isPro ? renderSectionCollapseButton('newsByEvent') : undefined}
            bodyVisible={!isPro || isSectionExpanded('newsByEvent')}
          />
        </div>
      )}

      {/* Potential Risk/Reward Ratio Stats & Stop Loss Size Stats — extra cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 w-full [&>*]:min-w-0">
        {showProContent && hasCard('potential_rr') && (
          <RiskRewardStats
            trades={tradesToUse}
            isLoading={chartsLoadingState}
          />
        )}
        {hasCard('sl_size_stats') && (
          <SLSizeStatisticsCard
            slSizeStats={statsToUseForCharts.slSizeStats}
            isLoading={chartsLoadingState}
          />
        )}
      </div>

      {/* Extra Stats Cards — rendered per strategy configuration */}
      {hasCard('setup_stats') && (
        <div className="my-8">
          <SetupStatisticsCard
            setupStats={statsToUseForCharts.setupStats}
            isLoading={chartsLoadingState}
            includeTotalTrades={filteredChartStats !== null}
            headerAction={isPro ? renderSectionCollapseButton('setupStats') : undefined}
            bodyVisible={!isPro || isSectionExpanded('setupStats')}
          />
        </div>
      )}

      {hasCard('liquidity_stats') && (
        <div className="my-8">
          <LiquidityStatisticsCard
            liquidityStats={statsToUseForCharts.liquidityStats}
            isLoading={chartsLoadingState}
            includeTotalTrades={filteredChartStats !== null}
            headerAction={isPro ? renderSectionCollapseButton('liquidityStats') : undefined}
            bodyVisible={!isPro || isSectionExpanded('liquidityStats')}
          />
        </div>
      )}

      {/* Half-width extra cards — dynamic grid */}
      {selectedHalfWidthCards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8 w-full [&>*]:min-w-0">
          {selectedHalfWidthCards.map(({ key, element }) => (
            <div key={key}>{element}</div>
          ))}
        </div>
      )}
    </>
  );
}
