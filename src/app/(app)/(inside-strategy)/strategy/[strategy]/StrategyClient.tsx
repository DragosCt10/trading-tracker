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
import type { SavedTag } from '@/types/saved-tag';
import type { AccountSettings } from '@/types/account-settings';
import type { DashboardApiResponse } from '@/types/dashboard-rpc';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';
import { useSubscription } from '@/hooks/useSubscription';
import { useStrategyDashboardContext } from '@/hooks/useStrategyDashboardContext';
import {
  useStrategySectionVisibility,
  type StrategySectionKey as FullWidthSectionKey,
} from '@/hooks/useStrategySectionVisibility';
import { hydrateStrategyDashboardCache } from '@/utils/hydrateStrategyDashboardCache';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  StrategyOverviewAndCalendarSections,
  StrategyCoreStatisticsSection,
  StrategyPerformanceSections,
  StrategyAdditionalAnalyticsSections,
  type ExecutionFilter,
} from './sections/StrategySections';

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
import {
  calculatePnlPercentFromOverview,
  calculateTotalYearProfit,
  calculateUpdatedBalance,
  computeMonthlyStatsFromTrades,
  getCurrencySymbolFromAccount,
} from '@/utils/accountOverviewHelpers';
import { ViewModeToggle } from '@/components/dashboard/analytics/ViewModeToggle';
import { AnalysisModal } from '@/components/dashboard/analytics/AnalysisModal';
import type { RiskAnalysis } from '@/components/dashboard/analytics/RiskPerTrade';
import { DateRangeValue, TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { 
  getDaysInMonthForDate,
  buildWeeklyStats,
} from '@/components/dashboard/analytics/TradesCalendarCard';
import { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import {
  convertSetupStatsToChartData,
  convertFilteredSetupStatsToChartData,
} from '@/components/dashboard/analytics/SetupStatisticsCard';
import {
  LocalHLStatisticsCard,
} from '@/components/dashboard/analytics/LocalHLStatisticsCard';
import {
  type ReentryTradesChartCardProps,
} from '@/components/dashboard/analytics/ReentryTradesChartCard';
import {
  MSSStatisticsCard,
} from '@/components/dashboard/analytics/MSSStatisticsCard';
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
import { computeRecoveryFactorAndDrawdownCount } from '@/utils/analyticsCalculations';

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
  /** Strategy's saved tag vocabulary for initial hydration. */
  initialSavedTags?: SavedTag[];
};

const defaultInitialRange = createInitialDateRange();
const defaultSelectedYear = new Date().getFullYear();

/** Safely extracts account_balance from the loosely-typed account object. */
function getAccountBalance(account: unknown): number | undefined {
  if (account !== null && typeof account === 'object' && 'account_balance' in account) {
    const val = (account as { account_balance?: unknown }).account_balance;
    return typeof val === 'number' ? val : undefined;
  }
  return undefined;
}

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
  queryClient: QueryClient;
};

