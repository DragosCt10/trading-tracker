'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subDays,
  startOfYear,
  endOfYear,
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
import { EvaluationStats } from '@/components/dashboard/analytics/EvaluationStats';
import { RRHitStats } from '@/components/dashboard/analytics/RRHitStats';
import MarketProfitStatisticsCard from '@/components/dashboard/analytics/MarketProfitStats';
import RiskPerTrade from '@/components/dashboard/analytics/RiskPerTrade';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { AverageMonthlyTradesCard } from '@/components/dashboard/analytics/AverageMonthlyTradesCard';
import { NonExecutedTradesStatCard } from '@/components/dashboard/analytics/NonExecutedTradesStatCard';
import { TQIStatCard } from '@/components/dashboard/analytics/TQIStatCard';
import { RRMultipleStatCard } from '@/components/dashboard/analytics/RRMultipleStatCard';
import { MaxDrawdownStatCard } from '@/components/dashboard/analytics/MaxDrawdownStatCard';
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
import { MonthlyPerformanceChart } from '@/components/dashboard/analytics/MonthlyPerformanceChart';
import { DateRangeValue, TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { 
  TradesCalendarCard,
  getDaysInMonthForDate,
  splitMonthIntoFourRanges,
  buildWeeklyStats,
} from '@/components/dashboard/analytics/TradesCalendarCard';
import { TradeStatDatum, TradeStatsBarCard } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { LaunchHourTradesCard } from '@/components/dashboard/analytics/LaunchHourTradesCard';
import { NonExecutedTradesCard } from '@/components/dashboard/analytics/NonExecutedTradesCard';
import { DisplacementSizeStats } from '@/components/dashboard/analytics/DisplacementSizeStats';
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
import { getAverageDisplacementPerMarket } from '@/utils/getAverageDisplacementPerMarket';
import { calculateRiskPerTradeStats } from '@/utils/calculateRiskPerTrade';
import { calculateMarketStats } from '@/utils/calculateCategoryStats';
import { calculateEvaluationStats } from '@/utils/calculateEvaluationStats';

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
 * Constants & helpers
 * ------------------------------------------------------ */

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: false,
      min: -0.05, // -5%
      max: 0.1, // 10%
      ticks: {
        stepSize: 0.01,
        callback(tickValue: number | string) {
          const value = Number(tickValue) * 100;
          return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
        },
      },
      grid: {
        display: false,
      },
      border: {
        display: false,
      },
    },
  },
};

const TIME_INTERVALS = [
  { label: '< 10 a.m', start: '00:00', end: '09:59' },
  { label: '10 a.m - 12 p.m', start: '10:00', end: '11:59' },
  { label: '12 p.m - 16 p.m', start: '12:00', end: '16:59' },
  { label: '17 p.m - 21 p.m', start: '17:00', end: '20:59' },
] as const;

type DateRangeState = {
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
};

type FilterType = 'year' | '15days' | '30days' | 'month';

/** Small helpers for dates & ranges */

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

function createInitialDateRange(today = new Date()): DateRangeState {
  return {
    startDate: fmt(subDays(today, 29)),
    endDate: fmt(today),
  };
}

function createCalendarRangeFromEnd(endDate: Date): DateRangeState {
  return {
    startDate: fmt(startOfMonth(endDate)),
    endDate: fmt(endOfMonth(endDate)),
  };
}

function buildPresetRange(
  type: FilterType,
  today = new Date()
): {
  dateRange: DateRangeState;
  calendarRange: DateRangeState;
  currentDate: Date;
} {
  let startDate: string;
  let endDate: string;

  if (type === 'year') {
    startDate = fmt(startOfYear(today));
    endDate = fmt(endOfYear(today));
  } else if (type === '15days') {
    endDate = fmt(today);
    startDate = fmt(subDays(today, 14));
  } else if (type === '30days') {
    endDate = fmt(today);
    startDate = fmt(subDays(today, 29));
  } else {
    // current month
    startDate = fmt(startOfMonth(today));
    endDate = fmt(endOfMonth(today));
  }

  const endDateObj = new Date(endDate);

  return {
    dateRange: { startDate, endDate },
    calendarRange: createCalendarRangeFromEnd(endDateObj),
    currentDate: endDateObj,
  };
}

