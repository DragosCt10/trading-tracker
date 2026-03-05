'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
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
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useAccounts } from '@/hooks/useAccounts';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

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
import {
  LocalHLBEStatisticsCard,
} from '@/components/dashboard/analytics/LocalHLBEStatisticsCard';
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
} from '@/components/dashboard/analytics/AccountOverviewCard';
import { ViewModeToggle } from '@/components/dashboard/analytics/ViewModeToggle';
import { YearSelector } from '@/components/dashboard/analytics/YearSelector';
import { AnalysisModal } from '@/components/dashboard/analytics/AnalysisModal';
import { TradingOverviewStats } from '@/components/dashboard/analytics/TradingOverviewStats';
import type { RiskAnalysis } from '@/components/dashboard/analytics/RiskPerTrade';
import {
  MonthlyPerformanceChart,
  computeFullMonthlyStatsFromTrades,
} from '@/components/dashboard/analytics/MonthlyPerformanceChart';
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
  convertFilteredLiquidityStatsToChartData,
} from '@/components/dashboard/analytics/LiquidityStatisticsCard';
import { convertFilteredDirectionStatsToChartData } from '@/components/dashboard/analytics/DirectionStatisticsCard';
import {
  LocalHLStatisticsCard,
  convertFilteredLocalHLStatsToChartData,
} from '@/components/dashboard/analytics/LocalHLStatisticsCard';
import {
  SLSizeStatisticsCard,
} from '@/components/dashboard/analytics/SLSizeStatisticsCard';
import {
  ReentryTradesChartCard,
  type ReentryTradesChartCardProps,
  calculateReentryStats,
  calculateBreakEvenStats,
} from '@/components/dashboard/analytics/ReentryTradesChartCard';
import {
  DayStatisticsCard,
  type DayStatisticsCardProps,
} from '@/components/dashboard/analytics/DayStatisticsCard';
import {
  MSSStatisticsCard,
  type MSSStatisticsCardProps,
} from '@/components/dashboard/analytics/MSSStatisticsCard';
import { NewsNameChartCard } from '@/components/dashboard/analytics/NewsNameChartCard';
import {
  MarketStatisticsCard,
  type MarketStatisticsCardProps,
} from '@/components/dashboard/analytics/MarketStatisticsCard';
import { TimeIntervalStatisticsCard } from '@/components/dashboard/analytics/TimeIntervalStatisticsCard';
import {
  EvaluationStats,
} from '@/components/dashboard/analytics/EvaluationStats';
import type { EvaluationStat } from '@/utils/calculateEvaluationStats';
import {
  LaunchHourTradesCard,
} from '@/components/dashboard/analytics/LaunchHourTradesCard';
import {
  PartialsBEStatisticsCard,
} from '@/components/dashboard/analytics/PartialsBEStatisticsCard';
import {
  DisplacementSizeStats,
} from '@/components/dashboard/analytics/DisplacementSizeStats';
import {
  AverageDisplacementSizeCard,
} from '@/components/dashboard/analytics/AverageDisplacementSizeCard';
import {
  FvgSizeStats,
} from '@/components/dashboard/analytics/FvgSizeStats';
import { 
  ProfitFactorChart,
} from '@/components/dashboard/analytics/ProfitFactorChart';
import { 
  SharpeRatioChart,
} from '@/components/dashboard/analytics/SharpeRatioChart';
import { 
  AverageDrawdownChart,
} from '@/components/dashboard/analytics/AverageDrawdownChart';
import { 
  MaxDrawdownChart,
} from '@/components/dashboard/analytics/MaxDrawdownChart';
import { 
  TQIChart,
} from '@/components/dashboard/analytics/TQIChart';
import { 
  ConsistencyScoreChart,
} from '@/components/dashboard/analytics/ConsistencyScoreChart';
import { EquityCurveCard } from '@/components/dashboard/analytics/EquityCurveCard';
import { ConfidenceStatsCard, MindStateStatsCard } from '@/components/dashboard/analytics/ConfidenceMindStateCards';
import { chartOptions } from '@/utils/chartConfig';
import { TIME_INTERVALS } from '@/constants/analytics';
import {
  calculateLiquidityStats,
  calculateDirectionStats,
  calculateLocalHLStats,
  calculateSetupStats,
  calculateSLSizeStats,
  calculateMssStats,
  calculateTrendStats,
} from '@/utils/calculateCategoryStats';
import {
  type DateRangeState,
  createInitialDateRange,
  isCustomDateRange,
} from '@/utils/dateRangeHelpers';
import { useDateRangeManagement } from '@/hooks/useDateRangeManagement';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { useFilteredStats } from '@/hooks/useFilteredStats';
import { calculateFilteredMacroStats } from '@/utils/calculateFilteredMacroStats';
import { computeStrategyStatsFromTrades } from '@/utils/computeStrategyStatsFromTrades';

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

  // Sync ActionBar selection from server only once on mount so dashboard matches initial load.
  // After that, the client selection (user's Apply in ActionBar) is the source of truth.
  const hasSyncedSelectionFromServerRef = useRef(false);
  useEffect(() => {
    if (hasSyncedSelectionFromServerRef.current) return;
    if (props?.initialActiveAccount && props.initialMode) {
      hasSyncedSelectionFromServerRef.current = true;
      setSelection({
        mode: props.initialMode,
        activeAccount: props.initialActiveAccount as Parameters<typeof setSelection>[0]['activeAccount'],
      });
    }
    // Ensure useEffect dependencies are safe: props is optional so access defensively
    // Also, props?.initialMode and setSelection will not change across renders (setSelection is from a hook)
    // so this effect will run only when initialActiveAccount or initialMode change
  }, [props?.initialActiveAccount, props?.initialMode, setSelection]);

  // Store strategyId from props
  const strategyId = props?.initialStrategyId ?? null;

  // Per-strategy extra cards configuration
  const extraCards = props?.initialExtraCards ?? [];
  const hasCard = (key: ExtraCardKey) => extraCards.includes(key);

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
    
    if (queryClient.getQueryData(queryKeyAllTrades) === undefined && !shouldSkipHydration) {
      queryClient.setQueryData(queryKeyFilteredTrades, props?.initialFilteredTrades ?? []);
      queryClient.setQueryData(queryKeyAllTrades, props?.initialAllTrades ?? []);
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
        props?.initialNonExecutedTrades ?? []
      );
      // Note: nonExecutedTotalTradesCount is now derived from allTrades, no need to hydrate separately
    }
    
    // Clear the invalidation flag after hydration check
    if (shouldSkipHydration && typeof window !== 'undefined') {
      sessionStorage.removeItem('trade-data-invalidated');
    }
  }, [props, queryClient, strategyId]);

  // Hydrate React Query cache synchronously so useDashboardData sees server data on first paint (avoids hydration when e.g. no subaccounts)
  hydrateQueryCache();

  // Also hydrate in useEffect for client navigations / fallback
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
  } = useDashboardData({
    session: userData?.session,
    dateRange,
    mode: selection.mode,
    activeAccount: (resolvedAccount ?? null) as AccountSettings | null,
    contextLoading: actionBarloading,
    isSessionLoading: userLoading,
    currentDate,
    calendarDateRange,
    selectedYear,
    selectedMarket,
    strategyId,
    viewMode,
  });

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
    allTrades,
    filteredTrades,
    nonExecutedTrades,
    filteredTradesLoading,
    setCurrentDate,
    setCalendarDateRange,
    setSelectedYear,
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

  const setupChartData: TradeStatDatum[] = convertSetupStatsToChartData(setupStats);

  const timeIntervalChartData: TradeStatDatum[] = TIME_INTERVALS.map((interval) => {
    const stat =
      intervalStats.find((s) => s.label === interval.label) ?? {
        wins: 0,
        losses: 0,
        breakEven: 0,
        winRate: 0,
        winRateWithBE: 0,
      };

    const totalTrades = stat.wins + stat.losses + (stat.breakEven ?? 0);

    return {
      category: `${interval.label}`,
      wins: stat.wins,
      losses: stat.losses,
      breakEven: stat.breakEven ?? 0,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades,
    };
  });


  // Use correct market stats based on view mode
  const marketStatsToUse = viewMode === 'yearly' ? marketAllTradesStats : marketStats;

  // Determine which monthly stats to use based on view mode (for AccountOverviewCard - profit only)
  // Determine which trades to use based on view mode, market filter, and execution filter
  const tradesToUse = useMemo(() => {
    // Get base trades based on view mode
    let baseTrades: Trade[] = viewMode === 'yearly' ? allTrades : filteredTrades;
    
    // Apply execution filter in dateRange mode
    if (viewMode === 'dateRange') {
      if (selectedExecution === 'nonExecuted') {
        baseTrades = nonExecutedTrades || [];
      } else if (selectedExecution === 'executed') {
        // Filter to only executed trades
        baseTrades = baseTrades.filter((t) => t.executed === true);
      }
      // If 'all', don't filter (show all trades) - though this shouldn't happen on analytics page
    }
    
    let filtered = baseTrades;
    
    // Apply market filter if needed
    if (selectedMarket !== 'all') {
      filtered = filtered.filter((t) => t.market === selectedMarket);
    }
    
    return filtered;
  }, [viewMode, allTrades, filteredTrades, nonExecutedTrades, selectedMarket, selectedExecution]);

  // Always calculate setup, liquidity, direction, and localHL stats from tradesToUse to ensure consistency
  const setupStatsFromTradesToUse = useMemo(() => {
    return calculateSetupStats(tradesToUse);
  }, [tradesToUse]);

  const liquidityStatsFromTradesToUse = useMemo(() => {
    return calculateLiquidityStats(tradesToUse);
  }, [tradesToUse]);

  const directionStatsFromTradesToUse = useMemo(() => {
    return calculateDirectionStats(tradesToUse);
  }, [tradesToUse]);

  const localHLStatsFromTradesToUse = useMemo(() => {
    return calculateLocalHLStats(tradesToUse);
  }, [tradesToUse]);

  const slSizeStatsFromTradesToUse = useMemo(() => {
    return calculateSLSizeStats(tradesToUse);
  }, [tradesToUse]);

  const reentryStatsFromTradesToUse = useMemo(() => {
    return calculateReentryStats(tradesToUse);
  }, [tradesToUse]);

  const breakEvenStatsFromTradesToUse = useMemo(() => {
    return calculateBreakEvenStats(tradesToUse);
  }, [tradesToUse]);

  const mssStatsFromTradesToUse = useMemo(() => {
    return calculateMssStats(tradesToUse);
  }, [tradesToUse]);

  const trendStatsFromTradesToUse = useMemo(() => {
    return calculateTrendStats(tradesToUse);
  }, [tradesToUse]);

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
      reentryStats: reentryStatsFromTradesToUse,
      breakEvenStats: breakEvenStatsFromTradesToUse,
      trendStats: trendStatsFromTradesToUse,
      intervalStats,
      mssStats,
      newsStats,
      dayStats,
      marketStats: viewMode === 'yearly' ? marketAllTradesStats : marketStats,
    },
  });

  // Recompute chart data arrays using filtered stats when filters are applied
  const setupChartDataFiltered: TradeStatDatum[] = convertFilteredSetupStatsToChartData(statsToUseForCharts.setupStats);

  const timeIntervalChartDataFiltered: TradeStatDatum[] = TIME_INTERVALS.map((interval) => {
    const stat =
      statsToUseForCharts.intervalStats.find((s) => s.label === interval.label) ?? {
        wins: 0,
        losses: 0,
        breakEven: 0,
        winRate: 0,
        winRateWithBE: 0,
      };
    return {
      category: `${interval.label}`,
      wins: stat.wins,
      losses: stat.losses,
      breakEven: stat.breakEven ?? 0,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades: stat.wins + stat.losses + (stat.breakEven ?? 0),
    };
  });

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

  // Determine loading state for AccountOverviewCard
  // When filters are applied, data is computed synchronously, so isLoading should be false
  // In date range mode with no filters, use monthlyStats from hook, so use filteredTradesLoading
  // In yearly mode with no filters, use monthlyStatsAllTrades from hook, so use allTradesLoading
  const accountOverviewLoadingState = useMemo(() => {
    // In yearly mode, execution filter doesn't apply, so only check market filter
    // In dateRange mode, if execution is nonExecuted, filter is applied
    if (viewMode === 'yearly') {
      if (selectedMarket !== 'all') {
        return false; // Market filter applied
      }
    } else {
      if (selectedMarket !== 'all' || selectedExecution === 'nonExecuted' || selectedExecution === 'all') {
        // Filters are applied (market or execution filter), data computed synchronously from tradesToUse
        // Note: 'all' is treated as a filter here since it means showing all trades (not just executed)
        return false;
      }
    }
    
    // No filters applied, use hook data - check loading state based on view mode
    // In date range mode, use filteredTradesLoading
    // In yearly mode, use allTradesLoading
    return viewMode === 'yearly' ? allTradesLoading : filteredTradesLoading;
  }, [selectedMarket, selectedExecution, viewMode, allTradesLoading, filteredTradesLoading]);

  // Determine which monthly stats to use based on view mode (for AccountOverviewCard - profit only)
  // Always compute from tradesToUse to ensure it reflects the current date range and filters
  // In yearly mode with no filters, tradesToUse uses allTrades (which is correct)
  // In date range mode, tradesToUse uses filteredTrades (which respects the date range)
  // When filters are applied, tradesToUse is already filtered
  // Calculate monthly stats from tradesToUse
  // When execution filter is set to "nonExecuted", tradesToUse will include non-executed trades
  // Non-executed trades don't have profit, so they won't affect profit-based calculations
  const monthlyStatsToUse: { [month: string]: { profit: number } } = useMemo(() => {
    return computeMonthlyStatsFromTrades(tradesToUse);
  }, [tradesToUse]);

  // Determine which full monthly stats to use based on view mode (for MonthlyPerformanceChart - wins, losses, winRate, etc.)
  // Always use tradesToUse to ensure data consistency across all cards and charts
  const monthlyPerformanceStatsToUse = useMemo(() => {
    return computeFullMonthlyStatsFromTrades(tradesToUse);
  }, [tradesToUse]);

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

  const getDaysInMonth = useMemo(
    () => getDaysInMonthForDate(currentDate),
    [currentDate]
  );

  // Get trades for the current calendar month based on view mode
  const calendarMonthTradesToUse = useMemo(() => {
    // Get base trades based on view mode
    let tradesSource: Trade[] = viewMode === 'yearly' ? allTrades : filteredTrades;
    
    // Apply execution filter in dateRange mode
    if (viewMode === 'dateRange') {
      if (selectedExecution === 'nonExecuted') {
        tradesSource = nonExecutedTrades || [];
      } else if (selectedExecution === 'executed') {
        // Filter to only executed trades
        tradesSource = tradesSource.filter((t) => t.executed === true);
      }
      // If 'all', don't filter (show all trades) - though this shouldn't happen on analytics page
    }
    
    let filteredSource = tradesSource;
    
    // Apply market filter if needed
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
  }, [viewMode, allTrades, filteredTrades, nonExecutedTrades, currentDate, selectedMarket, selectedExecution]);

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

  // Compute stats from tradesToUse when filters are applied or in date range mode
  // In date range mode, always compute from tradesToUse to reflect the selected date range
  // In yearly mode with no filters, use hook stats
  // Uses shared computeStrategyStatsFromTrades (same as ShareStrategyClient for Consistency & drawdown and Performance ratios)
  const filteredStats = useMemo(() => {
    const computed = computeStrategyStatsFromTrades({
      tradesToUse,
      accountBalance: selection.activeAccount?.account_balance || 0,
      selectedExecution,
      viewMode,
      selectedMarket,
      statsFromHook: { tradeQualityIndex: stats.tradeQualityIndex, multipleR: stats.multipleR },
    });
    return { ...stats, ...computed };
  }, [viewMode, tradesToUse, selectedMarket, selectedExecution, stats, selection.activeAccount?.account_balance]);

  // Always use filteredStats to ensure consistent drawdown calculations between yearly and date range modes
  // The hook's stats.maxDrawdown might use different calculation logic, so we recalculate from tradesToUse
  const statsToUse = filteredStats;

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
      macroStats,
    });
  }, [viewMode, selectedMarket, tradesToUse, statsToUse, monthlyStatsToUse, nonExecutedTrades, nonExecutedTotalTradesCount, yearlyPartialTradesCount, yearlyPartialsBECount, macroStats]);

  // Get markets from the trades being used
  const markets = Array.from(new Set(tradesToUse.map((t) => t.market)));

  // Half-width extra cards — rendered dynamically in a 2-column grid
  const HALF_WIDTH_EXTRA_CARDS: { key: ExtraCardKey; element: React.ReactNode }[] = [
    {
      key: 'mss_stats',
      element: (
        <MSSStatisticsCard
          mssStats={mssStatsFromTradesToUse}
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
      key: 'local_hl_be_stats',
      element: <LocalHLBEStatisticsCard trades={tradesToUse} isLoading={chartsLoadingState} />,
    },
    {
      key: 'partials_be_stats',
      element: <PartialsBEStatisticsCard trades={tradesToUse} isLoading={chartsLoadingState} />,
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
          localHLStats={localHLStatsFromTradesToUse}
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
        onViewModeChange={setViewMode}
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
          onSelectedMarketChange={setSelectedMarket}
          markets={markets}
          selectedExecution={selectedExecution}
          onSelectedExecutionChange={(execution) => {
            // Analytics page doesn't support 'all' option, so map it to 'executed'
            setSelectedExecution(execution === 'all' ? 'executed' : execution);
          }}
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
        Account balance, yearly P&amp;L, and best and worst month for the selected year.
      </p>

      {/* Account Overview Card - use resolved account (props first) so server and client match; card defers display until mount to avoid hydration when e.g. no subaccounts */}
      <AccountOverviewCard
        accountName={(resolvedAccount?.name as string | undefined) ?? null}
        currencySymbol={currencySymbol}
        updatedBalance={updatedBalance}
        totalYearProfit={totalYearProfit}
        accountBalance={((selection.activeAccount ?? props?.initialActiveAccount) as { account_balance?: number } | null)?.account_balance || 1}
        months={MONTHS}
        monthlyStatsAllTrades={monthlyStatsToUse}
        isYearDataLoading={accountOverviewLoadingState}
        tradesCount={tradesToUse.length}
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
              directionStats: filteredChartStats ? statsToUseForCharts.directionStats : directionStatsFromTradesToUse,
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        {/* Potential Risk/Reward Ratio Stats */}
        <RiskRewardStats
          trades={tradesToUse}
          isLoading={chartsLoadingState}
        />
        {/* Stop Loss Size Stats Card */}
        <SLSizeStatisticsCard
          slSizeStats={filteredChartStats ? statsToUseForCharts.slSizeStats : slSizeStatsFromTradesToUse}
          isLoading={chartsLoadingState}
        />
      </div>

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

      {/* Extra Stats Cards — rendered per strategy configuration */}
      {hasCard('setup_stats') && (
        <div className="my-8">
          <SetupStatisticsCard
            setupStats={filteredChartStats ? statsToUseForCharts.setupStats : setupStatsFromTradesToUse}
            isLoading={chartsLoadingState}
            includeTotalTrades={filteredChartStats !== null}
          />
        </div>
      )}

      {hasCard('liquidity_stats') && (
        <div className="my-8">
          <LiquidityStatisticsCard
            liquidityStats={filteredChartStats ? statsToUseForCharts.liquidityStats : liquidityStatsFromTradesToUse}
            isLoading={chartsLoadingState}
            includeTotalTrades={filteredChartStats !== null}
          />
        </div>
      )}

      {/* Half-width extra cards — dynamic grid */}
      {selectedHalfWidthCards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
          {selectedHalfWidthCards.map(({ key, element }) => (
            <div key={key}>{element}</div>
          ))}
        </div>
      )}
    </>
  );
}
