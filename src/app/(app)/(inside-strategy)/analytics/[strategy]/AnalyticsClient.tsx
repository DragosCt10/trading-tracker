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
} from 'date-fns';
import { useRouter } from 'next/navigation';

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
  RRHitStats,
} from '@/components/dashboard/analytics/RRHitStats';
import {
  LocalHLBEStatisticsCard,
} from '@/components/dashboard/analytics/LocalHLBEStatisticsCard';
import MarketProfitStatisticsCard from '@/components/dashboard/analytics/MarketProfitStats';
import RiskPerTrade from '@/components/dashboard/analytics/RiskPerTrade';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { AverageMonthlyTradesCard } from '@/components/dashboard/analytics/AverageMonthlyTradesCard';
import { NonExecutedTradesStatCard } from '@/components/dashboard/analytics/NonExecutedTradesStatCard';
import { TQIStatCard } from '@/components/dashboard/analytics/TQIStatCard';
import { RRMultipleStatCard } from '@/components/dashboard/analytics/RRMultipleStatCard';
import { MaxDrawdownStatCard } from '@/components/dashboard/analytics/MaxDrawdownStatCard';
import { PNLPercentageStatCard } from '@/components/dashboard/analytics/PNLPercentageStatCard';
import { TotalTradesStatCard } from '@/components/dashboard/analytics/TotalTradesStatCard';
import { WinRateStatCard } from '@/components/dashboard/analytics/WinRateStatCard';
import { TotalProfitStatCard } from '@/components/dashboard/analytics/TotalProfitStatCard';
import { AverageProfitStatCard } from '@/components/dashboard/analytics/AverageProfitStatCard';
import { TotalWinsStatCard } from '@/components/dashboard/analytics/TotalWinsStatCard';
import { TotalLossesStatCard } from '@/components/dashboard/analytics/TotalLossesStatCard';
import { cn } from '@/lib/utils';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MonthlyPerformanceChart,
  computeFullMonthlyStatsFromTrades,
} from '@/components/dashboard/analytics/MonthlyPerformanceChart';
import { DateRangeValue, TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { 
  TradesCalendarCard,
  getDaysInMonthForDate,
  splitMonthIntoFourRanges,
  buildWeeklyStats,
} from '@/components/dashboard/analytics/TradesCalendarCard';
import { TradeStatDatum, TradeStatsBarCard } from '@/components/dashboard/analytics/TradesStatsBarCard';
import {
  SetupStatisticsCard,
  calculateSetupStats,
  convertSetupStatsToChartData,
  convertFilteredSetupStatsToChartData,
} from '@/components/dashboard/analytics/SetupStatisticsCard';
import {
  LiquidityStatisticsCard,
  calculateLiquidityStats,
  convertLiquidityStatsToChartData,
  convertFilteredLiquidityStatsToChartData,
} from '@/components/dashboard/analytics/LiquidityStatisticsCard';
import {
  DirectionStatisticsCard,
  calculateDirectionStats,
  convertDirectionStatsToChartData,
  convertFilteredDirectionStatsToChartData,
} from '@/components/dashboard/analytics/DirectionStatisticsCard';
import {
  LocalHLStatisticsCard,
  calculateLocalHLStats,
  convertLocalHLStatsToChartData,
  convertFilteredLocalHLStatsToChartData,
} from '@/components/dashboard/analytics/LocalHLStatisticsCard';
import {
  SLSizeStatisticsCard,
  calculateSLSizeStats,
} from '@/components/dashboard/analytics/SLSizeStatisticsCard';
import {
  TradeTypesStatisticsCard,
  calculateReentryStats,
  calculateBreakEvenStats,
  type TradeTypesStatisticsCardProps,
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
  DISPLACEMENT_BUCKETS,
} from '@/components/dashboard/analytics/DisplacementSizeStats';
import {
  AverageDisplacementSizeCard,
  getAverageDisplacementPerMarket,
} from '@/components/dashboard/analytics/AverageDisplacementSizeCard';
import { 
  ProfitFactorChart,
  calculateProfitFactor,
} from '@/components/dashboard/analytics/ProfitFactorChart';
import { 
  SharpeRatioChart,
  calculateSharpeRatio,
} from '@/components/dashboard/analytics/SharpeRatioChart';
import { 
  ConsistencyScoreChart,
  calculateConsistencyScore,
} from '@/components/dashboard/analytics/ConsistencyScoreChart';
import { calculateRiskPerTradeStats } from '@/utils/calculateRiskPerTrade';
import { calculateMarketStats } from '@/components/dashboard/analytics/MarketProfitStats';
import { calculateEvaluationStats } from '@/utils/calculateEvaluationStats';
import { chartOptions } from '@/utils/chartConfig';
import { TIME_INTERVALS } from '@/constants/analytics';
import {
  type DateRangeState,
  type FilterType,
  createInitialDateRange,
  isCustomDateRange,
} from '@/utils/dateRangeHelpers';
import { computeStatsFromTrades } from '@/utils/computeStatsFromTrades';
import { useDateRangeManagement } from '@/hooks/useDateRangeManagement';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';

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
 * Props from server (AnalyticsData)
 * ------------------------------------------------------ */

export type AnalyticsClientInitialProps = {
  initialUserId: string;
  initialFilteredTrades: Trade[];
  initialAllTrades: Trade[];
  initialNonExecutedTrades: Trade[];
  initialNonExecutedTotalTradesCount: number;
  initialDateRange: DateRangeState;
  initialSelectedYear: number;
  initialMode: 'live' | 'backtesting' | 'demo';
  initialActiveAccount: { id: string; [key: string]: unknown } | null;
  initialStrategyId?: string | null;
};

const defaultInitialRange = createInitialDateRange();
const defaultSelectedYear = new Date().getFullYear();

/* ---------------------------------------------------------
 * Dashboard component
 * ------------------------------------------------------ */

export default function AnalyticsClient(
  props?: Partial<AnalyticsClientInitialProps>
) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const initialRange = props?.initialDateRange ?? defaultInitialRange;
  const initialYear = props?.initialSelectedYear ?? defaultSelectedYear;

  const [analysisResults, setAnalysisResults] = useState<string | null>(null);
  const [openAnalyzeModal, setOpenAnalyzeModal] = useState(false);

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [selectedExecution, setSelectedExecution] = useState<'all' | 'executed' | 'nonExecuted'>('executed');

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

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

  // Hydrate React Query cache synchronously so useDashboardData sees server data on first paint (avoids hydration when e.g. no subaccounts)
  const uid = props?.initialUserId;
  const acc = props?.initialActiveAccount;
  const dr = props?.initialDateRange;
  const yr = props?.initialSelectedYear;
  if (uid && acc?.id && dr) {
    const mode = props?.initialMode ?? 'live';
    const year = yr ?? new Date().getFullYear();
    // Default to 'yearly' for initial hydration since that's the default viewMode
    const initialViewMode: 'yearly' | 'dateRange' = 'yearly';
    // For yearly mode, use year boundaries; for dateRange mode, use dr
    const effectiveStartDate = initialViewMode === 'yearly' ? `${year}-01-01` : dr.startDate;
    const effectiveEndDate = initialViewMode === 'yearly' ? `${year}-12-31` : dr.endDate;
    
    const queryKeyAllTrades = ['allTrades', mode, acc.id, uid, year, strategyId];
    const queryKeyFilteredTrades = ['filteredTrades', mode, acc.id, uid, initialViewMode, effectiveStartDate, effectiveEndDate, strategyId];
    if (queryClient.getQueryData(queryKeyAllTrades) === undefined) {
      queryClient.setQueryData(
        queryKeyFilteredTrades,
        props?.initialFilteredTrades ?? []
      );
      queryClient.setQueryData(
        queryKeyAllTrades,
        props?.initialAllTrades ?? []
      );
      queryClient.setQueryData(
        ['nonExecutedTrades', mode, acc.id, uid, initialViewMode, effectiveStartDate, effectiveEndDate, strategyId],
        props?.initialNonExecutedTrades ?? []
      );
      // Note: nonExecutedTotalTradesCount is now derived from allTrades, no need to hydrate separately
    }
  }

  // Also hydrate in useEffect for client navigations / fallback
  useEffect(() => {
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
    queryClient.setQueryData(
      queryKeyFilteredTrades,
      props?.initialFilteredTrades ?? []
    );
    queryClient.setQueryData(
      queryKeyAllTrades,
      props?.initialAllTrades ?? []
    );
    queryClient.setQueryData(
      ['nonExecutedTrades', mode, acc.id, uid, initialViewMode, effectiveStartDate, effectiveEndDate, strategyId],
      props?.initialNonExecutedTrades ?? []
    );
    // Note: nonExecutedTotalTradesCount is now derived from allTrades, no need to hydrate separately
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount with server initial data

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

  // close date picker on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    }

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  const {
    calendarMonthTrades,
    allTrades,
    filteredTrades,
    filteredTradesLoading,
    allTradesLoading,
    isLoadingTrades,
    stats,
    monthlyStats,
    monthlyStatsAllTrades,
    localHLStats,
    setupStats,
    liquidityStats,
    directionStats,
    reentryStats,
    breakEvenStats,
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
    getFilteredTradesForCalendar,
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

  const liquidityChartData: TradeStatDatum[] = convertLiquidityStatsToChartData(liquidityStats);
  const directionChartData: TradeStatDatum[] = convertDirectionStatsToChartData(directionStats);

  const localHLChartData: TradeStatDatum[] = convertLocalHLStatsToChartData(localHLStats);

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

  // Compute filtered statistics when filters are applied
  const filteredChartStats = useMemo(() => {
    // In yearly mode, execution filter doesn't apply, so only check market filter
    // In dateRange mode, if execution is nonExecuted, filter is applied
    if (viewMode === 'yearly') {
      if (selectedMarket === 'all') {
        return null; // Use hook stats
      }
    } else {
      if (selectedMarket === 'all' && (selectedExecution === 'executed' || selectedExecution === 'all')) {
        return null; // Use hook stats (executed/all is default, so no filter applied)
      }
    }
    return computeStatsFromTrades(tradesToUse);
  }, [tradesToUse, selectedMarket, selectedExecution, viewMode]);

  // Compute filtered risk stats when filters are applied
  // In yearly mode, only compute if market filter is applied (execution filter doesn't apply in yearly mode)
  // In dateRange mode, compute if either market or execution filter is applied
  const filteredRiskStats = useMemo(() => {
    if (viewMode === 'yearly') {
      // In yearly mode, only apply market filter
      if (selectedMarket === 'all') {
        return null; // Use hook stats
      }
    } else {
      // In dateRange mode, check both filters
      if (selectedMarket === 'all' && (selectedExecution === 'executed' || selectedExecution === 'all')) {
        return null; // Use hook stats (executed/all is default, so no filter applied)
      }
    }
    return calculateRiskPerTradeStats(tradesToUse);
  }, [tradesToUse, selectedMarket, selectedExecution, viewMode]);

  // Compute filtered market stats when filters are applied
  // In yearly mode, only compute if market filter is applied (execution filter doesn't apply in yearly mode)
  // In dateRange mode, compute if either market or execution filter is applied
  const filteredMarketStats = useMemo(() => {
    if (viewMode === 'yearly') {
      // In yearly mode, only apply market filter
      if (selectedMarket === 'all') {
        return null; // Use hook stats
      }
    } else {
      // In dateRange mode, check both filters
      if (selectedMarket === 'all' && (selectedExecution === 'executed' || selectedExecution === 'all')) {
        return null; // Use hook stats (executed/all is default, so no filter applied)
      }
    }
    const accountBalance = selection.activeAccount?.account_balance || 0;
    return calculateMarketStats(tradesToUse, accountBalance);
  }, [tradesToUse, selectedMarket, selectedExecution, viewMode, selection.activeAccount?.account_balance]);

  // Compute filtered evaluation stats when filters are applied
  // In yearly mode, only compute if market filter is applied (execution filter doesn't apply in yearly mode)
  // In dateRange mode, compute if either market or execution filter is applied
  const filteredEvaluationStats = useMemo(() => {
    if (viewMode === 'yearly') {
      // In yearly mode, only apply market filter
      if (selectedMarket === 'all') {
        return null; // Use hook stats
      }
    } else {
      // In dateRange mode, check both filters
      if (selectedMarket === 'all' && (selectedExecution === 'executed' || selectedExecution === 'all')) {
        return null; // Use hook stats (executed/all is default, so no filter applied)
      }
    }
    return calculateEvaluationStats(tradesToUse);
  }, [tradesToUse, selectedMarket, selectedExecution, viewMode]);

  // Use filtered stats when filters are applied, otherwise use hook stats
  const statsToUseForCharts = filteredChartStats || {
    setupStats,
    liquidityStats,
    directionStats,
    localHLStats,
    slSizeStats,
    reentryStats,
    breakEvenStats,
    intervalStats,
    mssStats,
    newsStats,
    dayStats,
    marketStats: viewMode === 'yearly' ? marketAllTradesStats : marketStats,
  };

  // Recompute chart data arrays using filtered stats when filters are applied
  const setupChartDataFiltered: TradeStatDatum[] = convertFilteredSetupStatsToChartData(statsToUseForCharts.setupStats);

  const liquidityChartDataFiltered: TradeStatDatum[] = convertFilteredLiquidityStatsToChartData(statsToUseForCharts.liquidityStats);
  const directionChartDataFiltered: TradeStatDatum[] = convertFilteredDirectionStatsToChartData(statsToUseForCharts.directionStats);

  const localHLChartDataFiltered: TradeStatDatum[] = convertFilteredLocalHLStatsToChartData(statsToUseForCharts.localHLStats);

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
    
    return filteredSource.filter((trade) => {
      const tradeDate = new Date(trade.trade_date);
      return tradeDate >= monthStart && tradeDate <= monthEnd;
    });
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
    // In yearly mode with no filters, use hook stats (execution filter doesn't apply in yearly mode)
    if (viewMode === 'yearly' && selectedMarket === 'all') {
      return stats;
    }

    // Compute stats from tradesToUse
    const nonBETrades = tradesToUse.filter((t) => !t.break_even);
    const beTrades = tradesToUse.filter((t) => t.break_even);
    
    const wins = nonBETrades.filter((t) => t.trade_outcome === 'Win').length;
    const losses = nonBETrades.filter((t) => t.trade_outcome === 'Lose').length;
    const beWins = beTrades.filter((t) => t.trade_outcome === 'Win').length;
    const beLosses = beTrades.filter((t) => t.trade_outcome === 'Lose').length;
    
    // Total trades should include all trades, including non-executed ones
    const totalTrades = tradesToUse.length;
    const totalWins = wins + beWins;
    const totalLosses = losses + beLosses;
    
    const totalProfit = tradesToUse.reduce((sum, t) => sum + (t.calculated_profit || 0), 0);
    const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    
    const nonBETotal = wins + losses;
    const winRate = nonBETotal > 0 ? (wins / nonBETotal) * 100 : 0;
    const winRateWithBE = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    
    // Calculate streaks
    let currentStreak = 0;
    let maxWinningStreak = 0;
    let maxLosingStreak = 0;
    let currentWinningStreak = 0;
    let currentLosingStreak = 0;
    
    const sortedTrades = [...tradesToUse].sort((a, b) => 
      new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );
    
    sortedTrades.forEach((trade) => {
      const isWin = trade.trade_outcome === 'Win';
      const isLoss = trade.trade_outcome === 'Lose';
      // Only count streaks for executed trades (Win or Lose)
      if (isWin) {
        currentWinningStreak++;
        currentLosingStreak = 0;
        maxWinningStreak = Math.max(maxWinningStreak, currentWinningStreak);
      } else if (isLoss) {
        currentLosingStreak++;
        currentWinningStreak = 0;
        maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
      }
      // Non-executed trades don't affect streaks
    });
    
    const lastTrade = sortedTrades[sortedTrades.length - 1];
    if (lastTrade) {
      const lastTradeOutcome = lastTrade.trade_outcome;
      if (lastTradeOutcome === 'Win') {
        currentStreak = currentWinningStreak;
      } else if (lastTradeOutcome === 'Lose') {
        currentStreak = -currentLosingStreak;
      } else {
        // For non-executed trades, find the last executed trade for streak
        for (let i = sortedTrades.length - 1; i >= 0; i--) {
          const trade = sortedTrades[i];
          if (trade.trade_outcome === 'Win') {
            currentStreak = currentWinningStreak;
            break;
          } else if (trade.trade_outcome === 'Lose') {
            currentStreak = -currentLosingStreak;
            break;
          }
        }
      }
    }
    
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
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningBalance = selection.activeAccount?.account_balance || 0;
    
    sortedTrades.forEach((trade) => {
      runningBalance += trade.calculated_profit || 0;
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const drawdown = peak > 0 ? ((peak - runningBalance) / peak) * 100 : 0;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    // Calculate average P&L percentage
    const accountBalance = selection.activeAccount?.account_balance || 1;
    const averagePnLPercentage = accountBalance > 0 ? (totalProfit / accountBalance) * 100 : 0;
    
    // Calculate partials stats
    const partialsTrades = tradesToUse.filter((t) => t.partials_taken);
    const partialsWins = partialsTrades.filter((t) => t.trade_outcome === 'Win' && !t.break_even).length;
    const partialsLosses = partialsTrades.filter((t) => t.trade_outcome === 'Lose' && !t.break_even).length;
    const partialsBEWins = partialsTrades.filter((t) => t.trade_outcome === 'Win' && t.break_even).length;
    const partialsBELosses = partialsTrades.filter((t) => t.trade_outcome === 'Lose' && t.break_even).length;
    const totalPartials = partialsWins + partialsLosses + partialsBEWins + partialsBELosses;
    const partialWinRate = (partialsWins + partialsLosses) > 0 
      ? (partialsWins / (partialsWins + partialsLosses)) * 100 
      : 0;
    const partialWinRateWithBE = totalPartials > 0 
      ? ((partialsWins + partialsBEWins) / totalPartials) * 100 
      : 0;
    
    // Override tradeQualityIndex and multipleR
    // In date range mode or when filters are applied, set to 0 when there are no executed trades (to reflect filtered data)
    // Otherwise, use hook values (they're computed from the appropriate dataset)
    const executedTradesCount = wins + losses + beWins + beLosses;
    const isFiltered = viewMode === 'dateRange' || selectedMarket !== 'all' || selectedExecution === 'nonExecuted' || selectedExecution === 'all';
    const tradeQualityIndex = (isFiltered && executedTradesCount === 0) ? 0 : (stats.tradeQualityIndex || 0);
    const multipleR = (isFiltered && executedTradesCount === 0) ? 0 : (stats.multipleR || 0);

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
      averagePnLPercentage,
      partialsTaken: totalPartials,
      partialsWins,
      partialsLosses,
      partialsBEWins,
      partialsBELosses,
      partialWinRate,
      partialWinRateWithBE,
      partialWinningTrades: partialsWins,
      partialLosingTrades: partialsLosses,
      beWinPartialTrades: partialsBEWins,
      beLosingPartialTrades: partialsBELosses,
      tradeQualityIndex,
      multipleR,
    };
  }, [viewMode, tradesToUse, selectedMarket, selectedExecution, stats, selection.activeAccount?.account_balance]);

  // Use filteredStats when filters are applied or in date range mode
  // In date range mode, always use filteredStats to reflect the selected date range
  // In yearly mode with no filters, use hook stats
  const isFiltered = viewMode === 'dateRange' || selectedMarket !== 'all' || selectedExecution === 'nonExecuted';
  const statsToUse = isFiltered ? filteredStats : stats;

  // Compute filtered macroStats when filters are applied or in date range mode
  // In date range mode, always compute from current data to reflect the selected date range
  // In yearly mode with no filters, use hook stats
  const macroStatsToUse = useMemo(() => {
    // In yearly mode with no filters, use hook stats but ensure consistent structure
    // Execution filter doesn't apply in yearly mode, so only check market filter
    if (viewMode === 'yearly' && selectedMarket === 'all') {
      return {
        ...macroStats,
        nonExecutedTotalTradesCount: nonExecutedTotalTradesCount || 0,
        yearlyPartialTradesCount: yearlyPartialTradesCount || 0,
        yearlyPartialsBECount: yearlyPartialsBECount || 0,
      };
    }

    // In date range mode or when filters are applied, compute from current filtered data
    // Compute profit factor from statsToUse
    // Profit factor = Total Gross Profit / Total Gross Loss
    // For non-executed trades, we calculate based on profit amounts, not win/loss counts
    const totalWins = statsToUse.totalWins;
    const totalLosses = statsToUse.totalLosses;
    
    const profitFactor = calculateProfitFactor(tradesToUse, totalWins, totalLosses);

    const consistencyScore = calculateConsistencyScore(monthlyStatsToUse);

    // Compute Sharpe ratio (simplified - would need returns array for full calculation)
    // For now, use a simplified version based on profit and drawdown
    const avgReturn = statsToUse.averagePnLPercentage || 0;
    const volatility = statsToUse.maxDrawdown || 1; // Use drawdown as proxy for volatility
    const sharpeWithBE = calculateSharpeRatio(avgReturn, volatility);

    // Compute TQI and RR Multiple from statsToUse
    const tradeQualityIndex = statsToUse.tradeQualityIndex || 0;
    const multipleR = statsToUse.multipleR || 0;

    // In date range mode, compute non-executed trades count from filtered nonExecutedTrades
    // In yearly mode, use hook values
    const nonExecutedCount = viewMode === 'dateRange' 
      ? (nonExecutedTrades?.length || 0)
      : (nonExecutedTotalTradesCount || 0);
    
    // Compute partial trades count from filtered trades in date range mode
    const partialTradesCount = viewMode === 'dateRange'
      ? tradesToUse.filter(t => t.partials_taken).length
      : (yearlyPartialTradesCount || 0);
    
    const partialsBECount = viewMode === 'dateRange'
      ? tradesToUse.filter(t => t.partials_taken && t.break_even).length
      : (yearlyPartialsBECount || 0);

    return {
      profitFactor,
      consistencyScore,
      consistencyScoreWithBE: consistencyScore, // Simplified - same as consistencyScore
      sharpeWithBE,
      tradeQualityIndex,
      multipleR,
      nonExecutedTotalTradesCount: nonExecutedCount,
      yearlyPartialTradesCount: partialTradesCount,
      yearlyPartialsBECount: partialsBECount,
    };
  }, [viewMode, selectedMarket, selectedExecution, statsToUse, monthlyPerformanceStatsToUse, monthlyStatsToUse, nonExecutedTrades, tradesToUse, macroStats, yearlyPartialTradesCount, yearlyPartialsBECount]);

  // Color variables based on statsToUse
  const streakColor =
    statsToUse.currentStreak > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : statsToUse.currentStreak < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-900 dark:text-slate-100';

  // Get markets from the trades being used
  const markets = Array.from(new Set(tradesToUse.map((t) => t.market)));

  return (
    <> 
      {/* View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {viewMode === 'yearly' ? 'Year in Review' : 'Date Range Analytics'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {viewMode === 'yearly' 
              ? 'Your yearly trading performance and statistics. Select a year to view.'
              : 'Your trading performance for the selected date range.'}
          </p>
        </div>
        
        {/* Toggle Switch - Fancy Design */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={cn(
            "text-sm font-semibold transition-all duration-300",
            viewMode === 'yearly' 
              ? "text-slate-900 dark:text-slate-100" 
              : "text-slate-500 dark:text-slate-400"
          )}>
            Yearly
          </span>
          
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'yearly' ? 'dateRange' : 'yearly')}
            className={cn(
              "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 shadow-md cursor-pointer",
              viewMode === 'dateRange' 
                ? "bg-gradient-to-r from-purple-500 to-violet-600 shadow-purple-500/40 dark:shadow-purple-900/50" 
                : "bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700"
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md border",
                viewMode === 'dateRange' 
                  ? "translate-x-[24px] border-purple-200/50" 
                  : "translate-x-[4px] border-slate-200/50 dark:border-slate-600/50"
              )}
            />
          </button>
          
          <span className={cn(
            "text-sm font-semibold transition-all duration-300",
            viewMode === 'dateRange' 
              ? "text-slate-900 dark:text-slate-100" 
              : "text-slate-500 dark:text-slate-400"
          )}>
            Date Range
          </span>
        </div>
      </div>

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
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Year</span>
            <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
              <SelectTrigger
                suppressHydrationWarning
                className="w-28 h-12 rounded-full bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border-slate-200/60 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300 shadow-sm text-slate-900 dark:text-slate-100"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((year) => (
                  <SelectItem
                    key={year}
                    value={String(year)}
                  >
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
      />

      {/* Performance Indicators Section */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Performance Indicators</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Visual representation of key performance metrics with interactive charts.</p>

      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 w-full">
        <ProfitFactorChart profitFactor={macroStatsToUse.profitFactor} />
        <SharpeRatioChart sharpeRatio={macroStatsToUse.sharpeWithBE} />
        <ConsistencyScoreChart consistencyScore={macroStatsToUse.consistencyScore} />
      </div>

      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Key Metrics</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Trading performance indicators and statistics.</p>

      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 w-full">

        {/* Average Monthly Trades - Only show in yearly mode */}
        {viewMode === 'yearly' && (
          <AverageMonthlyTradesCard monthlyStats={monthlyStats} />
        )}

        {/* Non-Executed Trades - Only show in yearly mode */}
        {viewMode === 'yearly' && (
          <NonExecutedTradesStatCard
            initialNonExecutedTotalTradesCount={props?.initialNonExecutedTotalTradesCount}
            nonExecutedTotalTradesCount={nonExecutedTotalTradesCount}
          />
        )}

        {/* TQI (Trade Quality Index) */}
        <TQIStatCard tradeQualityIndex={macroStatsToUse.tradeQualityIndex} />

        <RRMultipleStatCard multipleR={macroStatsToUse.multipleR} />

        <MaxDrawdownStatCard maxDrawdown={statsToUse.maxDrawdown} />

        <PNLPercentageStatCard averagePnLPercentage={statsToUse.averagePnLPercentage} />

        {/* Partial Trades - Date Range Mode */}
        {viewMode === 'dateRange' && (
          <StatCard
            title={
              <>
                Partial Trades{' '}
                <span className="text-slate-500 font-medium text-xs ml-1">
                  {statsToUse.partialWinRate.toFixed(1)}% (
                  {statsToUse.partialWinRateWithBE.toFixed(1)}% w/ BE)
                </span>
              </>
            }
            tooltipContent={
              <p className="text-xs sm:text-sm text-slate-500">
                Trades where partial profits were taken in the selected period.
              </p>
            }
            value={
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-xs text-slate-500">Winning</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {statsToUse.partialWinningTrades}{' '}
                    <span className="text-slate-500 text-sm">
                      ({statsToUse.beWinPartialTrades} BE)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Losing</p>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                    {statsToUse.partialLosingTrades}{' '}
                    <span className="text-slate-500 text-sm">
                      ({statsToUse.beLosingPartialTrades} BE)
                    </span>
                  </p>
                </div>
              </div>
            }
          />
        )}

        {/* Trading Overview Category - Show in both yearly and dateRange modes */}
        {(viewMode === 'dateRange' || viewMode === 'yearly') && (
          <>
            {/* Trading Overview Category */}
            <div className="col-span-full mt-10 mb-4">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Trading Overview</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Core trading statistics and performance metrics</p>
            </div>

            {(() => {
              // Calculate all stats from tradesToUse
              const nonBETrades = tradesToUse.filter((t) => !t.break_even);
              const beTrades = tradesToUse.filter((t) => t.break_even);
              
              const wins = nonBETrades.filter((t) => t.trade_outcome === 'Win').length;
              const losses = nonBETrades.filter((t) => t.trade_outcome === 'Lose').length;
              const beWins = beTrades.filter((t) => t.trade_outcome === 'Win').length;
              const beLosses = beTrades.filter((t) => t.trade_outcome === 'Lose').length;
              
              const totalTrades = tradesToUse.length;
              const totalWins = wins + beWins;
              const totalLosses = losses + beLosses;
              
              const totalProfit = tradesToUse.reduce((sum, t) => sum + (t.calculated_profit || 0), 0);
              const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
              
              const nonBETotal = wins + losses;
              const winRate = nonBETotal > 0 ? (wins / nonBETotal) * 100 : 0;
              const winRateWithBE = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
              
              // Calculate streaks
              let currentStreak = 0;
              let maxWinningStreak = 0;
              let maxLosingStreak = 0;
              let currentWinningStreak = 0;
              let currentLosingStreak = 0;
              
              const sortedTrades = [...tradesToUse].sort((a, b) => 
                new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
              );
              
              sortedTrades.forEach((trade) => {
                const isWin = trade.trade_outcome === 'Win';
                if (isWin) {
                  currentWinningStreak++;
                  currentLosingStreak = 0;
                  maxWinningStreak = Math.max(maxWinningStreak, currentWinningStreak);
                } else {
                  currentLosingStreak++;
                  currentWinningStreak = 0;
                  maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
                }
              });
              
              const lastTrade = sortedTrades[sortedTrades.length - 1];
              if (lastTrade) {
                currentStreak = lastTrade.trade_outcome === 'Win' ? currentWinningStreak : -currentLosingStreak;
              }
              
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
              
              const streakColorValue = currentStreak > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : currentStreak < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-slate-100';

              return (
                <>
                  <TotalTradesStatCard totalTrades={totalTrades} />

                  <WinRateStatCard winRate={winRate} winRateWithBE={winRateWithBE} />

                  <TotalProfitStatCard
                    totalProfit={totalProfit}
                    currencySymbol={currencySymbol}
                    hydrated={hydrated}
                  />

                  <AverageProfitStatCard
                    averageProfit={averageProfit}
                    currencySymbol={currencySymbol}
                    hydrated={hydrated}
                  />

                  <TotalWinsStatCard totalWins={totalWins} beWins={beWins} />

                  <TotalLossesStatCard totalLosses={totalLosses} beLosses={beLosses} />

                  <StatCard
                    title="Current Streak"
                    tooltipContent={
                      <p className="text-xs sm:text-sm text-slate-500">
                        Current winning (positive) or losing (negative) streak.
                      </p>
                    }
                    value={
                      <p className={`text-2xl font-bold ${streakColorValue}`}>
                        {currentStreak > 0 ? '+' : ''}
                        {currentStreak}
                      </p>
                    }
                  />

                  <StatCard
                    title="Best Streaks"
                    tooltipContent={
                      <p className="text-xs sm:text-sm text-slate-500">
                        Best winning and losing streaks in the selected period.
                      </p>
                    }
                    value={
                      <div className="flex gap-6 text-center">
                        <div>
                          <p className="text-xs text-slate-500">Winning</p>
                          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            +{maxWinningStreak}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Losing</p>
                          <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                            -{maxLosingStreak}
                          </p>
                        </div>
                      </div>
                    }
                  />

                  <StatCard
                    title="Average Days Between Trades"
                    tooltipContent={
                      <p className="text-xs sm:text-sm text-slate-800">
                        Average number of days between your trades in the selected period.
                      </p>
                    }
                    value={
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {averageDaysBetweenTrades.toFixed(1)} <small className="text-sm text-slate-500">days</small>
                      </p>
                    }
                  />
                </>
              );
            })()}
          </>
        )}
      </div>

      {openAnalyzeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-9999">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Trading Performance Analysis</h2>
              <button
                onClick={() => {
                  setOpenAnalyzeModal(false);
                  setAnalysisResults(null);
                }}
                className="text-stone-500 hover:text-stone-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="prose max-w-none">
              {analysisResults ? (
                analysisResults.split('\n').map((paragraph, index) => (
                  <div key={index} className="mb-6">
                    {paragraph.startsWith('##') ? (
                      <h2 className="text-xl font-bold text-stone-900 mb-3">{paragraph.replace('##', '')}</h2>
                    ) : paragraph.startsWith('###') ? (
                      <h3 className="text-lg font-semibold text-stone-800 mb-2">{paragraph.replace('###', '')}</h3>
                    ) : paragraph.startsWith('-') ? (
                      <ul className="list-disc pl-6 mb-4">
                        <li className="text-stone-700">{paragraph.replace('-', '')}</li>
                      </ul>
                    ) : (
                      <p className="text-stone-700 leading-relaxed">{paragraph}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div role="status">
                    <svg aria-hidden="true" className="w-8 h-8 text-stone-200 animate-spin fill-stone-800" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                      <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                    </svg>
                  </div>
                  <p className="ml-4 text-stone-600">Generating analysis...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="my-8 mt-12">
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          Trade Performance Analysis
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          See your trading performance metrics and statistics.
        </p>
      </div>

      {/* Risk Per Trade Card */}
      <RiskPerTrade 
        className="my-8" 
        allTradesRiskStats={
          viewMode === 'yearly' 
            ? (filteredRiskStats || allTradesRiskStats) as any
            : (filteredRiskStats || riskStats) as any
        } 
      />

      {/* Monthly Performance Chart - Show in both modes */}
      <div className="w-full mb-8">
        <MonthlyPerformanceChart
          monthlyStatsAllTrades={monthlyPerformanceStatsToUse}
          months={MONTHS}
          chartOptions={chartOptions}
        />
      </div>

      <div className="my-8">
        {/* Market Profit Statistics Card */}
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
      

      <div className="my-8">
        {/* Setup Statistics Card */}
        <SetupStatisticsCard
          setupStats={filteredChartStats ? statsToUseForCharts.setupStats : setupStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
      </div>
      

      {/* Statistics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
        {/* Liquidity Statistics Card */}
        <LiquidityStatisticsCard
          liquidityStats={filteredChartStats ? statsToUseForCharts.liquidityStats : liquidityStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />

        {/* Direction Statistics Card */}
        <DirectionStatisticsCard
          directionStats={filteredChartStats ? statsToUseForCharts.directionStats : directionStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        {/* Local H/L Analysis Card */}
        <LocalHLStatisticsCard
          localHLStats={filteredChartStats ? statsToUseForCharts.localHLStats : localHLStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />

        {/* Risk/Reward Statistics */}
        <RiskRewardStats 
          trades={tradesToUse} 
          isLoading={chartsLoadingState}
        />

        
      </div>

      {/* SL Size and Trade Types Statistics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SL Size Statistics Card */}
        <SLSizeStatisticsCard
          slSizeStats={filteredChartStats ? statsToUseForCharts.slSizeStats : slSizeStats}
          isLoading={chartsLoadingState}
        />

        {/* Trade Types Statistics Card */}
        <TradeTypesStatisticsCard
          reentryStats={
            filteredChartStats
              ? (statsToUseForCharts.reentryStats as TradeTypesStatisticsCardProps['reentryStats'])
              : reentryStats
          }
          breakEvenStats={
            filteredChartStats
              ? (statsToUseForCharts.breakEvenStats as TradeTypesStatisticsCardProps['breakEvenStats'])
              : breakEvenStats
          }
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
      </div>

      <div className="my-8">
        <TradeStatsBarCard
          title="Time Interval Analysis"
          description="Distribution of trades based on time interval"
          data={timeIntervalChartDataToUse}
          mode="winsLossesWinRate"
          heightClassName="h-72"
          isLoading={chartsLoadingState}
        />
      </div>

      <div className="my-8">
        {/* Day Statistics Card */}
        <DayStatisticsCard
          dayStats={filteredChartStats ? (statsToUseForCharts.dayStats as DayStatisticsCardProps['dayStats']) : dayStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
      </div>

      {/* MSS and News Statistics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* MSS Statistics Card */}
        <MSSStatisticsCard
          mssStats={filteredChartStats ? (statsToUseForCharts.mssStats as MSSStatisticsCardProps['mssStats']) : mssStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />

        {/* News Statistics Card */}
        <NewsStatisticsCard
          newsStats={filteredChartStats ? (statsToUseForCharts.newsStats as NewsStatisticsCardProps['newsStats']) : newsStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
        />
      </div>

      <div className="my-8">
        {/* Market Statistics Card */}
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
        {/* Evaluation Statistics */}
        <EvaluationStats
          stats={filteredEvaluationStats || evaluationStats}
          isLoading={chartsLoadingState}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Local H/L + BE Statistics */}
        <LocalHLBEStatisticsCard trades={tradesToUse} isLoading={chartsLoadingState} />

        {/* 1.4RR Hit Statistics */}
        <RRHitStats trades={tradesToUse} isLoading={chartsLoadingState} />
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
        {/* Partials + BE Statistics */}
        <PartialsBEStatisticsCard trades={tradesToUse} isLoading={chartsLoadingState} />
         
         {/* Launch Hour Trades Statistics */}
        <LaunchHourTradesCard filteredTrades={tradesToUse} isLoading={chartsLoadingState} />
      </div>
    </>
  );
}