function isCustomDateRange(range: DateRangeState): boolean {
  const today = new Date();

  const yearStart = fmt(startOfYear(today));
  const yearEnd = fmt(endOfYear(today));
  const last15Start = fmt(subDays(today, 14));
  const last30Start = fmt(subDays(today, 29));
  const monthStart = fmt(startOfMonth(today));
  const monthEnd = fmt(endOfMonth(today));

  const presets: DateRangeState[] = [
    { startDate: yearStart, endDate: yearEnd },
    { startDate: last15Start, endDate: fmt(today) },
    { startDate: last30Start, endDate: fmt(today) },
    { startDate: monthStart, endDate: monthEnd },
  ];

  return !presets.some(
    (p) => p.startDate === range.startDate && p.endDate === range.endDate
  );
}



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

  const [currentDate, setCurrentDate] = useState(
    () => new Date(initialRange.endDate)
  );
  const [analysisResults, setAnalysisResults] = useState<string | null>(null);
  const [openAnalyzeModal, setOpenAnalyzeModal] = useState(false);

  const [selectedYear, setSelectedYear] = useState(initialYear);

  // view mode: 'yearly' or 'dateRange'
  const [viewMode, setViewMode] = useState<'yearly' | 'dateRange'>('yearly');

  // date range + calendar state
  const [dateRange, setDateRange] = useState<DateRangeState>(initialRange);

  const [calendarDateRange, setCalendarDateRange] =
    useState<DateRangeState>(
      () => createCalendarRangeFromEnd(new Date(initialRange.endDate))
    );

  const [activeFilter, setActiveFilter] =
    useState<FilterType>('30days');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [selectedExecution, setSelectedExecution] = useState<'all' | 'executed' | 'nonExecuted'>('executed');

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const prevViewModeRef = useRef<'yearly' | 'dateRange'>(viewMode);
  const lastFilterKeyRef = useRef<string>('');

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
    const endDateObj = new Date(dateRange.endDate);
    
    if (viewMode === 'dateRange') {
      // In date range mode: temporarily use the end date
      // Will be updated to first month with trades in the effect below after allTrades is available
      setCurrentDate(endDateObj);
      setSelectedYear(endDateObj.getFullYear());
      setCalendarDateRange(createCalendarRangeFromEnd(endDateObj));
    }
    // Yearly mode calendar initialization is handled in a separate effect after allTrades is available
  }, [dateRange, viewMode]);

  // update dateRange when switching to yearly mode or when selectedYear changes
  useEffect(() => {
    if (viewMode === 'yearly') {
      const yearStart = fmt(startOfYear(new Date(selectedYear, 0, 1)));
      const yearEnd = fmt(endOfYear(new Date(selectedYear, 11, 31)));
      setDateRange({ startDate: yearStart, endDate: yearEnd });
    }
  }, [viewMode, selectedYear]);

  // reset filter to '30days' when switching back to dateRange mode from yearly mode
  useEffect(() => {
    // Only reset if switching FROM yearly TO dateRange
    if (viewMode === 'dateRange' && prevViewModeRef.current === 'yearly') {
      // Reset activeFilter to '30days' and set dateRange to default "Last 30 Days"
      setActiveFilter('30days');
      const today = new Date();
      const { dateRange: defaultRange, calendarRange, currentDate } =
        buildPresetRange('30days', today);
      setDateRange(defaultRange);
      setCurrentDate(currentDate);
      setCalendarDateRange(calendarRange);
    }
    // Update the ref to track current viewMode for next comparison
    prevViewModeRef.current = viewMode;
  }, [viewMode]);

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

  const handleFilter = useCallback((type: FilterType) => {
    const today = new Date();
    setActiveFilter(type);

    const { dateRange: nextRange, calendarRange, currentDate } =
      buildPresetRange(type, today);

    setDateRange(nextRange);
    setCurrentDate(currentDate);
    setCalendarDateRange(calendarRange);
  }, []);

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
    nonExecutedSetupStats,
    liquidityStats,
    nonExecutedLiquidityStats,
    directionStats,
    reentryStats,
    breakEvenStats,
    intervalStats,
    mssStats,
    newsStats,
    dayStats,
    marketStats,
    nonExecutedMarketStats,
    marketAllTradesStats,
    slSizeStats,
    macroStats,
    evaluationStats,
    nonExecutedTrades,
    nonExecutedTotalTradesCount,
    nonExecutedTradesLoading,
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

  // Helper function to get filtered trades for calendar navigation (respects execution and market filters)
  const getFilteredTradesForCalendar = useCallback(() => {
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
    
    // Apply market filter if needed
    if (selectedMarket !== 'all') {
      baseTrades = baseTrades.filter((t) => t.market === selectedMarket);
    }
    
    return baseTrades;
  }, [viewMode, allTrades, filteredTrades, nonExecutedTrades, selectedMarket, selectedExecution]);

  // Memoize callbacks that depend on allTrades (must be after useDashboardData)
  const canNavigateMonth = useCallback((direction: 'prev' | 'next') => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();

    if (viewMode === 'dateRange') {
      // In date range mode: only allow navigation within the selected date range AND to months with filtered trades
      // Get months that have filtered trades within the date range
      const tradesToCheck = getFilteredTradesForCalendar();
      const monthsWithTrades = new Map<string, boolean>(); // key: "year-month", value: has trades
      
      tradesToCheck.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        const tradeYear = tradeDate.getFullYear();
        const tradeMonth = tradeDate.getMonth();
        
        // Check if trade is within date range
        if (tradeDate >= startDate && tradeDate <= endDate) {
          const key = `${tradeYear}-${tradeMonth}`;
          monthsWithTrades.set(key, true);
        }
      });

      if (direction === 'prev') {
        // Can go back if there's a previous month with trades within the date range
        // Check months from current month backwards to start date
        for (let y = currentYear; y >= startYear; y--) {
          const startM = y === currentYear ? currentMonth - 1 : 11;
          const endM = y === startYear ? startMonth : 0;
          
          for (let m = startM; m >= endM; m--) {
            const key = `${y}-${m}`;
            if (monthsWithTrades.has(key)) return true;
          }
        }
        return false;
      } else {
        // Can go forward if there's a next month with trades within the date range
        // Check months from current month forwards to end date
        for (let y = currentYear; y <= endYear; y++) {
          const startM = y === currentYear ? currentMonth + 1 : 0;
          const endM = y === endYear ? endMonth : 11;
          
          for (let m = startM; m <= endM; m++) {
            const key = `${y}-${m}`;
            if (monthsWithTrades.has(key)) return true;
          }
        }
        return false;
      }
    } else {
      // In yearly mode: allow navigation within the selected year, but only to months with filtered trades
      if (currentYear !== selectedYear) return false;

      // Get months that have filtered trades in the selected year
      const tradesToCheck = getFilteredTradesForCalendar();
      const monthsWithTrades = new Set<number>();
      tradesToCheck.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        if (tradeDate.getFullYear() === selectedYear) {
          monthsWithTrades.add(tradeDate.getMonth());
        }
      });

      if (direction === 'prev') {
        // Find the previous month with trades
        for (let m = currentMonth - 1; m >= 0; m--) {
          if (monthsWithTrades.has(m)) return true;
        }
        return false;
      } else {
        // Find the next month with trades
        for (let m = currentMonth + 1; m <= 11; m++) {
          if (monthsWithTrades.has(m)) return true;
        }
        return false;
      }
    }
  }, [currentDate, dateRange, viewMode, selectedYear, getFilteredTradesForCalendar]);

  const handleMonthNavigation = useCallback((direction: 'prev' | 'next') => {
    if (!canNavigateMonth(direction)) return;

    const newDate = new Date(currentDate);
    let month = newDate.getMonth();
    const year = newDate.getFullYear();

    if (viewMode === 'yearly') {
      // In yearly mode: navigate to the next/previous month that has filtered trades
      const tradesToCheck = getFilteredTradesForCalendar();
      const monthsWithTrades = new Set<number>();
      tradesToCheck.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        if (tradeDate.getFullYear() === selectedYear) {
          monthsWithTrades.add(tradeDate.getMonth());
        }
      });

      if (direction === 'prev') {
        // Find the previous month with trades
        for (let m = month - 1; m >= 0; m--) {
          if (monthsWithTrades.has(m)) {
            month = m;
            break;
          }
        }
      } else {
        // Find the next month with trades
        for (let m = month + 1; m <= 11; m++) {
          if (monthsWithTrades.has(m)) {
            month = m;
            break;
          }
        }
      }
    } else {
      // In date range mode: navigate to the next/previous month that has filtered trades within the date range
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endYear = endDate.getFullYear();
      
      const tradesToCheck = getFilteredTradesForCalendar();
      const monthsWithTrades = new Map<string, number>(); // key: "year-month", value: month number
      
      tradesToCheck.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        const tradeYear = tradeDate.getFullYear();
        const tradeMonth = tradeDate.getMonth();
        
        // Check if trade is within date range
        if (tradeDate >= startDate && tradeDate <= endDate) {
          const key = `${tradeYear}-${tradeMonth}`;
          monthsWithTrades.set(key, tradeMonth);
        }
      });

      if (direction === 'prev') {
        // Find the previous month with trades
        let found = false;
        for (let y = year; y >= startYear && !found; y--) {
          const startM = y === year ? month - 1 : 11;
          const endM = y === startYear ? startMonth : 0;
          
          for (let m = startM; m >= endM; m--) {
            const key = `${y}-${m}`;
            if (monthsWithTrades.has(key)) {
              month = m;
              newDate.setFullYear(y);
              found = true;
              break;
            }
          }
        }
      } else {
        // Find the next month with trades
        let found = false;
        for (let y = year; y <= endYear && !found; y++) {
          const startM = y === year ? month + 1 : 0;
          const endM = y === endYear ? endMonth : 11;
          
          for (let m = startM; m <= endM; m++) {
            const key = `${y}-${m}`;
            if (monthsWithTrades.has(key)) {
              month = m;
              newDate.setFullYear(y);
              found = true;
              break;
            }
          }
        }
      }
    }

    const targetDate = new Date(year, month, 1);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    setCurrentDate(targetDate);
    setCalendarDateRange({
      startDate: format(monthStart, 'yyyy-MM-dd'),
      endDate: format(monthEnd, 'yyyy-MM-dd'),
    });
  }, [canNavigateMonth, currentDate, viewMode, selectedYear, getFilteredTradesForCalendar, dateRange]);

  // session check
  useEffect(() => {
    if (!userLoading && !userData?.session) {
      router.replace('/login');
    }
  }, [userLoading, userData, router]);

  // update calendar for yearly mode after filtered trades are available
  useEffect(() => {
    if (viewMode === 'yearly') {
      const filterKey = `${viewMode}-${selectedYear}-${selectedMarket}-${selectedExecution}`;
      
      // Skip if filters haven't changed
      if (lastFilterKeyRef.current === filterKey) {
        return;
      }
      
      const filteredTradesForCalendar = getFilteredTradesForCalendar();
      // In yearly mode: set to the first month with filtered trades, or January if no trades
      const monthsWithTrades = new Set<number>();
      filteredTradesForCalendar.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        if (tradeDate.getFullYear() === selectedYear) {
          monthsWithTrades.add(tradeDate.getMonth());
        }
      });

      // Check if current month has filtered trades
      const currentMonthHasTrades = currentDate.getFullYear() === selectedYear && 
                                     monthsWithTrades.has(currentDate.getMonth());
      
      // Only update if current month doesn't have filtered trades
      if (!currentMonthHasTrades) {
        let targetMonth = 0; // Default to January
        if (monthsWithTrades.size > 0) {
          // Find the first month with filtered trades
          for (let m = 0; m <= 11; m++) {
            if (monthsWithTrades.has(m)) {
              targetMonth = m;
              break;
            }
          }
        }
        
        const targetDate = new Date(selectedYear, targetMonth, 1);
        setCurrentDate(targetDate);
        setCalendarDateRange(createCalendarRangeFromEnd(targetDate));
      }
      
      // Update ref
      lastFilterKeyRef.current = filterKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedYear, selectedMarket, selectedExecution]);

  // update calendar for dateRange mode after filtered trades are available
  useEffect(() => {
    if (viewMode === 'dateRange' && !filteredTradesLoading) {
      const filterKey = `${viewMode}-${dateRange.startDate}-${dateRange.endDate}-${selectedMarket}-${selectedExecution}`;
      
      const filteredTradesForCalendar = getFilteredTradesForCalendar();
      const startDateObj = new Date(dateRange.startDate);
      const endDateObj = new Date(dateRange.endDate);
      
      // In date range mode: find the first month with filtered trades within the date range
      const startYear = startDateObj.getFullYear();
      const startMonth = startDateObj.getMonth();
      
      // Get months that have filtered trades within the date range
      const monthsWithTrades = new Map<string, { year: number; month: number }>();
      filteredTradesForCalendar.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        const tradeYear = tradeDate.getFullYear();
        const tradeMonth = tradeDate.getMonth();
        
        // Check if trade is within date range
        if (tradeDate >= startDateObj && tradeDate <= endDateObj) {
          const key = `${tradeYear}-${tradeMonth}`;
          if (!monthsWithTrades.has(key)) {
            monthsWithTrades.set(key, { year: tradeYear, month: tradeMonth });
          }
        }
      });
      
      // Check if current month has filtered trades and is within date range
      const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      const currentMonthHasTrades = monthsWithTrades.has(currentMonthKey);
      const filtersChanged = lastFilterKeyRef.current !== filterKey;
      
      // Reset calendar if:
      // 1. Filters have changed (date range, market, or execution filter)
      // 2. Current month doesn't have trades in the filtered date range
      if (filtersChanged || !currentMonthHasTrades) {
        // Find the first month with filtered trades, or use start date if no trades
        let targetYear = startYear;
        let targetMonth = startMonth;
        
        if (monthsWithTrades.size > 0) {
          // Find the earliest month with filtered trades
          let earliestDate = endDateObj;
          monthsWithTrades.forEach(({ year, month }) => {
            const monthDate = new Date(year, month, 1);
            if (monthDate < earliestDate) {
              earliestDate = monthDate;
              targetYear = year;
              targetMonth = month;
            }
          });
        }
        
        const targetDate = new Date(targetYear, targetMonth, 1);
        setCurrentDate(targetDate);
        setSelectedYear(targetYear);
        setCalendarDateRange(createCalendarRangeFromEnd(targetDate));
      }
      
      // Update ref
      lastFilterKeyRef.current = filterKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, dateRange.startDate, dateRange.endDate, selectedMarket, selectedExecution, filteredTrades, filteredTradesLoading]);

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

  const setupChartData: TradeStatDatum[] = setupStats.map((stat) => ({
    category: `${stat.setup}`,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: stat.winRate,
    winRateWithBE: stat.winRateWithBE,
  }));

  const liquidityChartData: TradeStatDatum[] = liquidityStats.map((stat) => ({
    category: `${stat.liquidity}`,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: stat.winRate,
    winRateWithBE: stat.winRateWithBE,
  }));

  // First, compute total trades for all directionStats (sum of wins+losses for each direction)
  const totalDirectionTrades = directionStats.reduce(
    (sum, stat) => sum + (stat.wins ?? 0) + (stat.losses ?? 0),
    0
  );

  const directionChartData: TradeStatDatum[] = directionStats.map((stat) => {
    const directionTotal = (stat.wins ?? 0) + (stat.losses ?? 0);
    const percentage =
      totalDirectionTrades > 0
        ? ((directionTotal / totalDirectionTrades) * 100).toFixed(1)
        : "0.0";
    // category like: "Long (25, 62.5%)"
    return {
      category: `${stat.direction} - ${percentage}%`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
    };
  });

  const localHLChartData: TradeStatDatum[] = [
    {
      category: `Lichidat`,
      wins: localHLStats.lichidat.wins,
      losses: localHLStats.lichidat.losses,
      beWins: localHLStats.lichidat.winsWithBE,
      beLosses: localHLStats.lichidat.lossesWithBE,
      winRate: localHLStats.lichidat.winRate,
      winRateWithBE: localHLStats.lichidat.winRateWithBE,
    },
    {
      category: `Nelichidat`,
      wins: localHLStats.nelichidat.wins,
      losses: localHLStats.nelichidat.losses,
      beWins: localHLStats.nelichidat.winsWithBE,
      beLosses: localHLStats.nelichidat.lossesWithBE,
      winRate: localHLStats.nelichidat.winRate,
      winRateWithBE: localHLStats.nelichidat.winRateWithBE,
    },
  ];

  const slSizeChartData: TradeStatDatum[] = slSizeStats.map((stat) => ({
    category: stat.market,
    value: stat.averageSlSize,
  }));

  const tradeTypesChartData: TradeStatDatum[] = [
    ...reentryStats.map((stat) => ({
      category: `Re-entry`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
    })),
    ...breakEvenStats.map((stat) => ({
      category: `Break-even`,
      wins: stat.wins,
      losses: stat.losses,
      // typically no BE expansion here
      winRate: stat.winRate,
    })),
  ];

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

  const mssChartData: TradeStatDatum[] = mssStats.map((stat) => {
    const totalTrades = stat.wins + stat.losses;

    return {
      category: stat.mss,              
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades,
    };
  });

  const newsChartData: TradeStatDatum[] = newsStats.map((stat) => {
    const totalTrades = stat.wins + stat.losses;

    return {
      category: `${stat.news}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades,
    };
  });

  const dayChartData: TradeStatDatum[] = dayStats.map((stat) => {
    const totalTrades = stat.wins + stat.losses;

    return {
      category: `${stat.day}`,
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
  
  const marketChartData: TradeStatDatum[] = marketStatsToUse.map((stat) => {
    const totalTrades = stat.wins + stat.losses;
    // keep behavior similar to your original chart: compute rate from wins/total
    const computedWinRate =
      totalTrades > 0 ? (stat.wins / totalTrades) * 100 : 0;

    return {
      category: `${stat.market}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: computedWinRate,
      winRateWithBE: stat.winRateWithBE ?? stat.winRate,
      totalTrades,
    };
  });

  // Like marketChartData, but for Local High/Low + Break Even trades
  function getLocalHLBreakEvenChartData(filteredTrades: any[]): TradeStatDatum[] {
    // trades that are both Local H/L and Break Even
    const lichidatReentryTrades = filteredTrades.filter(
      (t) => String(t.local_high_low) === 'true' && t.break_even,
    );
    // All trades in this set are break-even, so wins/losses are BE wins/losses
    const beWins = lichidatReentryTrades.filter(
      (t) => t.trade_outcome === 'Win',
    ).length;
    const beLosses = lichidatReentryTrades.filter(
      (t) => t.trade_outcome === 'Lose',
    ).length;
    const totalTrades = lichidatReentryTrades.length; // Count all trades including non-executed ones
    const executedTradesCount = beWins + beLosses;
    const winRate = executedTradesCount > 0 ? (beWins / executedTradesCount) * 100 : 0;
    const winRateWithBE = winRate; // Same as winRate since all trades are BE

    return [
      {
        category: `Local High/Low + BE`,
        wins: 0, // No regular wins since all are BE
        losses: 0, // No regular losses since all are BE
        beWins,
        beLosses,
        winRate,
        winRateWithBE,
        totalTrades,
      }
    ];
  }

  // Helper for trades with both Break Even and Partials Taken
  function getPartialsBEChartData(filteredTrades: any[]): TradeStatDatum[] {
    // Trades that are both Break Even and have Partials Taken
    const partialsBETrades = filteredTrades.filter(
      (t) => t.break_even && t.partials_taken
    );

    const totalPartialsBE = partialsBETrades.length; // Count all trades including non-executed ones

    // All trades in this set are break-even, so wins/losses are BE wins/losses
    const beWins = partialsBETrades.filter((t) => t.trade_outcome === 'Win').length;
    const beLosses = partialsBETrades.filter((t) => t.trade_outcome === 'Lose').length;
    const executedTradesCount = beWins + beLosses;
    const winRate = executedTradesCount > 0 ? (beWins / executedTradesCount) * 100 : 0;
    const winRateWithBE = winRate; // Same as winRate since all trades are BE

    return [
      {
        category: `Partials + BE`,
        wins: 0, // No regular wins since all are BE
        losses: 0, // No regular losses since all are BE
        beWins,
        beLosses,
        winRate,
        winRateWithBE,
        totalTrades: totalPartialsBE,
      },
    ];
  }

  const nonExecutedChartData: TradeStatDatum[] = nonExecutedSetupStats.map((stat) => {
    const totalTrades = stat.wins + stat.losses;

    return {
      category: `${stat.setup}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades,
    };
  });

  const nonExecutedLiquidityChartData: TradeStatDatum[] = nonExecutedLiquidityStats.map((stat) => {
    const totalTrades = stat.wins + stat.losses;

    return {
      category: `${stat.liquidity}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades,
    };
  });

  const nonExecutedMarketChartData: TradeStatDatum[] = nonExecutedMarketStats.map((stat) => {
    const totalTrades = stat.wins + stat.losses;

    return {
      category: `${stat.market}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades,
    };
  });

  


  // Helper function to compute statistics from trades array
  const computeStatsFromTrades = useMemo(() => {
    return (trades: Trade[]) => {
      // Setup stats - add total field to track all trades including non-executed
      const setupMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
      // Liquidity stats
      const liquidityMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
      // Direction stats
      const directionMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
      // Local H/L stats
      const localHLStats = { lichidat: { wins: 0, losses: 0, winsWithBE: 0, lossesWithBE: 0, total: 0 }, nelichidat: { wins: 0, losses: 0, winsWithBE: 0, lossesWithBE: 0, total: 0 } };
      // SL Size stats
      const slSizeMap = new Map<string, { total: number; sum: number }>();
      // Reentry stats
      const reentryStats = { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 };
      // Break-even stats
      const breakEvenStats = { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 };
      // Interval stats
      const intervalMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
      // MSS stats
      const mssMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
      // News stats
      const newsMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
      // Day stats
      const dayMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();
      // Market stats
      const marketMap = new Map<string, { total: number; wins: number; losses: number; beWins: number; beLosses: number }>();

      trades.forEach((trade) => {
        const isWin = trade.trade_outcome === 'Win';
        const isLoss = trade.trade_outcome === 'Lose';
        const isBE = trade.break_even;
        const setup = trade.setup_type || 'Unknown';
        const liquidity = trade.liquidity || 'Unknown';
        const direction = trade.direction || 'Unknown';
        const market = trade.market || 'Unknown';
        const mss = trade.mss || 'Unknown';
        const news = trade.news_related ? 'Yes' : 'No';
        const day = trade.day_of_week || 'Unknown';
        const slSize = trade.sl_size || 0;

        // Setup stats - count all trades including non-executed ones
        if (!setupMap.has(setup)) {
          setupMap.set(setup, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
        }
        const setupStat = setupMap.get(setup)!;
        setupStat.total++; // Count all trades, including non-executed ones
        if (isBE) {
          if (isWin) setupStat.beWins++;
          else if (isLoss) setupStat.beLosses++;
        } else {
          if (isWin) setupStat.wins++;
          else if (isLoss) setupStat.losses++;
        }

        // Liquidity stats - count all trades including non-executed ones
        if (!liquidityMap.has(liquidity)) {
          liquidityMap.set(liquidity, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
        }
        const liquidityStat = liquidityMap.get(liquidity)!;
        liquidityStat.total++; // Count all trades
        if (isBE) {
          if (isWin) liquidityStat.beWins++;
          else if (isLoss) liquidityStat.beLosses++;
        } else {
          if (isWin) liquidityStat.wins++;
          else if (isLoss) liquidityStat.losses++;
        }

        // Direction stats - count all trades including non-executed ones
        if (!directionMap.has(direction)) {
          directionMap.set(direction, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
        }
        const directionStat = directionMap.get(direction)!;
        directionStat.total++; // Count all trades
        if (isBE) {
          if (isWin) directionStat.beWins++;
          else if (isLoss) directionStat.beLosses++;
        } else {
          if (isWin) directionStat.wins++;
          else if (isLoss) directionStat.losses++;
        }

        // Local H/L stats - count all trades including non-executed ones
        const isLichidat = String(trade.local_high_low) === 'true';
        if (isLichidat) {
          localHLStats.lichidat.total++; // Count all trades
          if (isBE) {
            if (isWin) localHLStats.lichidat.winsWithBE++;
            else if (isLoss) localHLStats.lichidat.lossesWithBE++;
          } else {
            if (isWin) localHLStats.lichidat.wins++;
            else if (isLoss) localHLStats.lichidat.losses++;
          }
        } else {
          localHLStats.nelichidat.total++; // Count all trades
          if (isBE) {
            if (isWin) localHLStats.nelichidat.winsWithBE++;
            else if (isLoss) localHLStats.nelichidat.lossesWithBE++;
          } else {
            if (isWin) localHLStats.nelichidat.wins++;
            else if (isLoss) localHLStats.nelichidat.losses++;
          }
        }

        // SL Size stats
        if (!slSizeMap.has(market)) {
          slSizeMap.set(market, { total: 0, sum: 0 });
        }
        const slSizeStat = slSizeMap.get(market)!;
        slSizeStat.total++;
        slSizeStat.sum += slSize;

        // Reentry stats - count all reentry trades including non-executed ones
        if (trade.reentry) {
          reentryStats.total++; // Count all reentry trades
          if (isBE) {
            if (isWin) reentryStats.beWins++;
            else if (isLoss) reentryStats.beLosses++;
          } else {
            if (isWin) reentryStats.wins++;
            else if (isLoss) reentryStats.losses++;
          }
        }

        // Break-even stats - count all trades (BE and non-BE)
        // For BE trades, count them
        if (isBE) {
          breakEvenStats.total++; // Count all BE trades
          if (isWin) breakEvenStats.beWins++;
          else if (isLoss) breakEvenStats.beLosses++;
        } else {
          // For non-BE trades, also count them (including non-executed)
          breakEvenStats.total++; // Count all non-BE trades
          if (isWin) breakEvenStats.wins++;
          else if (isLoss) breakEvenStats.losses++;
          // Non-executed trades are counted in total but don't increment wins/losses
        }

        // Interval stats (using trade_time) - match TIME_INTERVALS labels
        const tradeTimeStr = trade.trade_time || '00:00';
        const [hours, minutes] = tradeTimeStr.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        let intervalLabel = 'Unknown';
        // Match TIME_INTERVALS: '< 10 a.m' (00:00-09:59), '10 a.m - 12 p.m' (10:00-11:59), '12 p.m - 16 p.m' (12:00-16:59), '17 p.m - 21 p.m' (17:00-20:59)
        if (totalMinutes < 600) intervalLabel = '< 10 a.m'; // 00:00 - 09:59
        else if (totalMinutes < 720) intervalLabel = '10 a.m - 12 p.m'; // 10:00 - 11:59
        else if (totalMinutes < 1020) intervalLabel = '12 p.m - 16 p.m'; // 12:00 - 16:59
        else if (totalMinutes < 1320) intervalLabel = '17 p.m - 21 p.m'; // 17:00 - 20:59
        else intervalLabel = '< 10 a.m'; // 21:00 - 23:59 falls into next day's early morning

        // Interval stats - count all trades including non-executed ones
        if (!intervalMap.has(intervalLabel)) {
          intervalMap.set(intervalLabel, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
        }
        const intervalStat = intervalMap.get(intervalLabel)!;
        intervalStat.total++; // Count all trades
        if (isBE) {
          if (isWin) intervalStat.beWins++;
          else if (isLoss) intervalStat.beLosses++;
        } else {
          if (isWin) intervalStat.wins++;
          else if (isLoss) intervalStat.losses++;
        }

        // MSS stats - count all trades including non-executed ones
        if (!mssMap.has(mss)) {
          mssMap.set(mss, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
        }
        const mssStat = mssMap.get(mss)!;
        mssStat.total++; // Count all trades
        if (isBE) {
          if (isWin) mssStat.beWins++;
          else if (isLoss) mssStat.beLosses++;
        } else {
          if (isWin) mssStat.wins++;
          else if (isLoss) mssStat.losses++;
        }

        // News stats - count all trades including non-executed ones
        if (!newsMap.has(news)) {
          newsMap.set(news, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
        }
        const newsStat = newsMap.get(news)!;
        newsStat.total++; // Count all trades
        if (isBE) {
          if (isWin) newsStat.beWins++;
          else if (isLoss) newsStat.beLosses++;
        } else {
          if (isWin) newsStat.wins++;
          else if (isLoss) newsStat.losses++;
        }

        // Day stats - count all trades including non-executed ones
        if (!dayMap.has(day)) {
          dayMap.set(day, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
        }
        const dayStat = dayMap.get(day)!;
        dayStat.total++; // Count all trades
        if (isBE) {
          if (isWin) dayStat.beWins++;
          else if (isLoss) dayStat.beLosses++;
        } else {
          if (isWin) dayStat.wins++;
          else if (isLoss) dayStat.losses++;
        }

        // Market stats - count all trades including non-executed ones
        if (!marketMap.has(market)) {
          marketMap.set(market, { total: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0 });
        }
        const marketStat = marketMap.get(market)!;
        marketStat.total++; // Count all trades
        if (isBE) {
          if (isWin) marketStat.beWins++;
          else if (isLoss) marketStat.beLosses++;
        } else {
          if (isWin) marketStat.wins++;
          else if (isLoss) marketStat.losses++;
        }
      });

      // Calculate win rates
      const calculateWinRate = (wins: number, losses: number) => {
        const total = wins + losses;
        return total > 0 ? (wins / total) * 100 : 0;
      };

      const calculateWinRateWithBE = (wins: number, losses: number, beWins: number, beLosses: number) => {
        const total = wins + losses + beWins + beLosses;
        return total > 0 ? ((wins + beWins) / total) * 100 : 0;
      };

      // Convert maps to arrays with win rates
      const setupStatsArray = Array.from(setupMap.entries()).map(([setup, stat]) => ({
        setup,
        total: stat.total,
        wins: stat.wins,
        losses: stat.losses,
        beWins: stat.beWins,
        beLosses: stat.beLosses,
        winRate: calculateWinRate(stat.wins, stat.losses),
        winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
      }));

      const liquidityStatsArray = Array.from(liquidityMap.entries()).map(([liquidity, stat]) => ({
        liquidity,
        total: stat.total,
        wins: stat.wins,
        losses: stat.losses,
        beWins: stat.beWins,
        beLosses: stat.beLosses,
        winRate: calculateWinRate(stat.wins, stat.losses),
        winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
      }));

      const directionStatsArray = Array.from(directionMap.entries()).map(([direction, stat]) => ({
        direction,
        total: stat.total,
        wins: stat.wins,
        losses: stat.losses,
        beWins: stat.beWins,
        beLosses: stat.beLosses,
        winRate: calculateWinRate(stat.wins, stat.losses),
        winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
      }));

      const slSizeStatsArray = Array.from(slSizeMap.entries()).map(([market, stat]) => ({
        market,
        averageSlSize: stat.total > 0 ? stat.sum / stat.total : 0,
      }));

      const intervalStatsArray = Array.from(intervalMap.entries()).map(([label, stat]) => ({
        label,
        total: stat.total,
        wins: stat.wins,
        losses: stat.losses,
        beWins: stat.beWins,
        beLosses: stat.beLosses,
        winRate: calculateWinRate(stat.wins, stat.losses),
        winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
      }));

      const mssStatsArray = Array.from(mssMap.entries()).map(([mss, stat]) => ({
        mss,
        total: stat.total,
        wins: stat.wins,
        losses: stat.losses,
        beWins: stat.beWins,
        beLosses: stat.beLosses,
        winRate: calculateWinRate(stat.wins, stat.losses),
        winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
      }));

      const newsStatsArray = Array.from(newsMap.entries()).map(([news, stat]) => ({
        news,
        total: stat.total,
        wins: stat.wins,
        losses: stat.losses,
        beWins: stat.beWins,
        beLosses: stat.beLosses,
        winRate: calculateWinRate(stat.wins, stat.losses),
        winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
      }));

      const dayStatsArray = Array.from(dayMap.entries()).map(([day, stat]) => ({
        day,
        total: stat.total,
        wins: stat.wins,
        losses: stat.losses,
        beWins: stat.beWins,
        beLosses: stat.beLosses,
        winRate: calculateWinRate(stat.wins, stat.losses),
        winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
      }));

      const marketStatsArray = Array.from(marketMap.entries()).map(([market, stat]) => ({
        market,
        total: stat.total,
        wins: stat.wins,
        losses: stat.losses,
        beWins: stat.beWins,
        beLosses: stat.beLosses,
        winRate: calculateWinRate(stat.wins, stat.losses),
        winRateWithBE: calculateWinRateWithBE(stat.wins, stat.losses, stat.beWins, stat.beLosses),
      }));

      // Calculate local H/L win rates
      const lichidatTotal = localHLStats.lichidat.wins + localHLStats.lichidat.losses;
      const nelichidatTotal = localHLStats.nelichidat.wins + localHLStats.nelichidat.losses;
      const lichidatTotalWithBE = lichidatTotal + localHLStats.lichidat.winsWithBE + localHLStats.lichidat.lossesWithBE;
      const nelichidatTotalWithBE = nelichidatTotal + localHLStats.nelichidat.winsWithBE + localHLStats.nelichidat.lossesWithBE;

      const localHLStatsComputed = {
        lichidat: {
          ...localHLStats.lichidat,
          wins: localHLStats.lichidat.wins,
          losses: localHLStats.lichidat.losses,
          winRate: calculateWinRate(localHLStats.lichidat.wins, localHLStats.lichidat.losses),
          winRateWithBE: calculateWinRateWithBE(
            localHLStats.lichidat.wins,
            localHLStats.lichidat.losses,
            localHLStats.lichidat.winsWithBE,
            localHLStats.lichidat.lossesWithBE
          ),
        },
        nelichidat: {
          ...localHLStats.nelichidat,
          wins: localHLStats.nelichidat.wins,
          losses: localHLStats.nelichidat.losses,
          winRate: calculateWinRate(localHLStats.nelichidat.wins, localHLStats.nelichidat.losses),
          winRateWithBE: calculateWinRateWithBE(
            localHLStats.nelichidat.wins,
            localHLStats.nelichidat.losses,
            localHLStats.nelichidat.winsWithBE,
            localHLStats.nelichidat.lossesWithBE
          ),
        },
      };

      // Calculate reentry and break-even win rates
      const reentryStatsComputed = {
        ...reentryStats,
        winRate: calculateWinRate(reentryStats.wins, reentryStats.losses),
        winRateWithBE: calculateWinRateWithBE(reentryStats.wins, reentryStats.losses, reentryStats.beWins, reentryStats.beLosses),
      };

      const breakEvenStatsComputed = {
        ...breakEvenStats,
        winRate: calculateWinRate(breakEvenStats.wins, breakEvenStats.losses),
        winRateWithBE: calculateWinRateWithBE(breakEvenStats.wins, breakEvenStats.losses, breakEvenStats.beWins, breakEvenStats.beLosses),
      };

      return {
        setupStats: setupStatsArray,
        liquidityStats: liquidityStatsArray,
        directionStats: directionStatsArray,
        localHLStats: localHLStatsComputed,
        slSizeStats: slSizeStatsArray,
        reentryStats: [reentryStatsComputed],
        breakEvenStats: [breakEvenStatsComputed],
        intervalStats: intervalStatsArray,
        mssStats: mssStatsArray,
        newsStats: newsStatsArray,
        dayStats: dayStatsArray,
        marketStats: marketStatsArray,
      };
    };
  }, []);


  // Compute full monthly stats from trades array (for MonthlyPerformanceChart - wins, losses, winRate, etc.)
  const computeFullMonthlyStatsFromTrades = useMemo(() => {
    return (trades: Trade[]): { [key: string]: { wins: number; losses: number; beWins: number; beLosses: number; winRate: number; winRateWithBE: number } } => {
      const monthlyData: { [key: string]: { wins: number; losses: number; beWins: number; beLosses: number; winRate: number; winRateWithBE: number } } = {};
      
      trades.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        const monthName = MONTHS[tradeDate.getMonth()];
        
        if (!monthlyData[monthName]) {
          monthlyData[monthName] = { wins: 0, losses: 0, beWins: 0, beLosses: 0, winRate: 0, winRateWithBE: 0 };
        }
        
        const isBreakEven = trade.break_even;
        const outcome = trade.trade_outcome;
        
        if (isBreakEven) {
          if (outcome === 'Win') {
            monthlyData[monthName].beWins += 1;
          } else if (outcome === 'Lose') {
            monthlyData[monthName].beLosses += 1;
          }
        } else {
          if (outcome === 'Win') {
            monthlyData[monthName].wins += 1;
          } else if (outcome === 'Lose') {
            monthlyData[monthName].losses += 1;
          }
        }
      });
      
      // Calculate win rates for each month
      Object.keys(monthlyData).forEach((month) => {
        const stats = monthlyData[month];
        const nonBETrades = stats.wins + stats.losses;
        const allTrades = nonBETrades + stats.beWins + stats.beLosses;
        
        stats.winRate = nonBETrades > 0 ? (stats.wins / nonBETrades) * 100 : 0;
        stats.winRateWithBE = allTrades > 0 ? ((stats.wins + stats.beWins) / allTrades) * 100 : 0;
      });
      
      return monthlyData;
    };
  }, []);

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
  }, [tradesToUse, selectedMarket, selectedExecution, viewMode, computeStatsFromTrades]);

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
  const setupChartDataFiltered: TradeStatDatum[] = statsToUseForCharts.setupStats.map((stat) => {
    const statWithTotal = stat as any;
    return {
      category: `${stat.setup}`,
      totalTrades: statWithTotal.total !== undefined ? statWithTotal.total : (stat.wins + stat.losses + stat.beWins + stat.beLosses),
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
    };
  });

  const liquidityChartDataFiltered: TradeStatDatum[] = statsToUseForCharts.liquidityStats.map((stat) => {
    const statWithTotal = stat as any;
    return {
      category: `${stat.liquidity}`,
      totalTrades: statWithTotal.total !== undefined ? statWithTotal.total : (stat.wins + stat.losses + stat.beWins + stat.beLosses),
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
    };
  });

  const totalDirectionTradesFiltered = statsToUseForCharts.directionStats.reduce(
    (sum, stat) => {
      const statWithTotal = stat as any;
      const total = statWithTotal.total !== undefined ? statWithTotal.total : ((stat.wins ?? 0) + (stat.losses ?? 0) + (stat.beWins ?? 0) + (stat.beLosses ?? 0));
      return sum + total;
    },
    0
  );

  const directionChartDataFiltered: TradeStatDatum[] = statsToUseForCharts.directionStats.map((stat) => {
    const statWithTotal = stat as any;
    const directionTotal = statWithTotal.total !== undefined ? statWithTotal.total : ((stat.wins ?? 0) + (stat.losses ?? 0) + (stat.beWins ?? 0) + (stat.beLosses ?? 0));
    const percentage =
      totalDirectionTradesFiltered > 0
        ? ((directionTotal / totalDirectionTradesFiltered) * 100).toFixed(1)
        : "0.0";
    return {
      category: `${stat.direction} - ${percentage}%`,
      totalTrades: directionTotal,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
    };
  });

  const localHLChartDataFiltered: TradeStatDatum[] = [
    {
      category: `Lichidat`,
      totalTrades: (statsToUseForCharts.localHLStats.lichidat as any).total !== undefined 
        ? (statsToUseForCharts.localHLStats.lichidat as any).total 
        : (statsToUseForCharts.localHLStats.lichidat.wins + statsToUseForCharts.localHLStats.lichidat.losses + statsToUseForCharts.localHLStats.lichidat.winsWithBE + statsToUseForCharts.localHLStats.lichidat.lossesWithBE),
      wins: statsToUseForCharts.localHLStats.lichidat.wins,
      losses: statsToUseForCharts.localHLStats.lichidat.losses,
      beWins: statsToUseForCharts.localHLStats.lichidat.winsWithBE,
      beLosses: statsToUseForCharts.localHLStats.lichidat.lossesWithBE,
      winRate: statsToUseForCharts.localHLStats.lichidat.winRate,
      winRateWithBE: statsToUseForCharts.localHLStats.lichidat.winRateWithBE,
    },
    {
      category: `Nelichidat`,
      totalTrades: (statsToUseForCharts.localHLStats.nelichidat as any).total !== undefined 
        ? (statsToUseForCharts.localHLStats.nelichidat as any).total 
        : (statsToUseForCharts.localHLStats.nelichidat.wins + statsToUseForCharts.localHLStats.nelichidat.losses + statsToUseForCharts.localHLStats.nelichidat.winsWithBE + statsToUseForCharts.localHLStats.nelichidat.lossesWithBE),
      wins: statsToUseForCharts.localHLStats.nelichidat.wins,
      losses: statsToUseForCharts.localHLStats.nelichidat.losses,
      beWins: statsToUseForCharts.localHLStats.nelichidat.winsWithBE,
      beLosses: statsToUseForCharts.localHLStats.nelichidat.lossesWithBE,
      winRate: statsToUseForCharts.localHLStats.nelichidat.winRate,
      winRateWithBE: statsToUseForCharts.localHLStats.nelichidat.winRateWithBE,
    },
  ];

  const slSizeChartDataFiltered: TradeStatDatum[] = statsToUseForCharts.slSizeStats.map((stat) => ({
    category: stat.market,
    value: stat.averageSlSize,
  }));

  const tradeTypesChartDataFiltered: TradeStatDatum[] = [
    ...statsToUseForCharts.reentryStats.map((stat) => {
      const statWithTotal = stat as any;
      return {
        category: `Re-entry`,
        totalTrades: statWithTotal.total !== undefined ? statWithTotal.total : (stat.wins + stat.losses + stat.beWins + stat.beLosses),
        wins: stat.wins,
        losses: stat.losses,
        beWins: stat.beWins,
        beLosses: stat.beLosses,
        winRate: stat.winRate,
        winRateWithBE: stat.winRateWithBE,
      };
    }),
    ...statsToUseForCharts.breakEvenStats.map((stat) => {
      const statWithTotal = stat as any;
      return {
        category: `Break-even`,
        totalTrades: statWithTotal.total !== undefined ? statWithTotal.total : (stat.wins + stat.losses + stat.beWins + stat.beLosses),
        wins: stat.wins,
        losses: stat.losses,
        winRate: stat.winRate,
      };
    }),
  ];

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

  const mssChartDataFiltered: TradeStatDatum[] = statsToUseForCharts.mssStats.map((stat) => {
    const statWithTotal = stat as any;
    return {
      category: stat.mss,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades: statWithTotal.total !== undefined ? statWithTotal.total : (stat.wins + stat.losses + stat.beWins + stat.beLosses),
    };
  });

  const newsChartDataFiltered: TradeStatDatum[] = statsToUseForCharts.newsStats.map((stat) => {
    const statWithTotal = stat as any;
    return {
      category: `${stat.news}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades: statWithTotal.total !== undefined ? statWithTotal.total : (stat.wins + stat.losses + stat.beWins + stat.beLosses),
    };
  });

  const dayChartDataFiltered: TradeStatDatum[] = statsToUseForCharts.dayStats.map((stat) => {
    const statWithTotal = stat as any;
    return {
      category: `${stat.day}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
      totalTrades: statWithTotal.total !== undefined ? statWithTotal.total : (stat.wins + stat.losses + stat.beWins + stat.beLosses),
    };
  });

  const marketChartDataFiltered: TradeStatDatum[] = statsToUseForCharts.marketStats.map((stat) => {
    const totalTrades = stat.wins + stat.losses;
    const computedWinRate = totalTrades > 0 ? (stat.wins / totalTrades) * 100 : 0;
    return {
      category: `${stat.market}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: computedWinRate,
      winRateWithBE: stat.winRateWithBE ?? stat.winRate,
      totalTrades,
    };
  });

  // Use filtered chart data when filters are applied, otherwise use original
  const setupChartDataToUse = filteredChartStats ? setupChartDataFiltered : setupChartData;
  const liquidityChartDataToUse = filteredChartStats ? liquidityChartDataFiltered : liquidityChartData;
  const directionChartDataToUse = filteredChartStats ? directionChartDataFiltered : directionChartData;
  const localHLChartDataToUse = filteredChartStats ? localHLChartDataFiltered : localHLChartData;
  const slSizeChartDataToUse = filteredChartStats ? slSizeChartDataFiltered : slSizeChartData;
  const tradeTypesChartDataToUse = filteredChartStats ? tradeTypesChartDataFiltered : tradeTypesChartData;
  const timeIntervalChartDataToUse = filteredChartStats ? timeIntervalChartDataFiltered : timeIntervalChartData;
  const mssChartDataToUse = filteredChartStats ? mssChartDataFiltered : mssChartData;
  const newsChartDataToUse = filteredChartStats ? newsChartDataFiltered : newsChartData;
  const dayChartDataToUse = filteredChartStats ? dayChartDataFiltered : dayChartData;
  const marketChartDataToUse = filteredChartStats ? marketChartDataFiltered : marketChartData;

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
  }, [tradesToUse, computeFullMonthlyStatsFromTrades]);

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
  const profitColor =
    statsToUse.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const avgProfitColor =
    statsToUse.averageProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const pnlColor =
    statsToUse.averagePnLPercentage > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : statsToUse.averagePnLPercentage < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-900 dark:text-slate-100';
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

        <StatCard
          title="P&L %"
          tooltipContent={
            <p className="text-xs sm:text-sm text-slate-500">
              Average P&amp;L % over starting balance.
            </p>
          }
          value={
            <p className={`text-2xl font-bold ${pnlColor}`}>
              {statsToUse.averagePnLPercentage.toFixed(2)}%
            </p>
          }
        />

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
                  <StatCard
                    title="Total Trades"
                    value={
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {totalTrades}
                      </p>
                    }
                  />

                  <StatCard
                    title="Win Rate"
                    value={
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {winRate.toFixed(2)}%
                        <span className="text-slate-500 text-sm ml-1">
                          ({winRateWithBE.toFixed(2)}% w/ BE)
                        </span>
                      </p>
                    }
                  />

                  <StatCard
                    title="Total Profit"
                    value={
                      <p className={hydrated ? `text-2xl font-bold ${profitColor}` : 'text-2xl font-bold text-slate-900 dark:text-slate-100'}>
                        {hydrated ? `${currencySymbol}${totalProfit.toFixed(2)}` : '\u2014'}
                      </p>
                    }
                  />

                  <StatCard
                    title="Average Profit"
                    value={
                      <p className={hydrated ? `text-2xl font-bold ${avgProfitColor}` : 'text-2xl font-bold text-slate-900 dark:text-slate-100'}>
                        {hydrated ? `${currencySymbol}${averageProfit.toFixed(2)}` : '\u2014'}
                      </p>
                    }
                  />

                  <StatCard
                    title="Total Wins"
                    value={
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {totalWins}
                        {beWins > 0 && (
                          <span className="text-sm font-medium text-slate-500 ml-1">
                            ({beWins} BE)
                          </span>
                        )}
                      </p>
                    }
                  />

                  <StatCard
                    title="Total Losses"
                    value={
                      <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                        {totalLosses}
                        {beLosses > 0 && (
                          <span className="text-sm font-medium text-slate-500 ml-1">
                            ({beLosses} BE)
                          </span>
                        )}
                      </p>
                    }
                  />

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
        <TradeStatsBarCard
          title="Setup Statistics"
          description="Distribution of trades based on trading setup"
          data={setupChartDataToUse}
          mode="winsLossesWinRate"
          isLoading={chartsLoadingState}
        />
      </div>
      

      {/* Statistics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
        {/* Liquidity Statistics Card */}
        <TradeStatsBarCard
          title="Liquidity Statistics"
          description="Distribution of trades based on market liquidity conditions"
          data={liquidityChartDataToUse}
          isLoading={chartsLoadingState}
        />

        {/* Direction Statistics Card */}
        <TradeStatsBarCard
          title="Long/Short Statistics"
          description="Distribution of trades based on direction"
          data={directionChartDataToUse}
          isLoading={chartsLoadingState}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        {/* Local H/L Analysis Card */}
        <TradeStatsBarCard
          title="Local H/L Analysis"
          description="Distribution of trades based on local high/low status"
          data={localHLChartDataToUse}
          isLoading={chartsLoadingState}
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
        <TradeStatsBarCard
          title="SL Size Statistics"
          description="Distribution of trades based on SL size"
          data={slSizeChartDataToUse}
          mode="singleValue"
          valueKey="value"
          isLoading={chartsLoadingState}
        />

        {/* Trade Types Statistics Card */}
        <TradeStatsBarCard
          title="Trade Types Statistics"
          description="Distribution of trades based on trade type"
          data={tradeTypesChartDataToUse}
          isLoading={chartsLoadingState}
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
        <TradeStatsBarCard
          title="Day Statistics"
          description="Distribution of trades based on day of the week"
          data={dayChartDataToUse}
          mode="winsLossesWinRate"
          heightClassName="h-72"
          isLoading={chartsLoadingState}
        />
      </div>

      {/* MSS and News Statistics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* MSS Statistics Card */}
        <TradeStatsBarCard
          title="MSS Statistics"
          description="Distribution of trades based on MSS"
          data={mssChartDataToUse}
          mode="winsLossesWinRate"
          heightClassName="h-72"
          isLoading={chartsLoadingState}
        />

        {/* News Statistics Card */}
        <TradeStatsBarCard
          title="News Statistics"
          description="Distribution of trades based on news"
          data={newsChartDataToUse}
          mode="winsLossesWinRate"
          heightClassName="h-72"
          isLoading={chartsLoadingState}
        />
      </div>

      <div className="my-8">
        {/* Market Statistics Card */}
        <TradeStatsBarCard
          title="Market Statistics"
          description="Distribution of trades based on market"
          data={marketChartDataToUse}
          mode="winsLossesWinRate"
          heightClassName="h-72"
          isLoading={chartsLoadingState}
        />
      </div>

      <div className="my-8">
        {/* Evaluation Statistics */}
        <EvaluationStats stats={filteredEvaluationStats || evaluationStats} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Local H/L + BE Statistics */}
        <TradeStatsBarCard
          title="Local H/L + BE Statistics"
          description="Analysis of trades marked as both Local High/Low and Break Even"
          data={getLocalHLBreakEvenChartData(tradesToUse)}
          mode="winsLossesWinRate"
          heightClassName="h-80"
          isLoading={chartsLoadingState}
        />

        {/* 1.4RR Hit Statistics */}
        <RRHitStats trades={tradesToUse} isLoading={chartsLoadingState} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TradeStatsBarCard
          title="Average Displacement Size (Points)"
          description="Average displacement size (points) for each market."
          data={getAverageDisplacementPerMarket(tradesToUse)}
          mode="singleValue"
          isLoading={chartsLoadingState}
          valueKey="value"
        />
        
        {/* Displacement Size Profitability by Market and Size Points */}
        <DisplacementSizeStats 
          trades={tradesToUse} 
          isLoading={chartsLoadingState}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Partials + BE Statistics */}
        <TradeStatsBarCard
          title="Partials + BE Statistics"
          description="Analysis of trades marked as both Break Even and Partials Taken"
          data={getPartialsBEChartData(tradesToUse)}
          mode="winsLossesWinRate"  
          heightClassName="h-80"
          isLoading={chartsLoadingState}
        />
         
         {/* Launch Hour Trades Statistics */}
        <LaunchHourTradesCard filteredTrades={tradesToUse} />
      </div>



      <div className="mt-20">
        <h2 className="text-2xl font-semibold text-slate-800">
          Non-executed Trades
        </h2>
        <p className="text-base text-slate-500 mt-1">
          Planned but unexecuted trades overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        {/* Non Executed Trades Statistics */}
        <NonExecutedTradesCard nonExecutedTrades={nonExecutedTrades} />

        {/* <TradeStatsBarCard
          title="Non-Executed Trades Liquidity Statistics"
          description="Distribution of non-executed trades based on trading liquidity"
          data={nonExecutedLiquidityChartData}
          mode="winsLossesWinRate"
          heightClassName="h-72"
          isLoading={chartsLoadingState}
        /> */}
      </div>

      <div className="space-y-8">
        {/* <TradeStatsBarCard
          title="Non-Executed Trades Setup Statistics"
          description="Distribution of non-executed trades based on trading setup"
          data={nonExecutedChartData}
          mode="winsLossesWinRate"
          heightClassName="h-72"
          isLoading={chartsLoadingState}
        />

        <TradeStatsBarCard
          title="Non-Executed Trades Market Statistics"
          description="Distribution of non-executed trades based on market"
          data={nonExecutedMarketChartData}
          mode="winsLossesWinRate"
          heightClassName="h-96"
          isLoading={chartsLoadingState}
        /> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
        {/* <TradeStatsBarCard
          title="Average Displacement Size (Points)"
          description="Average displacement size (points) for each market."
          data={getAverageDisplacementPerMarket(nonExecutedTrades)}
          mode="singleValue"
          valueKey="value"
          isLoading={chartsLoadingState}
        /> */}
        
        {/* Displacement Size Profitability by Market and Size Points */}
        {/* <DisplacementSizeStats 
          trades={nonExecutedTrades} 
          isLoading={chartsLoadingState}
        /> */}
      </div>
    </>
  );
}
