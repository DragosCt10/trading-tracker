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
import { useRouter, useParams } from 'next/navigation';

import { Trade } from '@/types/trade';
import type { AccountSettings } from '@/types/account-settings';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useAccounts } from '@/hooks/useAccounts';
import { useQueryClient } from '@tanstack/react-query';

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
  TradeTypesStatisticsCard,
  type TradeTypesStatisticsCardProps,
  calculateReentryStats,
  calculateBreakEvenStats,
} from '@/components/dashboard/analytics/TradeTypesStatisticsCard';
import {
  DayStatisticsCard,
  type DayStatisticsCardProps,
} from '@/components/dashboard/analytics/DayStatisticsCard';
import {
  MSSStatisticsCard,
  type MSSStatisticsCardProps,
} from '@/components/dashboard/analytics/MSSStatisticsCard';
import {
  NewsStatisticsCard,
  type NewsStatisticsCardProps,
} from '@/components/dashboard/analytics/NewsStatisticsCard';
import {
  MarketStatisticsCard,
  type MarketStatisticsCardProps,
} from '@/components/dashboard/analytics/MarketStatisticsCard';
import { TimeIntervalStatisticsCard } from '@/components/dashboard/analytics/TimeIntervalStatisticsCard';
import {
  EvaluationStats,
} from '@/components/dashboard/analytics/EvaluationStats';
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
  calculateNewsStats,
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
import { calculateStreaksFromTrades } from '@/utils/calculateStreaks';
import { calculatePartialTradesStats } from '@/utils/calculatePartialTradesStats';

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
  const [viewMode, setViewMode] = useState<'yearly' | 'dateRange'>('yearly');

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

  // Strategy slug from URL – cards below Market Profit Stats are only for trading-institutional
  const params = useParams();
  const strategySlug = (params?.strategy as string | undefined) ?? '';
  const isTradingInstitutional = strategySlug === 'trading-institutional';

  // Helper function to hydrate React Query cache
  const hydrateQueryCache = useCallback(() => {
    const uid = props?.initialUserId;
    const acc = props?.initialActiveAccount;
    const dr = props?.initialDateRange;
    const yr = props?.initialSelectedYear;
    
    if (!uid || !acc?.id || !dr) return;
    
    const mode = props?.initialMode ?? 'live';
    const year = yr ?? new Date().getFullYear();
    // Default to 'yearly' for initial hydration since that's the default viewMode
    const initialViewMode: 'yearly' | 'dateRange' = 'yearly';
    // For yearly mode, use year boundaries; for dateRange mode, use dr
    const effectiveStartDate = initialViewMode === 'yearly' ? `${year}-01-01` : dr.startDate;
    const effectiveEndDate = initialViewMode === 'yearly' ? `${year}-12-31` : dr.endDate;
    
    const queryKeyAllTrades = ['allTrades', mode, acc.id, uid, year, strategyId];
    const queryKeyFilteredTrades = ['filteredTrades', mode, acc.id, uid, initialViewMode, effectiveStartDate, effectiveEndDate, strategyId];
    
    // Only hydrate if data doesn't already exist AND we haven't recently invalidated trade data
    // This prevents stale initialData from being used after a trade's strategy_id changes
    const wasInvalidated = typeof window !== 'undefined' && sessionStorage.getItem('trade-data-invalidated');
    const shouldSkipHydration = wasInvalidated && (Date.now() - parseInt(wasInvalidated, 10)) < 30000; // Skip hydration for 30 seconds after invalidation
    
    if (queryClient.getQueryData(queryKeyAllTrades) === undefined && !shouldSkipHydration) {
      queryClient.setQueryData(queryKeyFilteredTrades, props?.initialFilteredTrades ?? []);
      queryClient.setQueryData(queryKeyAllTrades, props?.initialAllTrades ?? []);
      queryClient.setQueryData(
        ['nonExecutedTrades', mode, acc.id, uid, initialViewMode, effectiveStartDate, effectiveEndDate, strategyId],
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
        beWins: 0,
        beLosses: 0,
        winRate: 0,
        winRateWithBE: 0,
      };

    const totalTrades = stat.wins + stat.losses;

    return {
      category: `${interval.label}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
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

  const newsStatsFromTradesToUse = useMemo(() => {
    return calculateNewsStats(tradesToUse);
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
        beWins: 0,
        beLosses: 0,
        winRate: 0,
        winRateWithBE: 0,
      };
    const statWithTotal = stat as any;
    return {
      category: `${interval.label}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades: statWithTotal.total !== undefined ? statWithTotal.total : (stat.wins + stat.losses + stat.beWins + stat.beLosses),
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
                           (d.beWins ?? 0) > 0 || 
                           (d.beLosses ?? 0) > 0
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
  const filteredStats = useMemo(() => {
    // Always calculate drawdowns from tradesToUse to ensure consistency between yearly and date range modes
    // Even in yearly mode, we need to recalculate to ensure averageDrawdown is computed correctly
    // The hook's stats.maxDrawdown might use different calculation logic

    // Compute stats from tradesToUse
    // When execution filter is set to "nonExecuted", tradesToUse includes non-executed trades
    // In that case, use tradesToUse directly for calculations (non-executed trades may have calculated_profit)
    // Otherwise, filter to executed trades only for profit-based calculations
    const tradesForProfitCalculations = selectedExecution === 'nonExecuted' 
      ? tradesToUse 
      : tradesToUse.filter((t) => t.executed === true);
    
    const nonBETrades = tradesForProfitCalculations.filter((t) => !t.break_even);
    const beTrades = tradesForProfitCalculations.filter((t) => t.break_even);
    
    const wins = nonBETrades.filter((t) => t.trade_outcome === 'Win').length;
    const losses = nonBETrades.filter((t) => t.trade_outcome === 'Lose').length;
    const beWins = beTrades.filter((t) => t.trade_outcome === 'Win').length;
    const beLosses = beTrades.filter((t) => t.trade_outcome === 'Lose').length;
    
    // Total trades should include all trades, including non-executed ones (for display purposes)
    const totalTrades = tradesToUse.length;
    const totalWins = wins + beWins;
    const totalLosses = losses + beLosses;
    
    // Calculate profit from tradesForProfitCalculations
    // When execution filter is "nonExecuted", this includes non-executed trades (which may have calculated_profit)
    // Otherwise, this is filtered to executed trades only
    const totalProfit = tradesForProfitCalculations.reduce((sum, t) => sum + (t.calculated_profit || 0), 0);
    const tradesForProfitCount = tradesForProfitCalculations.length;
    const averageProfit = tradesForProfitCount > 0 ? totalProfit / tradesForProfitCount : 0;
    
    const nonBETotal = wins + losses;
    const winRate = nonBETotal > 0 ? (wins / nonBETotal) * 100 : 0;
    const winRateWithBE = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    
    // Streaks: include BE, sort by date only, only Win/Lose count (non-executed skipped; last trade walk-back handled in helper)
    const { currentStreak, maxWinningStreak, maxLosingStreak } = calculateStreaksFromTrades(tradesForProfitCalculations, {
      excludeBreakEven: false,
      sortByTime: false,
      countNonOutcomeAsLoss: false,
    });
    
    // Sort trades by date for drawdown and average days calculation
    const sortedTrades = [...tradesForProfitCalculations].sort((a, b) => 
      new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );
    
    // Calculate average days between trades
    let averageDaysBetweenTrades = 0;
    if (sortedTrades.length > 1) {
      const daysBetween: number[] = [];
      for (let i = 1; i < sortedTrades.length; i++) {
        const prevDate = new Date(sortedTrades[i - 1].trade_date);
        const currDate = new Date(sortedTrades[i].trade_date);
        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysBetween.push(diffDays);
      }
      averageDaysBetweenTrades = daysBetween.length > 0
        ? daysBetween.reduce((sum, days) => sum + days, 0) / daysBetween.length
        : 0;
    }
    
    // Calculate max drawdown and average drawdown
    // IMPORTANT: For consistency between yearly and date range modes, we always calculate
    // from tradesToUse using the same logic. The key is ensuring tradesToUse contains the
    // same trades in both modes when viewing the same period.
    let maxDrawdown = 0;
    const currentBalance = selection.activeAccount?.account_balance || 0;
    
    // Calculate initial balance at the START of the period
    // Note: account_balance is the CURRENT balance (includes all profits up to now)
    // For a historical period, we need: initialBalance = endBalance - totalProfit
    // where endBalance is the balance at the END of the period
    // Since we don't have easy access to future trades, we approximate:
    // initialBalance = currentBalance - totalProfit
    // This works if currentBalance represents the balance after all trades up to now,
    // and we're viewing a period that ends before now. For periods ending at "now",
    // this is accurate. For earlier periods, it's an approximation but ensures consistency.
    const initialBalance = Math.max(0, currentBalance - totalProfit);
    let peak = initialBalance; // Start peak at initial balance
    let runningBalance = initialBalance;
    const drawdowns: number[] = [];
    
    // Track drawdown at each trade point
    sortedTrades.forEach((trade, index) => {
      const balanceBefore = runningBalance;
      runningBalance += trade.calculated_profit || 0;
      const oldPeak = peak;
      
      // Update peak if we hit a new high
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      
      // Calculate drawdown only when we have a valid peak
      if (peak > 0) {
        const drawdown = ((peak - runningBalance) / peak) * 100;
        
        // Track all positive drawdowns for average calculation
        // Use a small epsilon (0.0001) to handle floating point precision issues
        if (drawdown > 0.0001) {
          drawdowns.push(drawdown);
        }
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    });
    
    // Calculate average drawdown from all tracked drawdown values
    // If we have a max drawdown but no drawdowns in array, it means we only had one drawdown point
    // In that case, use maxDrawdown as the average
    const averageDrawdown = drawdowns.length > 0
      ? drawdowns.reduce((sum, dd) => sum + dd, 0) / drawdowns.length
      : (maxDrawdown > 0 ? maxDrawdown : 0);
    
    // Calculate average P&L percentage
    const accountBalance = selection.activeAccount?.account_balance || 1;
    const averagePnLPercentage = accountBalance > 0 ? (totalProfit / accountBalance) * 100 : 0;
    
    // Calculate partials stats from tradesToUse so the Partial Trades card reflects all partial trades in the current view (date range + market), not only executed ones
    const partialStatsFromTrades = calculatePartialTradesStats(tradesToUse);
    const totalPartials = partialStatsFromTrades.totalPartialTradesCount;
    const partialsWins = partialStatsFromTrades.partialWinningTrades;
    const partialsLosses = partialStatsFromTrades.partialLosingTrades;
    const partialBETrades = partialStatsFromTrades.totalPartialsBECount;
    
    // Override tradeQualityIndex and multipleR
    // In date range mode or when filters are applied, set to 0 when there are no executed trades (to reflect filtered data)
    // Otherwise, use hook values (they're computed from the appropriate dataset)
    // Use executedTradesCount already defined above (line 740) - it counts all executed trades
    // For TQI and multipleR checks, we want to count only trades with outcomes (Win/Lose)
    const executedTradesWithOutcomes = wins + losses + beWins + beLosses;
    const isFiltered = viewMode === 'dateRange' || selectedMarket !== 'all' || selectedExecution === 'nonExecuted' || selectedExecution === 'all';
    const tradeQualityIndex = (isFiltered && executedTradesWithOutcomes === 0) ? 0 : (stats.tradeQualityIndex || 0);
    const multipleR = (isFiltered && executedTradesWithOutcomes === 0) ? 0 : (stats.multipleR || 0);

    return {
      ...stats, // Keep other stats from hook
      totalTrades,
      wins,
      losses,
      beWins,
      beLosses,
      totalWins,
      totalLosses,
      totalProfit,
      averageProfit,
      winRate,
      winRateWithBE,
      currentStreak,
      maxWinningStreak,
      maxLosingStreak,
      averageDaysBetweenTrades,
      maxDrawdown,
      averageDrawdown,
      averagePnLPercentage,
      partialsTaken: totalPartials,
      partialsWins,
      partialsLosses,
      partialBETrades,
      partialWinningTrades: partialsWins,
      partialLosingTrades: partialsLosses,
      tradeQualityIndex,
      multipleR,
    };
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

      <hr className="my-14 border-t border-slate-200 dark:border-slate-700" />

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

      {/* Core statistics: title + description, then core stats, then Partial/Executed/Direction cards, then Evaluation + Trade Types above RiskPerTrade */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Core statistics</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Trading statistics and performance metrics.</p>

      {(viewMode === 'dateRange' || viewMode === 'yearly') && (
        <div className="flex flex-col md:grid md:grid-cols-4 gap-4 w-full">
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
              evaluationStats: filteredEvaluationStats || evaluationStats,
              reentryStats: statsToUseForCharts.reentryStats as TradeTypesStatisticsCardProps['reentryStats'],
              breakEvenStats: statsToUseForCharts.breakEvenStats as TradeTypesStatisticsCardProps['breakEvenStats'],
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
      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 w-full">
        <ConsistencyScoreChart consistencyScore={macroStatsToUse.consistencyScore ?? 0} />
        <AverageDrawdownChart averageDrawdown={statsToUse.averageDrawdown ?? 0} />
        <MaxDrawdownChart maxDrawdown={statsToUse.maxDrawdown ?? null} />
      </div>

      {/* Performance ratios */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Performance ratios</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Return and risk-adjusted metrics.</p>
      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 w-full">
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

      {/* Day Stats (wider) & News Stats (narrower) - same height */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6 my-8 items-stretch">
        <DayStatisticsCard
          dayStats={filteredChartStats ? (statsToUseForCharts.dayStats as DayStatisticsCardProps['dayStats']) : dayStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
        <NewsStatisticsCard
          newsStats={newsStatsFromTradesToUse}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
      </div>

      {isTradingInstitutional && (
        <>
          <div className="my-8">
            {/* Setup Stats Card */}
            <SetupStatisticsCard
              setupStats={filteredChartStats ? statsToUseForCharts.setupStats : setupStatsFromTradesToUse}
              isLoading={chartsLoadingState}
              includeTotalTrades={filteredChartStats !== null}
            />
          </div>

          {/* Liquidity Stats (wider) & Local H/L Analysis (narrower) - same height */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6 my-8 items-stretch">
            {/* Liquidity Stats Card */}
            <LiquidityStatisticsCard
              liquidityStats={filteredChartStats ? statsToUseForCharts.liquidityStats : liquidityStatsFromTradesToUse}
              isLoading={chartsLoadingState}
              includeTotalTrades={filteredChartStats !== null}
            />
            {/* Local H/L Analysis Card - always uses same trades as Core stats row (Long/Short, Partial, Executed/Non-Executed) */}
            <LocalHLStatisticsCard
              localHLStats={localHLStatsFromTradesToUse}
              isLoading={chartsLoadingState}
              includeTotalTrades={filteredChartStats !== null}
            />
          </div>

          {/* MSS Stats & Launch Hour Trades - 50/50 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8 items-stretch">
            <MSSStatisticsCard
              mssStats={mssStatsFromTradesToUse}
              isLoading={chartsLoadingState}
              includeTotalTrades={filteredChartStats !== null}
            />
            <LaunchHourTradesCard filteredTrades={tradesToUse} isLoading={chartsLoadingState} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Local H/L & BE Stats */}
            <LocalHLBEStatisticsCard trades={tradesToUse} isLoading={chartsLoadingState} />

            {/* Partials & BE Stats */}
            <PartialsBEStatisticsCard trades={tradesToUse} isLoading={chartsLoadingState} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <AverageDisplacementSizeCard 
              trades={tradesToUse} 
              isLoading={chartsLoadingState}
            />

            {/* Displacement Size Profitability by Market and Size Points */}
            <DisplacementSizeStats 
              trades={tradesToUse} 
              isLoading={chartsLoadingState}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <FvgSizeStats
              trades={tradesToUse}
              isLoading={chartsLoadingState}
            />
          </div>
        </>
      )}
    </>
  );
}