type TradingOverviewStatsProps = Parameters<typeof StrategyCoreStatisticsSection>[0]['tradingOverviewProps'];

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

  // view mode: 'yearly' or 'dateRange'
  const [viewMode, setViewMode] = useState<'yearly' | 'dateRange'>('dateRange');
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
  const {
    showProCards,
    setShowProCards,
    showProContent,
    toggleSection,
    isSectionExpanded,
  } = useStrategySectionVisibility(isPro);
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
  const savedTags = useMemo(() => props?.initialSavedTags ?? [], [props?.initialSavedTags]);
  const extraCardsSet = useMemo(() => new Set(extraCards), [extraCards]);
  const hasCard = useCallback((key: ExtraCardKey) => extraCardsSet.has(key), [extraCardsSet]);

  // compact_trades removed: getFilteredTrades (Query 2) already returns all fields
  // the extra cards need (launch_hour, displacement_size, fvg_size, risk_reward_ratio_long).
  // Keeping includeCompactTrades=false enables the cache-first optimization in useDashboardData
  // and avoids the redundant 3-4 MB payload in the dashboard stats response.

  // Hydrate React Query cache once on mount. Cannot call setQueryData synchronously
  // during render — it mutates external state, which breaks React Compiler optimization
  // for the whole component. useEffect is correct here: fires before any user interaction,
  // seeds the cache before useDashboardData's queries start a redundant network fetch.
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
  
  // Handle viewMode switches and selectedYear changes for yearly mode.
  // updateCalendarFromDateRange is intentionally NOT here — it's handled by the
  // dateRange effect below. Having it in both effects caused an infinite loop:
  // calendar nav sets selectedYear → this effect resets currentDate via
  // updateCalendarFromDateRange → calendar nav fires again → loop (React #185/#310).
  useEffect(() => {
    updateDateRangeForYearlyMode(viewMode);
    resetFilterOnModeSwitch(viewMode);
  }, [viewMode, selectedYear, updateDateRangeForYearlyMode, resetFilterOnModeSwitch]);

  // Sync calendar when dateRange changes (filter switch, date picker, or mode switch).
  // resetFilterOnModeSwitch (above) sets dateRange when switching to dateRange mode,
  // which triggers this effect — so viewMode transitions are covered.
  useEffect(() => {
    updateCalendarFromDateRange(viewMode);
  }, [viewMode, dateRange, updateCalendarFromDateRange]);

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
  });

  // True once stats data has arrived (undefined = still loading, object = ready).
  // With server-prefetched stats (StrategyData 1s race), this is true on first render —
  // no skeleton flash. Without prefetch, false until the client fetch completes.
  // Stays true even during background refetches (unlike isLoadingStats / isFetching).
  const hydrated = stats !== undefined && stats !== null;

  // Pre-parse trade dates once per data fetch rather than on every filter interaction.
  // calendarMonthTradesToUse filters by month timestamp on every market/execution change —
  // caching avoids O(n) regex+string-parse calls per toggle.
  const allTradeTimestampsMap = useMemo(
    () => new Map(allTrades.map((t) => [t.id, parseTradeDateToTimestamp(t.trade_date)])),
    [allTrades]
  );
  const calendarMonthTradeTimestampsMap = useMemo(
    () => new Map(calendarMonthTrades.map((t) => [t.id, parseTradeDateToTimestamp(t.trade_date)])),
    [calendarMonthTrades]
  );

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
    resolvedAccountBalance: getAccountBalance(resolvedAccount),
    userId: userData?.user?.id,
    mode: selection.mode,
    strategyId,
    selectedYear,
    selectedExecution,
    selectedMarket,
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
      if (typeof event.detail !== 'string') return;
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

  // Determine loading state for charts.
  // Replace the previous O(n) .some() scan over setupChartDataToUse with an O(1) check:
  // "do we have trades?" is sufficient — if tradesToUse is non-empty, chart data is ready.
  const chartsLoadingState = useMemo(() => {
    if (filteredChartStats) return false;  // filters applied → computed synchronously
    if (tradesToUse.length > 0) return false; // data arrived → no loading indicator
    return viewMode === 'yearly' ? allTradesLoading : filteredTradesLoading;
  }, [filteredChartStats, tradesToUse.length, viewMode, allTradesLoading, filteredTradesLoading]);

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

  const totalYearProfit = useMemo(
    () => calculateTotalYearProfit(monthlyStatsToUse),
    [monthlyStatsToUse]
  );

  const updatedBalance = useMemo(
    () => calculateUpdatedBalance(
      getAccountBalance(resolvedAccount),
      totalYearProfit
    ),
    [resolvedAccount, totalYearProfit]
  );

  const rawAccountBalance = getAccountBalance(activeAccount);
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

    const timestampMap = viewMode === 'yearly' ? allTradeTimestampsMap : calendarMonthTradeTimestampsMap;
    return marketFilteredTrades.filter((trade) => {
      const tradeTimestamp = timestampMap.get(trade.id) ?? null;
      return (
        tradeTimestamp !== null &&
        tradeTimestamp >= monthStartTimestamp &&
        tradeTimestamp <= monthEndTimestamp
      );
    });
  }, [viewMode, allTrades, calendarMonthTrades, currentDate, selectedMarket, selectedExecution, allTradeTimestampsMap, calendarMonthTradeTimestampsMap]);

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
  // Split into two useMemos so the heavy O(n) trade pass only reruns when trades/execution/balance
  // change — not on every viewMode/market filter change (tradesToUse already captures those).
  const averageDrawdown = useMemo(() => {
    const { averageDrawdown: computed } = computeStrategyStatsFromTrades({
      tradesToUse,
      accountBalance: selection.activeAccount?.account_balance || 0,
      selectedExecution,
      // viewMode and selectedMarket don't affect averageDrawdown — tradesToUse is already filtered.
      viewMode: 'yearly',
      selectedMarket: 'all',
      statsFromHook: {}, // statsFromHook not needed for averageDrawdown
    });
    return computed;
  }, [tradesToUse, selectedExecution, selection.activeAccount?.account_balance]);

  // partialsTaken is an alias for totalPartialTradesCount (different field name convention).
  const statsToUse = useMemo(() => {
    const safeStats = stats ?? ({} as typeof stats & object);
    return {
      ...(safeStats ?? {}),
      averageDrawdown,
      partialsTaken: safeStats?.totalPartialTradesCount ?? 0,
    };
  }, [stats, averageDrawdown]);

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

  // Half-width extra cards — rendered dynamically in a 2-column grid.
  // Array construction and filtering are combined in one useMemo so the JSX elements
  // are only created for cards that will actually render (avoids building 6 elements
  // when only 2 are visible). React Compiler auto-memoizes each card's props.
  const selectedHalfWidthCards = useMemo(
    () =>
      (
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
        ] as { key: ExtraCardKey; element: ReactNode }[]
      ).filter(
        (card) =>
          hasCard(card.key) &&
          (showProContent || !PRO_ONLY_EXTRA_CARD_KEYS.includes(card.key))
      ),
    [statsToUseForCharts, chartsLoadingState, filteredChartStats, tradesToUse, hasCard, showProContent]
  );

  const tradingOverviewProps: TradingOverviewStatsProps = {
    trades: tradesToUse,
    currencySymbol,
    hydrated,
    accountBalance: selection.activeAccount?.account_balance,
    totalProfitFromOverview: totalYearProfit,
    pnlPercentFromOverview,
    viewMode,
    monthlyStats: viewMode === 'yearly' ? monthlyStats : undefined,
    showTitle: false,
    partialRowProps: {
      partialStats: {
        totalPartials: statsToUse.partialsTaken,
        partialWinningTrades: statsToUse.partialWinningTrades,
        partialLosingTrades: statsToUse.partialLosingTrades,
        partialBETrades: statsToUse.partialBETrades,
      },
      initialNonExecutedTotalTradesCount: props?.initialNonExecutedTotalTradesCount,
      directionStats: statsToUseForCharts.directionStats,
      includeTotalTradesForDirection: filteredChartStats !== null,
      chartsLoadingState,
    },
    aboveRiskPerTradeRow: {
      evaluationStats: (filteredEvaluationStats ?? evaluationStats) as EvaluationStat[],
      reentryStats: statsToUseForCharts.reentryStats as ReentryTradesChartCardProps['reentryStats'],
      breakEvenStats: statsToUseForCharts.breakEvenStats as ReentryTradesChartCardProps['breakEvenStats'],
      trendStats: statsToUseForCharts.trendStats ?? [],
      sessionStats,
      chartsLoadingState,
      includeTotalTrades: filteredChartStats !== null,
      showEvaluationCard: showProContent && hasCard('evaluation_stats'),
      showTrendCard: hasCard('trend_stats'),
      showSessionCard: showProContent && hasCard('session_stats'),
    },
    beforeRiskPerTradeRow: {
      trades: tradesToUse,
      currencySymbol,
      isLoading: chartsLoadingState,
    },
    allTradesRiskStats:
      ((viewMode === 'yearly'
        ? (filteredRiskStats || allTradesRiskStats)
        : (filteredRiskStats || riskStats)) as RiskAnalysis | null) ?? null,
    showProCards: showProContent,
    isPro,
  };

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
          startFilterTransition(() => setSelectedExecution(execution))
        }
        displayStartDate={earliestTradeDate}
      />

      <StrategyOverviewAndCalendarSections
        viewMode={viewMode}
        selectedYear={selectedYear}
        onSelectedYearChange={setSelectedYear}
        renderSectionCollapseButton={renderSectionCollapseButton}
        isSectionExpanded={isSectionExpanded}
        initialStrategyName={props?.initialStrategyName}
        currencySymbol={currencySymbol}
        updatedBalance={updatedBalance}
        totalYearProfit={totalYearProfit}
        activeAccountBalance={getAccountBalance(activeAccount)}
        monthlyStatsToUse={monthlyStatsToUse}
        accountOverviewLoadingState={accountOverviewLoadingState}
        isLoadingStats={isLoadingStats}
        statsTotalTrades={stats?.totalTrades}
        tradesToUse={tradesToUse}
        resolvedAccountBalance={getAccountBalance(resolvedAccount)}
        dateRange={dateRange}
        selectedMarket={selectedMarket}
        selectedExecution={selectedExecution}
        currentDate={currentDate}
        handleMonthNavigation={handleMonthNavigation}
        canNavigateMonth={canNavigateMonth}
        weeklyStats={weeklyStats}
        calendarMonthTradesToUse={calendarMonthTradesToUse}
        selectionActiveAccountBalance={selection.activeAccount?.account_balance}
        getDaysInMonth={getDaysInMonth}
        savedTags={savedTags}
      />

      <StrategyCoreStatisticsSection
        renderSectionCollapseButton={renderSectionCollapseButton}
        isSectionExpanded={isSectionExpanded}
        tradingOverviewProps={tradingOverviewProps}
      />

      <StrategyPerformanceSections
        renderSectionCollapseButton={renderSectionCollapseButton}
        isSectionExpanded={isSectionExpanded}
        showProContent={showProContent}
        isPro={isPro}
        tradesToUse={tradesToUse}
        chartsLoadingState={chartsLoadingState}
        currencySymbol={currencySymbol}
        consistencyScore={macroStatsToUse.consistencyScore ?? 0}
        averageDrawdown={statsToUse.averageDrawdown ?? 0}
        maxDrawdown={statsToUse.maxDrawdown ?? null}
        totalWins={statsToUse.totalWins}
        totalLosses={statsToUse.totalLosses}
        sharpeWithBE={macroStatsToUse.sharpeWithBE ?? 0}
        recoveryFactor={recoveryFactor}
        drawdownCount={drawdownCount}
      />

      <AnalysisModal
        isOpen={openAnalyzeModal}
        analysisResults={analysisResults}
        onClose={() => {
          setOpenAnalyzeModal(false);
          setAnalysisResults(null);
        }}
      />

      <StrategyAdditionalAnalyticsSections
        isPro={isPro}
        showProContent={showProContent}
        renderSectionCollapseButton={renderSectionCollapseButton}
        isSectionExpanded={isSectionExpanded}
        filteredChartStats={filteredChartStats}
        statsToUseForCharts={statsToUseForCharts}
        marketStatsToUse={marketStatsToUse}
        chartsLoadingState={chartsLoadingState}
        tradesToUse={tradesToUse}
        viewMode={viewMode}
        filteredMarketStats={filteredMarketStats}
        marketAllTradesStats={marketAllTradesStats}
        marketStats={marketStats}
        getCurrencySymbol={getCurrencySymbol}
        timeIntervalChartDataToUse={timeIntervalChartDataToUse}
        dayStats={dayStats}
        hasCard={hasCard}
        selectedHalfWidthCards={selectedHalfWidthCards}
      />
    </>
  );
}
