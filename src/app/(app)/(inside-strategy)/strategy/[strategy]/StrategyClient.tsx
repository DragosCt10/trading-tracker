'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
  useRef,
} from 'react';
import {
  startOfMonth,
  endOfMonth,
  format,
} from 'date-fns';
import { useRouter } from 'next/navigation';
import type { ExtraCardKey } from '@/constants/extraCards';

import { Trade } from '@/types/trade';
import type { AccountSettings } from '@/types/account-settings';
import type { DashboardApiResponse } from '@/types/dashboard-rpc';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useAccounts } from '@/hooks/useAccounts';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';

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
  MONTHS,
  CURRENCY_SYMBOLS,
  getCurrencySymbolFromAccount,
  computeMonthlyStatsFromTrades,
  calculateTotalYearProfit,
  calculateUpdatedBalance,
  getAccountBalanceForOverview,
  calculatePnlPercentFromOverview,
} from '@/components/dashboard/analytics/AccountOverviewCard';
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

// Below-fold components: code-split so they don't block the initial bundle parse.
const ProfitFactorChart    = dynamic(() => import('@/components/dashboard/analytics/ProfitFactorChart').then(m => ({ default: m.ProfitFactorChart })));
const SharpeRatioChart     = dynamic(() => import('@/components/dashboard/analytics/SharpeRatioChart').then(m => ({ default: m.SharpeRatioChart })));
const AverageDrawdownChart = dynamic(() => import('@/components/dashboard/analytics/AverageDrawdownChart').then(m => ({ default: m.AverageDrawdownChart })));
const MaxDrawdownChart     = dynamic(() => import('@/components/dashboard/analytics/MaxDrawdownChart').then(m => ({ default: m.MaxDrawdownChart })));
const TQIChart             = dynamic(() => import('@/components/dashboard/analytics/TQIChart').then(m => ({ default: m.TQIChart })));
const ConsistencyScoreChart = dynamic(() => import('@/components/dashboard/analytics/ConsistencyScoreChart').then(m => ({ default: m.ConsistencyScoreChart })));
const EquityCurveCard      = dynamic(() => import('@/components/dashboard/analytics/EquityCurveCard').then(m => ({ default: m.EquityCurveCard })));
const ConfidenceStatsCard  = dynamic(() => import('@/components/dashboard/analytics/ConfidenceMindStateCards').then(m => ({ default: m.ConfidenceStatsCard })));
const MindStateStatsCard   = dynamic(() => import('@/components/dashboard/analytics/ConfidenceMindStateCards').then(m => ({ default: m.MindStateStatsCard })));

import {
  type DateRangeState,
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
  initialExtraCards: ExtraCardKey[];
  /** Server-fetched dashboard stats (API shape) for initial hydration — avoids client /api/dashboard-stats call (audit 2.1). */
  initialDashboardStats?: DashboardApiResponse | null;
};

const defaultInitialRange = createInitialDateRange();
const defaultSelectedYear = new Date().getFullYear();

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
  const [selectedExecution, setSelectedExecution] = useState<'all' | 'executed' | 'nonExecuted'>('executed');

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const { data: userData, isLoading: userLoading } = useUserDetails();
  const { selection, setSelection, actionBarloading } = useActionBarSelection();
  const { accounts: accountsForMode } = useAccounts({ userId: userData?.user?.id, pendingMode: selection.mode });

  // Prefer ActionBar selection (what user applied) over server props so switching account/mode in the bar updates the dashboard.
  // When there are no accounts for this mode (e.g. user deleted all subaccounts), show no account so AccountOverviewCard shows "No Active Account".
  const candidateAccount = selection.activeAccount ?? props?.initialActiveAccount;
  const resolvedAccount =
    accountsForMode.length === 0
      ? null
      : candidateAccount && accountsForMode.some((a) => a.id === candidateAccount.id)
        ? candidateAccount
        : null;
  // Always derive display name from current user's accounts list by id to avoid showing
  // a stale name from cached selection (e.g. after refresh when cache had another user's account name).
  const resolvedAccountDisplayName =
    (resolvedAccount && accountsForMode.length > 0
      ? (accountsForMode.find((a) => a.id === resolvedAccount.id)?.name ?? (resolvedAccount as { name?: string | null }).name ?? null)
      : null) as string | null;

  // Sync ActionBar selection from server only when there is no existing selection.
  // AppLayout pre-populates the selection on first paint; this effect is a fallback for
  // edge cases (e.g. no accounts). Using !selection.activeAccount prevents overwriting
  // a mode the user explicitly chose in the ActionBar when navigating between strategies.
  useEffect(() => {
    if (props?.initialActiveAccount && !selection.activeAccount && props.initialMode) {
      setSelection({
        mode: props.initialMode,
        activeAccount: props.initialActiveAccount as Parameters<typeof setSelection>[0]['activeAccount'],
      });
    }
  }, [props?.initialActiveAccount, props?.initialMode, setSelection, selection.activeAccount]);

  // Store strategyId from props
  const strategyId = props?.initialStrategyId ?? null;

  const userId = userData?.user?.id;

  // Per-strategy extra cards configuration
  const extraCards = props?.initialExtraCards ?? [];
  const hasCard = (key: ExtraCardKey) => extraCards.includes(key);

  // compact_trades is only needed for extra cards whose components read fields
  // that are not in series[]: launch_hour, displacement_size, fvg_size, risk_reward_ratio_long.
  // All other components (EquityCurveCard, ConfidenceStatsCard, NewsNameChartCard, etc.)
  // now get their data from series[] which includes market, executed, confidence_at_entry,
  // mind_state_at_entry, news_name. ~60% smaller payload for most strategies.
  const includeCompactTrades = extraCards.some((k) =>
    (['launch_hour', 'avg_displacement', 'displacement_size', 'fvg_size', 'potential_rr'] as ExtraCardKey[]).includes(k)
  );

  // Helper function to hydrate React Query cache
  const hydrateQueryCache = useCallback(() => {
    const uid = props?.initialUserId;
    const acc = props?.initialActiveAccount;
    const dr = props?.initialDateRange;
    const yr = props?.initialSelectedYear;
    
    if (!uid || !acc?.id || !dr) return;
    
    const mode = props?.initialMode ?? 'live';
    const year = yr ?? new Date().getFullYear();
    // Initial hydration uses dateRange mode (default viewMode), so use dr boundaries
    const initialViewMode: 'yearly' | 'dateRange' = 'dateRange';
    const effectiveStartDate = dr.startDate;
    const effectiveEndDate = dr.endDate;
    
    const queryKeyAllTrades = queryKeys.trades.all(mode, acc.id, uid, year, strategyId);
    const queryKeyFilteredTrades = queryKeys.trades.filtered(
      mode,
      acc.id,
      uid,
      initialViewMode,
      effectiveStartDate,
      effectiveEndDate,
      strategyId,
    );
    
    // Only hydrate if data doesn't already exist AND we haven't recently invalidated trade data
    // This prevents stale initialData from being used after a trade's strategy_id changes
    const wasInvalidated = typeof window !== 'undefined' && sessionStorage.getItem('trade-data-invalidated');
    const shouldSkipHydration = wasInvalidated && (Date.now() - parseInt(wasInvalidated, 10)) < 30000; // Skip hydration for 30 seconds after invalidation
    
    // Only hydrate trades cache if the server actually provided trade arrays.
    // StrategyData.tsx no longer passes initialFilteredTrades/initialAllTrades
    // (Phase 1: trades come from getFilteredTrades() via useDashboardData Query 2).
    // Setting the cache to [] would lock it there (refetchOnMount: false) and
    // prevent Query 2 from ever fetching the real trades.
    if (
      props?.initialFilteredTrades != null &&
      queryClient.getQueryData(queryKeyAllTrades) === undefined &&
      !shouldSkipHydration
    ) {
      queryClient.setQueryData(queryKeyFilteredTrades, props.initialFilteredTrades);
      queryClient.setQueryData(queryKeyAllTrades, props.initialAllTrades ?? []);
      queryClient.setQueryData(
        queryKeys.trades.nonExecuted(
          mode,
          acc.id,
          uid,
          initialViewMode,
          effectiveStartDate,
          effectiveEndDate,
          strategyId,
        ),
        props.initialNonExecutedTrades ?? []
      );
    }

    // Hydrate dashboard stats (same key as useDashboardData) so client doesn't call /api/dashboard-stats on first load (audit 2.1).
    const dashboardStatsKey = queryKeys.dashboardStats(
      mode,
      acc.id,
      uid,
      strategyId,
      year,
      initialViewMode,
      effectiveStartDate,
      effectiveEndDate,
      'executed',
      'all',
    );
    // Only hydrate if cache is empty — prevents infinite render loop caused by
    // setQueryData notifying observers (useDashboardData) on every render.
    if (props?.initialDashboardStats != null && queryClient.getQueryData(dashboardStatsKey) === undefined) {
      queryClient.setQueryData(dashboardStatsKey, props.initialDashboardStats);
    }
    
    // Clear the invalidation flag after hydration check
    if (shouldSkipHydration && typeof window !== 'undefined') {
      sessionStorage.removeItem('trade-data-invalidated');
    }
  }, [props, queryClient, strategyId]);

  // Hydrate React Query cache once on mount. Calling setQueryData during render is a
  // side-effect anti-pattern — moved to useEffect to prevent infinite render loops.
  useEffect(() => {
    hydrateQueryCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount with server initial data
  }, []);

  const currencySymbol = getCurrencySymbolFromAccount(
    (selection.activeAccount ?? props?.initialActiveAccount) as
      | { currency?: string | null }
      | undefined
  );

  const getCurrencySymbol = useCallback(() => {
    const account = selection.activeAccount ?? props?.initialActiveAccount;
    if (!account?.currency) return '$';
    return (
      CURRENCY_SYMBOLS[
        account.currency as keyof typeof CURRENCY_SYMBOLS
      ] || account.currency
    );
  }, [selection.activeAccount, props?.initialActiveAccount]);
  
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

  const tradesToUse = useMemo(() => {
    let baseTrades: Trade[] = viewMode === 'yearly' ? allTrades : filteredTrades;

    if (selectedExecution === 'nonExecuted') {
      return nonExecutedTrades || [];
    }
    if (selectedExecution === 'executed') {
      return baseTrades.filter((t) => t.executed === true);
    }
    return baseTrades;
  }, [viewMode, allTrades, filteredTrades, nonExecutedTrades, selectedExecution]);

  // tradeMonths from RPC covers all trades (no execution filter).
  // When non-executed filter is active, derive months from nonExecutedTrades instead.
  const filteredTradeMonths = useMemo(() => {
    if (selectedExecution === 'nonExecuted') {
      const months = new Set<string>();
      for (const t of nonExecutedTrades) {
        const d = t.trade_date;
        if (d) {
          const s = typeof d === 'string' ? d : String(d);
          months.add(s.slice(0, 7));
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
  // Seeds three cache entries so subsequent filter/page switches are instant:
  //   1. dashboardStats all-time  → "All Trades" filter on this page
  //   2. trades.filtered 'dateRange' → My Trades page
  //   3. trades.filtered 'all'     → Daily Journal page
  // getQueryData() === undefined check prevents redundant fetches while cache is live.
  // visibilitychange re-runs this when the user returns to the tab after gcTime (5 min) expires.
  const runAllTimePrefetch = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (isLoadingStats) return;

    const accountId = resolvedAccount?.id;
    const uid = userData?.user?.id;
    const m = selection.mode;
    if (!accountId || !uid || !m) return;

    const doPrefetch = () => {
      const { startDate: allStart, endDate: allEnd } = createAllTimeRange();

      // 1. Prefetch dashboardStats all-time (for "All Trades" filter switch)
      const dashKey = queryKeys.dashboardStats(
        m, accountId, uid, strategyId,
        selectedYear, 'dateRange', allStart, allEnd,
        selectedExecution, selectedMarket,
      );
      if (queryClient.getQueryData(dashKey) === undefined) {
        queryClient.prefetchQuery({
          queryKey: dashKey,
          queryFn: async () => {
            const params = new URLSearchParams({
              accountId,
              mode: m,
              startDate: allStart,
              endDate: allEnd,
              accountBalance: String(resolvedAccount?.account_balance ?? 0),
              execution: selectedExecution,
              market: selectedMarket,
              ...(strategyId ? { strategyId } : {}),
              ...(includeCompactTrades ? { includeCompactTrades: 'true' } : {}),
            });
            const res = await fetch(`/api/dashboard-stats?${params}`);
            if (!res.ok) return null;
            return res.json();
          },
          ...TRADES_DATA,
        });
      }

      // 2 & 3. Fetch full Trade[] once, seed under both page-specific keys
      const myTradesKey = queryKeys.trades.filtered(m, accountId, uid, 'dateRange', allStart, allEnd, strategyId);
      const dailyJournalKey = queryKeys.trades.filtered(m, accountId, uid, 'all', allStart, allEnd, strategyId);
      const needsMyTrades = queryClient.getQueryData(myTradesKey) === undefined;
      const needsDailyJournal = queryClient.getQueryData(dailyJournalKey) === undefined;

      if (needsMyTrades || needsDailyJournal) {
        getFilteredTrades({
          userId: uid,
          accountId,
          mode: m,
          startDate: allStart,
          endDate: allEnd,
          includeNonExecuted: true,
          strategyId,
        }).then((trades) => {
          if (needsMyTrades) queryClient.setQueryData(myTradesKey, trades);
          if (needsDailyJournal) queryClient.setQueryData(dailyJournalKey, trades);
        }).catch(() => { /* pages will fetch on demand if this fails */ });
      }
    };

    // Run immediately after initial load
    doPrefetch();

    // Re-run on tab focus so cache is re-warmed after gcTime (5 min) expires
    runAllTimePrefetch.current = doPrefetch;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingStats, resolvedAccount?.id, userData?.user?.id, selection.mode]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && runAllTimePrefetch.current) {
        runAllTimePrefetch.current();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

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

  const setupChartData: TradeStatDatum[] = convertSetupStatsToChartData(setupStats);

  const timeIntervalChartData: TradeStatDatum[] = convertIntervalStatsToChartData(intervalStats);


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
  const setupChartDataFiltered: TradeStatDatum[] = convertFilteredSetupStatsToChartData(statsToUseForCharts.setupStats);

  const timeIntervalChartDataFiltered: TradeStatDatum[] = convertIntervalStatsToChartData(
    statsToUseForCharts.intervalStats
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

  const rawAccountBalance = ((selection.activeAccount ?? props?.initialActiveAccount) as { account_balance?: number } | null)?.account_balance;
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
    let tradesSource: Trade[] = viewMode === 'yearly' ? allTrades : calendarMonthTrades;
    let filteredSource = tradesSource;

    // Apply execution filter for both modes using the trade.executed flag.
    // Use !== true for non-executed to catch both false and null (legacy rows).
    if (selectedExecution === 'nonExecuted') {
      filteredSource = filteredSource.filter((t) => t.executed !== true);
    } else if (selectedExecution === 'executed') {
      filteredSource = filteredSource.filter((t) => t.executed === true);
    }

    // Apply market filter if needed (calendar trades are not market-filtered in SQL)
    if (selectedMarket !== 'all') {
      filteredSource = filteredSource.filter((t) => t.market === selectedMarket);
    }
    
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
    
    const result = filteredSource.filter((trade) => {
      // Parse trade_date to avoid timezone issues
      // If it's a date-only string (YYYY-MM-DD), parse as local date
      let tradeDate: Date;
      if (typeof trade.trade_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(trade.trade_date)) {
        const [year, month, day] = trade.trade_date.split('-').map(Number);
        tradeDate = new Date(year, month - 1, day);
      } else {
        tradeDate = new Date(trade.trade_date);
      }
      // Compare dates at day level to avoid time component issues
      const tradeDateStr = format(tradeDate, 'yyyy-MM-dd');
      const inRange = tradeDateStr >= monthStartStr && tradeDateStr <= monthEndStr;
      
      return inRange;
    });
    
    return result;
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

  // Derive market list from pre-aggregated RPC market stats — no O(n) trade iteration.
  const markets = marketStats.map((s) => s.market).filter(Boolean);

  // Half-width extra cards — rendered dynamically in a 2-column grid
  const HALF_WIDTH_EXTRA_CARDS: { key: ExtraCardKey; element: React.ReactNode }[] = [
    {
      key: 'mss_stats',
      element: (
        <MSSStatisticsCard
          mssStats={statsToUseForCharts.mssStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
      ),
    },
    {
      key: 'launch_hour',
      element: <LaunchHourTradesCard filteredTrades={tradesToUse} isLoading={chartsLoadingState} />,
    },
    {
      key: 'avg_displacement',
      element: <AverageDisplacementSizeCard trades={tradesToUse} isLoading={chartsLoadingState} />,
    },
    {
      key: 'displacement_size',
      element: <DisplacementSizeStats trades={tradesToUse} isLoading={chartsLoadingState} />,
    },
    {
      key: 'local_hl_stats',
      element: (
        <LocalHLStatisticsCard
          localHLStats={statsToUseForCharts.localHLStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
      ),
    },
    {
      key: 'fvg_size',
      element: <FvgSizeStats trades={tradesToUse} isLoading={chartsLoadingState} />,
    },
  ];

  const selectedHalfWidthCards = HALF_WIDTH_EXTRA_CARDS.filter(c => hasCard(c.key));

  return (
    <> 
      {/* View Mode Toggle */}
      <ViewModeToggle
        viewMode={viewMode}
        onViewModeChange={(mode) => startFilterTransition(() => setViewMode(mode))}
      />

      {/* Date Range and Filter Buttons - Only show when in dateRange mode, above AccountOverviewCard */}
      {viewMode === 'dateRange' && (
        <TradeFiltersBar
          dateRange={dateRange}
          onDateRangeChange={(range: DateRangeValue) => {
            setDateRange(range);
            // reset pagination etc if needed
          }}
          activeFilter={activeFilter}
          onFilterChange={handleFilter}
          isCustomRange={isCustomRange}
          selectedMarket={selectedMarket}
          onSelectedMarketChange={(market) => startFilterTransition(() => setSelectedMarket(market))}
          markets={markets}
          selectedExecution={selectedExecution}
          onSelectedExecutionChange={(execution) => {
            // Analytics page doesn't support 'all' option, so map it to 'executed'
            startFilterTransition(() => setSelectedExecution(execution === 'all' ? 'executed' : execution));
          }}
          displayStartDate={earliestTradeDate}
        />
      )}

      <hr className="my-10 border-t border-slate-200 dark:border-slate-700" />

      {/* Overview & monthly highlights */}
      <div className="flex items-center justify-between mt-8 mb-2">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Overview &amp; Monthly highlights
        </h2>
        {/* Year Selection - Only show when in yearly mode */}
        {viewMode === 'yearly' && (
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        )}
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        Account balance, yearly P&amp;L, and best and worst month for the selected period.
      </p>

      {/* Account Overview Card - use resolved account (props first) so server and client match; card defers display until mount to avoid hydration when e.g. no subaccounts */}
      <AccountOverviewCard
        accountName={resolvedAccountDisplayName}
        currencySymbol={currencySymbol}
        updatedBalance={updatedBalance}
        totalYearProfit={totalYearProfit}
        accountBalance={((selection.activeAccount ?? props?.initialActiveAccount) as { account_balance?: number } | null)?.account_balance || 1}
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

      {/* Calendar View - Show in both modes */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Trades Calendar</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        See your trades and activity by calendar day and week.
      </p>
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

      {/* Core statistics: title + description, then core stats, then Partial/Executed/Direction cards, then Evaluation + Re-entry Trades above RiskPerTrade */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Core statistics</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Trading statistics and performance metrics.</p>

      {(viewMode === 'dateRange' || viewMode === 'yearly') && (
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
              chartsLoadingState: chartsLoadingState,
              includeTotalTrades: filteredChartStats !== null,
              showEvaluationCard: hasCard('evaluation_stats'),
              showTrendCard: hasCard('trend_stats'),
            }}
            allTradesRiskStats={
              (viewMode === 'yearly'
                ? (filteredRiskStats || allTradesRiskStats)
                : (filteredRiskStats || riskStats)
              ) as RiskAnalysis | null ?? null
            }
          />
        </div>
      )}

      {/* Confidence & Mind State */}
      {(viewMode === 'dateRange' || viewMode === 'yearly') && (
        <>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Psychological Factors</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">Confidence and mind state at entry across your trades.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-6">
            <ConfidenceStatsCard trades={tradesToUse} isLoading={chartsLoadingState} />
            <MindStateStatsCard trades={tradesToUse} isLoading={chartsLoadingState} />
          </div>
        </>
      )}

      {/* Equity Curve - title and description outside card, then full-row card */}
      {(viewMode === 'dateRange' || viewMode === 'yearly') && (
        <>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Equity Curve</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Cumulative P&L over time.</p>
          <div className="w-full mb-6">
            <EquityCurveCard trades={tradesToUse} currencySymbol={currencySymbol} />
          </div>
        </>
      )}

      {/* Consistency & drawdown */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Consistency & drawdown</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Consistency and capital preservation metrics.</p>
      <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full">
        <ConsistencyScoreChart consistencyScore={macroStatsToUse.consistencyScore ?? 0} />
        <AverageDrawdownChart averageDrawdown={statsToUse.averageDrawdown ?? 0} />
        <MaxDrawdownChart maxDrawdown={statsToUse.maxDrawdown ?? null} />
      </div>

      {/* Performance ratios */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Performance ratios</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Return and risk-adjusted metrics.</p>
      <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full">
        <ProfitFactorChart tradesToUse={tradesToUse} totalWins={statsToUse.totalWins} totalLosses={statsToUse.totalLosses} />
        <SharpeRatioChart sharpeRatio={macroStatsToUse.sharpeWithBE ?? 0} />
        <TQIChart tradesToUse={tradesToUse} />
      </div>

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

      {/* Monthly Performance Chart - Show in both modes */}
      <div className="w-full mb-8">
        <MonthlyPerformanceChart
          monthlyStatsAllTrades={monthlyPerformanceStatsToUse}
          months={MONTHS}
          chartOptions={chartOptions}
        />
      </div>

      <div className="my-8">
        {/* Market Stats Card */}
        <MarketStatisticsCard
          marketStats={
            filteredChartStats
              ? (statsToUseForCharts.marketStats as MarketStatisticsCardProps['marketStats'])
              : marketStatsToUse
          }
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
      </div>

      <div className="my-8">
        {/* Market Profit Stats Card */}
        <MarketProfitStatisticsCard
          trades={tradesToUse}
          marketStats={
            viewMode === 'yearly'
              ? (filteredMarketStats || marketAllTradesStats) as any
              : (filteredMarketStats || marketStats) as any
          }
          chartOptions={chartOptions}
          getCurrencySymbol={getCurrencySymbol}
        />
      </div>

      <hr className="col-span-full my-10 border-t border-slate-200 dark:border-slate-700" />

      <div className="my-8">
        <TimeIntervalStatisticsCard
          data={timeIntervalChartDataToUse}
          isLoading={chartsLoadingState}
        />
      </div>

      {/* Day Stats - full width */}
      <div className="my-8">
        <DayStatisticsCard
          dayStats={filteredChartStats ? (statsToUseForCharts.dayStats as DayStatisticsCardProps['dayStats']) : dayStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
      </div>
      {/* News by event - full width */}
      <div className="my-8">
        <NewsNameChartCard trades={tradesToUse} isLoading={chartsLoadingState} />
      </div>

      {/* Potential Risk/Reward Ratio Stats & Stop Loss Size Stats — extra cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 w-full [&>*]:min-w-0">
        {hasCard('potential_rr') && (
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
          />
        </div>
      )}

      {hasCard('liquidity_stats') && (
        <div className="my-8">
          <LiquidityStatisticsCard
            liquidityStats={statsToUseForCharts.liquidityStats}
            isLoading={chartsLoadingState}
            includeTotalTrades={filteredChartStats !== null}
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
