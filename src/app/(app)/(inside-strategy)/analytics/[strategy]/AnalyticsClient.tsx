'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
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
import { cn } from '@/lib/utils';
import { MonthPerformanceCard } from '@/components/dashboard/analytics/MonthPerformanceCard';
import { AccountOverviewCard } from '@/components/dashboard/analytics/AccountOverviewCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthlyPerformanceChart } from '@/components/dashboard/analytics/MonthlyPerformanceChart';
import { DateRangeValue, TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { TradesCalendarCard } from '@/components/dashboard/analytics/TradesCalendarCard';
import { TradeStatDatum, TradeStatsBarCard } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { LaunchHourTradesCard } from '@/components/dashboard/analytics/LaunchHourTradesCard';
import { NonExecutedTradesCard } from '@/components/dashboard/analytics/NonExecutedTradesCard';
import { DisplacementSizeStats } from '@/components/dashboard/analytics/DisplacementSizeStats';
import { getAverageDisplacementPerMarket } from '@/utils/getAverageDisplacementPerMarket';

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

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  HKD: 'HK$',
  NZD: 'NZ$',
} as const;

const TIME_INTERVALS = [
  { label: '< 10 a.m', start: '00:00', end: '09:59' },
  { label: '10 a.m - 12 p.m', start: '10:00', end: '11:59' },
  { label: '12 p.m - 16 p.m', start: '12:00', end: '16:59' },
  { label: '17 p.m - 21 p.m', start: '17:00', end: '20:59' },
] as const;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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

function getCurrencySymbolFromAccount(
  account?: { currency?: string | null }
): string {
  if (!account?.currency) return '$';
  return (
    CURRENCY_SYMBOLS[account.currency as keyof typeof CURRENCY_SYMBOLS] ??
    account.currency
  );
}

function getDaysInMonthForDate(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  });
}

function getDayAggregates(trades: Trade[]) {
  const totalProfit = trades.reduce(
    (sum, trade) => sum + (trade.calculated_profit || 0),
    0
  );
  return {
    totalTrades: trades.length,
    totalProfit,
  };
}

function splitMonthIntoFourRanges(date: Date): Date[][] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const daysInMonth = eachDayOfInterval({ start, end });
  const totalDays = daysInMonth.length;

  const ranges: Date[][] = [];
  const baseSize = Math.floor(totalDays / 4);
  let remainder = totalDays % 4;
  let currentIndex = 0;

  for (let i = 0; i < 4; i++) {
    const size = baseSize + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    ranges.push(daysInMonth.slice(currentIndex, currentIndex + size));
    currentIndex += size;
  }

  return ranges;
}

function buildWeeklyStats(
  currentDate: Date,
  calendarMonthTrades: Trade[],
  selectedMarket: string,
  accountBalance: number
) {
  const weekRanges = splitMonthIntoFourRanges(currentDate);

  return weekRanges.map((days, idx) => {
    const trades = days.flatMap((day) =>
      calendarMonthTrades.filter(
        (trade) =>
          format(new Date(trade.trade_date), 'yyyy-MM-dd') ===
          format(day, 'yyyy-MM-dd')
      )
    );

    const filteredTrades =
      selectedMarket === 'all'
        ? trades
        : trades.filter((t) => t.market === selectedMarket);

    const nonBETrades = filteredTrades.filter((t) => !t.break_even);
    const beTrades = filteredTrades.filter((t) => t.break_even);

    const totalProfit = nonBETrades.reduce(
      (sum, trade) => sum + (trade.calculated_profit || 0),
      0
    );

    const wins = nonBETrades.filter(
      (t) => t.trade_outcome === 'Win'
    ).length;

    const losses = nonBETrades.filter(
      (t) => t.trade_outcome === 'Lose'
    ).length;

    const beCount = beTrades.length;

    const weekLabel = `${format(days[0], 'd MMM')} - ${format(
      days[days.length - 1],
      'd MMM'
    )}`;

    const pnlPercent =
      accountBalance > 0 ? (totalProfit / accountBalance) * 100 : 0;

    return {
      totalProfit,
      wins,
      losses,
      beCount,
      weekLabel,
      pnlPercent,
      index: idx,
    };
  });
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
    const queryKeyAllTrades = ['allTrades', mode, acc.id, uid, year, strategyId];
    const queryKeyFilteredTrades = ['filteredTrades', mode, acc.id, uid, dr.startDate, dr.endDate, strategyId];
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
        ['nonExecutedTrades', mode, acc.id, uid, dr.startDate, dr.endDate, strategyId],
        props?.initialNonExecutedTrades ?? []
      );
      queryClient.setQueryData(
        ['nonExecutedTotalTradesCount', mode, acc.id, uid, year, strategyId],
        props?.initialNonExecutedTotalTradesCount ?? 0
      );
    }
  }

  // Also hydrate in useEffect for client navigations / fallback
  useEffect(() => {
    if (!uid || !acc?.id || !dr) return;
    const mode = props?.initialMode ?? 'live';
    const year = yr ?? new Date().getFullYear();
    const queryKeyAllTrades = ['allTrades', mode, acc.id, uid, year, strategyId];
    const queryKeyFilteredTrades = ['filteredTrades', mode, acc.id, uid, dr.startDate, dr.endDate, strategyId];
    queryClient.setQueryData(
      queryKeyFilteredTrades,
      props?.initialFilteredTrades ?? []
    );
    queryClient.setQueryData(
      queryKeyAllTrades,
      props?.initialAllTrades ?? []
    );
    queryClient.setQueryData(
      ['nonExecutedTrades', mode, acc.id, uid, dr.startDate, dr.endDate, strategyId],
      props?.initialNonExecutedTrades ?? []
    );
    queryClient.setQueryData(
      ['nonExecutedTotalTradesCount', mode, acc.id, uid, year, strategyId],
      props?.initialNonExecutedTotalTradesCount ?? 0
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount with server initial data

  const currencySymbol = getCurrencySymbolFromAccount(
    (selection.activeAccount ?? props?.initialActiveAccount) as
      | { currency?: string | null }
      | undefined
  );

  const getCurrencySymbol = () => {
    const account = selection.activeAccount ?? props?.initialActiveAccount;
    if (!account?.currency) return '$';
    return (
      CURRENCY_SYMBOLS[
        account.currency as keyof typeof CURRENCY_SYMBOLS
      ] || account.currency
    );
  };

  const canNavigateMonth = (direction: 'prev' | 'next') => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();

    if (viewMode === 'dateRange') {
      // In date range mode: only allow navigation within the selected date range
      if (direction === 'prev') {
        // Can go back if current month/year is after start month/year
        if (currentYear > startYear) return true;
        if (currentYear === startYear && currentMonth > startMonth) return true;
        return false;
      } else {
        // Can go forward if current month/year is before end month/year
        if (currentYear < endYear) return true;
        if (currentYear === endYear && currentMonth < endMonth) return true;
        return false;
      }
    } else {
      // In yearly mode: allow navigation within the selected year, but only to months with trades
      if (currentYear !== selectedYear) return false;

      // Get months that have trades in the selected year
      const tradesToCheck = allTrades;
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
  };

  const handleMonthNavigation = (direction: 'prev' | 'next') => {
    if (!canNavigateMonth(direction)) return;

    const newDate = new Date(currentDate);
    let month = newDate.getMonth();
    const year = newDate.getFullYear();

    if (viewMode === 'yearly') {
      // In yearly mode: navigate to the next/previous month that has trades
      const tradesToCheck = allTrades;
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
      // In date range mode: navigate normally
      if (direction === 'prev') {
        month -= 1;
      } else {
        month += 1;
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
  };
  
  // update calendar when main date range changes
  useEffect(() => {
    const endDateObj = new Date(dateRange.endDate);
    
    if (viewMode === 'dateRange') {
      // In date range mode: use the end date
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

  const handleFilter = (type: FilterType) => {
    const today = new Date();
    setActiveFilter(type);

    const { dateRange: nextRange, calendarRange, currentDate } =
      buildPresetRange(type, today);

    setDateRange(nextRange);
    setCurrentDate(currentDate);
    setCalendarDateRange(calendarRange);
  };

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
  });

  // session check
  useEffect(() => {
    if (!userLoading && !userData?.session) {
      router.replace('/login');
    }
  }, [userLoading, userData, router]);

  // update calendar for yearly mode after allTrades is available
  useEffect(() => {
    if (viewMode === 'yearly' && allTrades.length >= 0) {
      // In yearly mode: set to the first month with trades, or January if no trades
      const monthsWithTrades = new Set<number>();
      allTrades.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        if (tradeDate.getFullYear() === selectedYear) {
          monthsWithTrades.add(tradeDate.getMonth());
        }
      });

      let targetMonth = 0; // Default to January
      if (monthsWithTrades.size > 0) {
        // Find the first month with trades
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
  }, [viewMode, selectedYear, allTrades]);

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
    const wins = lichidatReentryTrades.filter(
      (t) => t.trade_outcome === 'Win',
    ).length;
    const losses = lichidatReentryTrades.filter(
      (t) => t.trade_outcome === 'Lose',
    ).length;
    const totalTrades = lichidatReentryTrades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return [
      {
        category: `Local High/Low + BE`,
        wins,
        losses,
        winRate,
        totalTrades,
        // no BE split here, so we leave beWins/beLosses undefined
      }
    ];
  }

  // Helper for trades with both Break Even and Partials Taken
  function getPartialsBEChartData(filteredTrades: any[]): TradeStatDatum[] {
    // Trades that are both Break Even and have Partials Taken
    const partialsBETrades = filteredTrades.filter(
      (t) => t.break_even && t.partials_taken
    );

    const totalPartialsBE = partialsBETrades.length;

    const wins = partialsBETrades.filter((t) => t.trade_outcome === 'Win').length;
    const losses = partialsBETrades.filter((t) => t.trade_outcome === 'Lose').length;

    const winRate = totalPartialsBE > 0 ? (wins / totalPartialsBE) * 100 : 0;

    return [
      {
        category: `Partials + BE`,
        wins,
        losses,
        winRate,
        totalTrades: totalPartialsBE,
        // no BE breakdown here, so we leave beWins/beLosses undefined
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

  

  const profitColor =
    stats.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const avgProfitColor =
    stats.averageProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const pnlColor =
    stats.averagePnLPercentage > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : stats.averagePnLPercentage < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-900 dark:text-slate-100';
  const streakColor =
    stats.currentStreak > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : stats.currentStreak < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-900 dark:text-slate-100';

  // Compute monthly stats from trades array (for AccountOverviewCard - profit only)
  const computeMonthlyStatsFromTrades = useMemo(() => {
    return (trades: Trade[]): { [key: string]: { profit: number } } => {
      const monthlyData: { [key: string]: { profit: number } } = {};
      
      trades.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        const monthName = MONTHS[tradeDate.getMonth()];
        const profit = trade.calculated_profit || 0;
        
        if (!monthlyData[monthName]) {
          monthlyData[monthName] = { profit: 0 };
        }
        
        monthlyData[monthName].profit += profit;
      });
      
      return monthlyData;
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
  const monthlyStatsToUse = useMemo(() => {
    if (viewMode === 'yearly') {
      // Use allTrades for yearly mode
      return computeMonthlyStatsFromTrades(allTrades);
    } else {
      // Use filteredTrades for date range mode
      return computeMonthlyStatsFromTrades(filteredTrades);
    }
  }, [viewMode, allTrades, filteredTrades, computeMonthlyStatsFromTrades]);

  // Determine which full monthly stats to use based on view mode (for MonthlyPerformanceChart - wins, losses, winRate, etc.)
  const monthlyPerformanceStatsToUse = useMemo(() => {
    if (viewMode === 'yearly') {
      // Use monthlyStatsAllTrades from hook for yearly mode
      return monthlyStatsAllTrades;
    } else {
      // Compute from filteredTrades for date range mode
      return computeFullMonthlyStatsFromTrades(filteredTrades);
    }
  }, [viewMode, monthlyStatsAllTrades, filteredTrades, computeFullMonthlyStatsFromTrades]);

  const totalYearProfit = useMemo(
    () =>
      Object.values(monthlyStatsToUse).reduce(
        (sum, s) => sum + (s.profit || 0),
        0
      ),
    [monthlyStatsToUse]
  );

  const updatedBalance =
    ((resolvedAccount as { account_balance?: number } | null)?.account_balance ?? 0) + totalYearProfit;

  const getDaysInMonth = useMemo(
    () => getDaysInMonthForDate(currentDate),
    [currentDate]
  );

  // Get trades for the current calendar month based on view mode
  const calendarMonthTradesToUse = useMemo(() => {
    const tradesSource = viewMode === 'yearly' ? allTrades : filteredTrades;
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return tradesSource.filter((trade) => {
      const tradeDate = new Date(trade.trade_date);
      return tradeDate >= monthStart && tradeDate <= monthEnd;
    });
  }, [viewMode, allTrades, filteredTrades, currentDate]);

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

  // Determine which trades to use based on view mode
  const tradesToUse = viewMode === 'yearly' ? allTrades : filteredTrades;

  // Get markets from the trades being used
  const markets = Array.from(new Set(tradesToUse.map((t) => t.market)));

  return (
    <> 
      {/* View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 my-10">
        <div className="mt-10">
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
                className="w-28 h-10 rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-900/80 shadow-sm hover:bg-slate-50/80 dark:hover:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-medium focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-200"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-lg">
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((year) => (
                  <SelectItem
                    key={year}
                    value={String(year)}
                    className="rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-slate-900 dark:focus:text-slate-100"
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
        isYearDataLoading={viewMode === 'yearly' ? allTradesLoading : filteredTradesLoading}
      />

      {/* Month Stats Cards - Only show in yearly mode */}
      {viewMode === 'yearly' && (
        <div className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-stretch">
          {monthlyStats.bestMonth && (
            <MonthPerformanceCard
              title="Best Month"
              month={monthlyStats.bestMonth.month}
              year={allTrades.length > 0 ? selectedYear : new Date().getFullYear()}
              winRate={monthlyStats.bestMonth.stats.winRate}
              profit={monthlyStats.bestMonth.stats.profit}
              currencySymbol={getCurrencySymbol()}
              profitPercent={
                resolvedAccount
                  ? ((resolvedAccount as { account_balance?: number }).account_balance ?? 1) > 0
                    ? (monthlyStats.bestMonth.stats.profit / ((resolvedAccount as { account_balance?: number }).account_balance ?? 1)) * 100
                    : undefined
                  : undefined
              }
              positive
              className="w-full"
            />
          )}

          {monthlyStats.worstMonth && (
            <MonthPerformanceCard
              title="Worst Month"
              month={monthlyStats.worstMonth.month}
              year={allTrades.length > 0 ? selectedYear : new Date().getFullYear()}
              winRate={monthlyStats.worstMonth.stats.winRate}
              profit={monthlyStats.worstMonth.stats.profit}
              currencySymbol={getCurrencySymbol()}
              profitPercent={
                resolvedAccount
                  ? ((resolvedAccount as { account_balance?: number }).account_balance ?? 1) > 0
                    ? (monthlyStats.worstMonth.stats.profit / ((resolvedAccount as { account_balance?: number }).account_balance ?? 1)) * 100
                    : undefined
                  : undefined
              }
              positive={false}
              className="w-full"
            />
          )}
        </div>
      )}

      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-8 mb-2">Key Metrics</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Profit factor, consistency, Sharpe ratio, and other yearly performance indicators.</p>

      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 pb-8 w-full">
        {/* Profit Factor */}
        <StatCard
          title="Profit Factor"
          tooltipContent={
            <div className="space-y-2 text-slate-700">
              <div className="font-semibold text-slate-900">
                Profit Factor Interpretation
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.profitFactor < 1
                    ? "bg-red-50 border border-red-100"
                    : ""
                )}
              >
                <span className="font-medium">🔹 &lt; 1.0</span> — Negative Efficiency
                <br />
                Losses outweigh gains.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.profitFactor >= 1 && macroStats.profitFactor < 1.5
                    ? "bg-orange-50 border border-orange-100"
                    : ""
                )}
              >
                <span className="font-medium">🟠 1.0 – 1.49</span> — Marginal Efficiency
                <br />
                Profitable but limited.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.profitFactor >= 1.5 && macroStats.profitFactor < 2
                    ? "bg-amber-50 border border-amber-100"
                    : ""
                )}
              >
                <span className="font-medium">🟢 1.5 – 1.99</span> — Solid Efficiency
                <br />
                Consistent and sustainable edge.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.profitFactor >= 2 && macroStats.profitFactor < 3
                    ? "bg-emerald-50 border border-emerald-100"
                    : ""
                )}
              >
                <span className="font-medium">🔷 2.0 – 2.99</span> — High Efficiency
                <br />
                Strong reward relative to risk.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.profitFactor >= 3
                    ? "bg-blue-50 border border-blue-100"
                    : ""
                )}
              >
                <span className="font-medium">💎 3.0+</span> — Exceptional Efficiency
                <br />
                Very high edge — confirm durability.
              </div>
            </div>
          }
          value={
            <p
              className={cn(
                'text-2xl font-bold',
                macroStats.profitFactor > 1.5
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : macroStats.profitFactor < 1.49
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-slate-100'
              )}
            >
              {macroStats.profitFactor.toFixed(2)}
            </p>
          }
        />

        {/* Consistency Score */}
        <StatCard
          title="Consistency Score"
          tooltipContent={
            <div className="space-y-2 text-slate-800">
              <div className="font-semibold text-slate-800">
                Consistency Score Interpretation
              </div>
              <div
                className={cn(
                  'rounded-lg p-1.5 sm:p-2',
                  macroStats.consistencyScore < 40
                    ? 'bg-red-50 border border-red-100'
                    : ''
                )}
              >
                <span className="font-medium">🔹 0% – 39%</span> — Low
                <br />
                Results are highly variable.
              </div>
              <div
                className={cn(
                  'rounded-lg p-1.5 sm:p-2',
                  macroStats.consistencyScore >= 40 &&
                    macroStats.consistencyScore < 60
                    ? 'bg-orange-50 border border-orange-100'
                    : ''
                )}
              >
                <span className="font-medium">🟠 40% – 59%</span> — Developing
                <br />
                Some patterns, but still unreliable.
              </div>
              <div
                className={cn(
                  'rounded-lg p-1.5 sm:p-2',
                  macroStats.consistencyScore >= 60 &&
                    macroStats.consistencyScore < 75
                    ? 'bg-yellow-50 border border-yellow-200'
                    : ''
                )}
              >
                <span className="font-medium">🟡 60% – 74%</span> — Moderate
                <br />
                Improving, with room to refine.
              </div>
              <div
                className={cn(
                  'rounded-lg p-1.5 sm:p-2',
                  macroStats.consistencyScore >= 75 &&
                    macroStats.consistencyScore < 90
                    ? 'bg-emerald-50 border border-emerald-100'
                    : ''
                )}
              >
                <span className="font-medium">🟢 75% – 89%</span> — Strong
                <br />
                Reliable performance across trades.
              </div>
              <div
                className={cn(
                  'rounded-lg p-1.5 sm:p-2',
                  macroStats.consistencyScore >= 90
                    ? 'bg-blue-50 border border-blue-100'
                    : ''
                )}
              >
                <span className="font-medium">💎 90% – 100%</span> — Exceptional
                <br />
                Top-tier, highly repeatable results.
              </div>
            </div>
          }
          value={
            <p
              className={cn(
                'text-2xl font-bold',
                macroStats.consistencyScore > 60
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : macroStats.consistencyScore < 59
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-slate-100'
              )}
            >
              {macroStats.consistencyScore.toFixed(2)}{' '}
              <span className="text-slate-500 text-sm">
                ({macroStats.consistencyScoreWithBE.toFixed(2)} w/ BE)
              </span>
            </p>
          }
        />

        {/* Average Monthly Trades */}
        <StatCard
          title="Average Monthly Trades"
          tooltipContent={
            <div className="space-y-2 text-slate-500">
              <div className="font-semibold text-slate-800">
                Monthly Trading Volume
              </div>
              <p>
                Average number of trades (including break-even trades) executed per
                month in the selected year. This helps track your total trading
                frequency and consistency.
              </p>
            </div>
          }
          value={
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {monthlyStats.monthlyData
                ? (() => {
                    const totalTrades = Object.values(monthlyStats.monthlyData).reduce(
                      (sum, month) =>
                        sum +
                        month.wins +
                        month.losses +
                        month.beWins +
                        month.beLosses,
                      0
                    );
                    const monthsCount = Object.keys(monthlyStats.monthlyData).length;
                    const avg =
                      monthsCount > 0 ? totalTrades / monthsCount : 0;
                    const value = isNaN(avg) || !isFinite(avg) ? 0 : avg;
                    return value.toFixed(0);
                  })()
                : '0'}{' '}
              <span className="text-slate-500 text-sm">(incl. BE)</span>
            </p>
          }
        />

        {/* Average Monthly Profit */}
        <StatCard
          title="Average Monthly Profit"
          tooltipContent={
            <div className="space-y-2 text-slate-500">
              <div className="font-semibold text-slate-800">
                Monthly Profit Analysis
              </div>
              <p>
                Average profit per month across all trading months in the selected
                year. This metric helps track consistency of monthly returns.
              </p>
            </div>
          }
          value={
            <p className={cn('text-2xl font-bold', !hydrated ? 'text-slate-900 dark:text-slate-100' : monthlyStats.monthlyData && Object.keys(monthlyStats.monthlyData).length > 0 ? (Object.values(monthlyStats.monthlyData).reduce((sum, month) => sum + month.profit, 0) / Object.keys(monthlyStats.monthlyData).length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : 'text-slate-900 dark:text-slate-100')}>
              {!hydrated
                ? '\u2014'
                : monthlyStats.monthlyData && Object.keys(monthlyStats.monthlyData).length > 0
                  ? <>
                      <span className="mr-1">{currencySymbol}</span>
                      {(Object.values(monthlyStats.monthlyData).reduce((sum, month) => sum + month.profit, 0) / Object.keys(monthlyStats.monthlyData).length).toFixed(2)}
                    </>
                  : <>
                      <span className="mr-1">{currencySymbol}</span>0
                    </>
              }
            </p>
          }
        />

        {/* Sharpe Ratio */}
        <StatCard
          title="Sharpe Ratio"
          tooltipContent={
            <div className="space-y-2 text-slate-700">
              <div className="font-semibold text-slate-900">
                Sharpe Ratio Interpretation
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.sharpeWithBE < 0.2
                    ? "bg-orange-50 border border-orange-100"
                    : ""
                )}
              >
                <span className="font-medium">🔹 &lt; 0.20</span> — High Variability
                <br />
                Large swings relative to returns.
              </div>
              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.sharpeWithBE >= 0.2 && macroStats.sharpeWithBE < 0.5
                    ? "bg-orange-100 border border-orange-200"
                    : ""
                )}
              >
                <span className="font-medium">🟠 0.20 – 0.49</span> — Developing Stability
                <br />
                Profitable but uneven.
              </div>
              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.sharpeWithBE >= 0.5 && macroStats.sharpeWithBE < 1
                    ? "bg-amber-50 border border-amber-100"
                    : ""
                )}
              >
                <span className="font-medium">🟡 0.50 – 0.99</span> — Balanced Performance
                <br />
                Returns generally outweigh risk.
              </div>
              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.sharpeWithBE >= 1 && macroStats.sharpeWithBE < 2
                    ? "bg-emerald-50 border border-emerald-100"
                    : ""
                )}
              >
                <span className="font-medium">🟢 1.0 – 1.99</span> — Strong Efficiency
                <br />
                Consistent returns with controlled risk.
              </div>
              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.sharpeWithBE >= 2
                    ? "bg-blue-50 border border-blue-100"
                    : ""
                )}
              >
                <span className="font-medium">💎 2.0+</span> — Exceptional Efficiency
                <br />
                Rare stability and optimized execution.
              </div>
            </div>
          }
          value={
            <p
              className={cn(
                'text-2xl font-bold',
                macroStats.sharpeWithBE > 0.5
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : macroStats.sharpeWithBE < 0.49
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-slate-100'
              )}
            >
              {macroStats.sharpeWithBE.toFixed(2)}{' '}
              <span className="text-slate-500 text-sm">(incl. BE)</span>
            </p>
          }
        />

        {/* Non-Executed Trades */}
        <StatCard
          title="Non-Executed Trades"
          tooltipContent={
            <div className="space-y-2 text-slate-500">
              <div className="font-semibold text-slate-900">
                Non-Executed Trades
              </div>
              <p>
                Total number of trades that were planned but not executed, including
                break-even (BE) trades, in the selected year. This helps track missed
                or skipped opportunities.
              </p>
            </div>
          }
          value={
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {typeof props?.initialNonExecutedTotalTradesCount === 'number'
                ? props.initialNonExecutedTotalTradesCount
                : typeof nonExecutedTotalTradesCount === 'number'
                  ? nonExecutedTotalTradesCount
                  : 0}
              <span className="text-slate-500 text-sm ml-1">(incl. BE)</span>
            </p>
          }
        />

        {/* Partial Trades */}
        <StatCard
          title="Partial Trades"
          tooltipContent={
            <div className="space-y-2 text-slate-500">
              <div className="font-semibold text-slate-900">
                Partial Trades
              </div>
              <p>
                Total number of trades in the selected year where a partial exit was
                taken, including break-even (BE) partials.
              </p>
            </div>
          }
          value={
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {typeof yearlyPartialTradesCount === 'number'
                ? yearlyPartialTradesCount
                : 0}
              <span className="text-slate-500 text-sm ml-1">
                ({typeof yearlyPartialsBECount === 'number'
                  ? yearlyPartialsBECount
                  : 0}{' '}
                w/ BE)
              </span>
            </p>
          }
        />
        
        {/* TQI (Trade Quality Index) */}
        <StatCard
          title="TQI"
          tooltipContent={
            <div className="space-y-2 text-slate-700">
              <div className="font-semibold text-slate-900">
                TQI (Trade Quality Index) Interpretation
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.tradeQualityIndex < 0.20 ? "bg-orange-50 border border-orange-100" : ""
                )}
              >
                <span className="font-medium">🔸 &lt; 0.20</span> — Needs Development
                <br />
                Limited consistency so far. Strategy may need work or more data.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.tradeQualityIndex >= 0.20 && macroStats.tradeQualityIndex < 0.30
                    ? "bg-orange-100 border border-orange-200"
                    : ""
                )}
              >
                <span className="font-medium">🟠 0.20 – 0.29</span> — Early Stage Consistency
                <br />
                Some positive signs, but outcomes are still variable. Keep refining.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.tradeQualityIndex >= 0.30 && macroStats.tradeQualityIndex < 0.40
                    ? "bg-amber-50 border border-amber-100"
                    : ""
                )}
              >
                <span className="font-medium">🟡 0.30 – 0.39</span> — Moderate Stability
                <br />
                Shows repeatable elements and more robustness. Keep improving.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.tradeQualityIndex >= 0.40 && macroStats.tradeQualityIndex < 0.55
                    ? "bg-emerald-50 border border-emerald-100"
                    : ""
                )}
              >
                <span className="font-medium">🟢 0.40 – 0.55</span> — Strong Quality
                <br />
                Good consistency and solid results across conditions.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.tradeQualityIndex >= 0.55
                    ? "bg-blue-50 border border-blue-100"
                    : ""
                )}
              >
                <span className="font-medium">💎 0.55+</span> — Exceptional Quality
                <br />
                Very strong and reliable performance. The strategy is well-refined.
              </div>
            </div>
          }

          value={
            <p
              className={cn(
                'text-2xl font-bold',
                typeof macroStats.tradeQualityIndex === 'number'
                  ? macroStats.tradeQualityIndex > 0.30
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : macroStats.tradeQualityIndex < 0.29
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-900 dark:text-slate-100'
              )}
            >
              {typeof macroStats.tradeQualityIndex === 'number'
                ? macroStats.tradeQualityIndex.toFixed(2)
                : '—'}
            </p>
          }
        />

        <StatCard
          title="RR Multiple"
          value={
            <p
              className={cn(
                'text-2xl font-bold text-slate-900 dark:text-slate-100'
              )}
            >
              {typeof macroStats.multipleR === 'number'
                ? macroStats.multipleR.toFixed(2)
                : '—'}
            </p>
          }
        />
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

      {/* Monthly Performance Chart - Show in both modes */}
      <div className="w-full mb-8">
        <MonthlyPerformanceChart
          monthlyStatsAllTrades={monthlyPerformanceStatsToUse}
          months={MONTHS}
          chartOptions={chartOptions}
        />
      </div>


      {/* Date Range Stats Section - Only show when in dateRange mode */}
      {viewMode === 'dateRange' && (
        <>
          <h2 className="text-2xl font-medium text-slate-800 mt-20">Date Range Stats</h2>
          <p className="text-slate-500 mb-10">Trading performance metrics for your selected date range.</p>
        </>
      )}

      {/* Stats and Best/Worst Month Cards Row */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Trades */}
        <StatCard
          title="Total Trades"
          value={
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.totalTrades}
            </p>
          }
        />

        {/* Win Rate */}
        <StatCard
          title="Win Rate"
          value={
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.winRate.toFixed(2)}%
              <span className="text-slate-500 text-sm ml-1">
                ({stats.winRateWithBE.toFixed(2)}% w/ BE)
              </span>
            </p>
          }
        />

        {/* Total Profit - defer until hydrated to avoid $ vs € mismatch when no accounts (new user) */}
        <StatCard
          title="Total Profit"
          value={
            <p className={hydrated ? `text-2xl font-bold ${profitColor}` : 'text-2xl font-bold text-slate-900 dark:text-slate-100'}>
              {hydrated ? `${currencySymbol}${stats.totalProfit.toFixed(2)}` : '\u2014'}
            </p>
          }
        />

        {/* Average Profit - defer until hydrated to avoid $ vs € mismatch when no accounts (new user) */}
        <StatCard
          title="Average Profit"
          value={
            <p className={hydrated ? `text-2xl font-bold ${avgProfitColor}` : 'text-2xl font-bold text-slate-900 dark:text-slate-100'}>
              {hydrated ? `${currencySymbol}${stats.averageProfit.toFixed(2)}` : '\u2014'}
            </p>
          }
        />

        {/* Total Wins */}
        <StatCard
          title="Total Wins"
          value={
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.totalWins}
              {stats.beWins > 0 && (
                <span className="text-sm font-medium text-slate-500 ml-1">
                  ({stats.beWins} BE)
                </span>
              )}
            </p>
          }
        />

        {/* Total Losses */}
        <StatCard
          title="Total Losses"
          value={
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {stats.totalLosses}
              {stats.beLosses > 0 && (
                <span className="text-sm font-medium text-slate-500 ml-1">
                  ({stats.beLosses} BE)
                </span>
              )}
            </p>
          }
        />

        {/* Max Drawdown */}
        <StatCard
          title="Max Drawdown"
          tooltipContent={
            <div className="space-y-1 text-slate-800 text-xs sm:text-sm">
              <div className="font-semibold text-slate-800">
                Drawdown Interpretation
              </div>

              <div
                className={`rounded-lg p-1.5 sm:p-2 ${
                  stats.maxDrawdown <= 2
                    ? 'bg-blue-50 border border-blue-100'
                    : ''
                }`}
              >
                <span className="font-medium">🔹 0% – 2%</span> — Excellent. Very low
                risk. Usually seen in algo/automated or conservative systems.
              </div>
              <div
                className={`rounded-lg p-1.5 sm:p-2 ${
                  stats.maxDrawdown > 2 && stats.maxDrawdown <= 5
                    ? 'bg-emerald-50 border border-emerald-100'
                    : ''
                }`}
              >
                <span className="font-medium">✅ 2% – 5%</span> — Healthy/Moderate.
                Most professional strategies fall in this zone.
              </div>
              <div
                className={`rounded-lg p-1.5 sm:p-2 ${
                  stats.maxDrawdown > 5 && stats.maxDrawdown <= 10
                    ? 'bg-amber-50 border border-amber-100'
                    : ''
                }`}
              >
                <span className="font-medium">⚠️ 5% – 10%</span> — Aggressive but
                acceptable. Common for swing traders and trend followers.
              </div>
              <div
                className={`rounded-lg p-1.5 sm:p-2 ${
                  stats.maxDrawdown > 10 && stats.maxDrawdown <= 20
                    ? 'bg-orange-50 border border-orange-100'
                    : ''
                }`}
              >
                <span className="font-medium">❗ 10% – 20%</span> — High risk.
                Suitable only for high-volatility strategies.
              </div>
              <div
                className={`rounded-lg p-1.5 sm:p-2 ${
                  stats.maxDrawdown > 20
                    ? 'bg-red-50 border border-red-100'
                    : ''
                }`}
              >
                <span className="font-medium">🚫 20%+</span> — Danger zone. Signals
                poor risk control or heavy leverage.
              </div>
            </div>
          }
          value={
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.maxDrawdown.toFixed(2)}%
            </p>
          }
        />

        {/* P&L % */}
        <StatCard
          title="P&L %"
          tooltipContent={
            <p className="text-xs sm:text-sm text-slate-500">
              Average P&amp;L % over starting balance.
            </p>
          }
          value={
            <p className={`text-2xl font-bold ${pnlColor}`}>
              {stats.averagePnLPercentage.toFixed(2)}%
            </p>
          }
        />

        {/* Current Streak */}
        <StatCard
          title="Current Streak"
          tooltipContent={
            <p className="text-xs sm:text-sm text-slate-500">
              Current winning (positive) or losing (negative) streak.
            </p>
          }
          value={
            <p className={`text-2xl font-bold ${streakColor}`}>
              {stats.currentStreak > 0 ? '+' : ''}
              {stats.currentStreak}
            </p>
          }
        />

        {/* Best Streaks */}
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
                  +{stats.maxWinningStreak}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Losing</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  -{stats.maxLosingStreak}
                </p>
              </div>
            </div>
          }
        />

        {/* Average Days Between Trades */}
        <StatCard
          title="Average Days Between Trades"
          tooltipContent={
            <p className="text-xs sm:text-sm text-slate-800">
              Average number of days between your trades in the selected period.
            </p>
          }
          value={
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.averageDaysBetweenTrades} <small className="text-sm text-slate-500">days</small>
            </p>
          }
        />

        {/* Partial Trades */}
        <StatCard
          title={
            <>
              Partial Trades{' '}
              <span className="text-slate-500 font-medium text-xs ml-1">
                {stats.partialWinRate.toFixed(1)}% (
                {stats.partialWinRateWithBE.toFixed(1)}% w/ BE)
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
                  {stats.partialWinningTrades}{' '}
                  <span className="text-slate-500 text-sm">
                    ({stats.beWinPartialTrades} BE)
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Losing</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {stats.partialLosingTrades}{' '}
                  <span className="text-slate-500 text-sm">
                    ({stats.beLosingPartialTrades} BE)
                  </span>
                </p>
              </div>
            </div>
          }
        />

        {/* TQI (Trade Quality Index) */}
        <StatCard
          title="TQI"
          tooltipContent={
            <div className="space-y-2 text-slate-700">
              <div className="font-semibold text-slate-900">
                TQI (Trade Quality Index) Interpretation
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.tradeQualityIndex < 0.20 ? "bg-orange-50 border border-orange-100" : ""
                )}
              >
                <span className="font-medium">🔸 &lt; 0.20</span> — Needs Development
                <br />
                Limited consistency so far. Strategy may need work or more data.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.tradeQualityIndex >= 0.20 && macroStats.tradeQualityIndex < 0.30
                    ? "bg-orange-100 border border-orange-200"
                    : ""
                )}
              >
                <span className="font-medium">🟠 0.20 – 0.29</span> — Early Stage Consistency
                <br />
                Some positive signs, but outcomes are still variable. Keep refining.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.tradeQualityIndex >= 0.30 && macroStats.tradeQualityIndex < 0.40
                    ? "bg-amber-50 border border-amber-100"
                    : ""
                )}
              >
                <span className="font-medium">🟡 0.30 – 0.39</span> — Moderate Stability
                <br />
                Shows repeatable elements and more robustness. Keep improving.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.tradeQualityIndex >= 0.40 && macroStats.tradeQualityIndex < 0.55
                    ? "bg-emerald-50 border border-emerald-100"
                    : ""
                )}
              >
                <span className="font-medium">🟢 0.40 – 0.55</span> — Strong Quality
                <br />
                Good consistency and solid results across conditions.
              </div>

              <div
                className={cn(
                  "rounded-lg p-1.5 sm:p-2",
                  macroStats.tradeQualityIndex >= 0.55
                    ? "bg-blue-50 border border-blue-100"
                    : ""
                )}
              >
                <span className="font-medium">💎 0.55+</span> — Exceptional Quality
                <br />
                Very strong and reliable performance. The strategy is well-refined.
              </div>
            </div>
          }

          value={
            <p
              className={cn(
                'text-2xl font-bold',
                typeof stats.tradeQualityIndex === 'number'
                  ? stats.tradeQualityIndex > 0.30
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : stats.tradeQualityIndex < 0.29
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-900 dark:text-slate-100'
              )}
            >
              {typeof stats.tradeQualityIndex === 'number'
                ? stats.tradeQualityIndex.toFixed(2)
                : '—'}
            </p>
          }
        />

        <StatCard
          title="RR Multiple"
          value={
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {typeof stats.multipleR === 'number'
                ? stats.multipleR.toFixed(2)
                : '—'}
            </p>
          }
        />
      </div>

      


      {/* Risk Per Trade Card */}
      <RiskPerTrade className="mb-8" allTradesRiskStats={viewMode === 'yearly' ? allTradesRiskStats : riskStats as any} />

      {/* Calendar View - Show in both modes */}
      <TradesCalendarCard
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

      <div className="my-8">
        {/* Market Profit Statistics Card */}
        <MarketProfitStatisticsCard
          trades={tradesToUse}
          marketStats={viewMode === 'yearly' ? marketAllTradesStats : marketStats}
          chartOptions={chartOptions}
          getCurrencySymbol={getCurrencySymbol}
        />
      </div>
      

      <div className="my-8">
        {/* Setup Statistics Card */}
        <TradeStatsBarCard
          title="Setup Statistics"
          description="Distribution of trades based on trading setup"
          data={setupChartData}
          mode="winsLossesWinRate"
        />
      </div>
      

      {/* Statistics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
        {/* Liquidity Statistics Card */}
        <TradeStatsBarCard
          title="Liquidity Statistics"
          description="Distribution of trades based on market liquidity conditions"
          data={liquidityChartData}
        />

        {/* Direction Statistics Card */}
        <TradeStatsBarCard
          title="Long/Short Statistics"
          description="Distribution of trades based on direction"
          data={directionChartData}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        {/* Local H/L Analysis Card */}
        <TradeStatsBarCard
          title="Local H/L Analysis"
          description="Distribution of trades based on local high/low status"
          data={localHLChartData}
        />

        {/* Risk/Reward Statistics */}
        <RiskRewardStats trades={tradesToUse} />

        
      </div>

      {/* SL Size and Trade Types Statistics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SL Size Statistics Card */}
        <TradeStatsBarCard
          title="SL Size Statistics"
          description="Distribution of trades based on SL size"
          data={slSizeChartData}
          mode="singleValue"
          valueKey="value"
        />

        {/* Trade Types Statistics Card */}
        <TradeStatsBarCard
          title="Trade Types Statistics"
          description="Distribution of trades based on trade type"
          data={tradeTypesChartData}
        />
      </div>

      <div className="my-8">
        <TradeStatsBarCard
          title="Time Interval Analysis"
          description="Distribution of trades based on time interval"
          data={timeIntervalChartData}
          mode="winsLossesWinRate"
          heightClassName="h-72"
        />
      </div>

      {/* MSS and News Statistics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* MSS Statistics Card */}
        <TradeStatsBarCard
          title="MSS Statistics"
          description="Distribution of trades based on MSS"
          data={mssChartData}
          mode="winsLossesWinRate"
          heightClassName="h-72"
        />

        {/* News Statistics Card */}
        <TradeStatsBarCard
          title="News Statistics"
          description="Distribution of trades based on news"
          data={newsChartData}
          mode="winsLossesWinRate"
          heightClassName="h-72"
        />
      </div>

      {/* Day and Market Statistics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day Statistics Card */}
        <TradeStatsBarCard
          title="Day Statistics"
          description="Distribution of trades based on day of the week"
          data={dayChartData}
          mode="winsLossesWinRate"
          heightClassName="h-72"
        />

        {/* Market Statistics Card */}
        <TradeStatsBarCard
          title="Market Statistics"
          description="Distribution of trades based on market"
          data={marketChartData}
          mode="winsLossesWinRate"
          heightClassName="h-72"
        />
      </div>

      <div className="my-8">
        {/* Evaluation Statistics */}
        <EvaluationStats stats={evaluationStats} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Local H/L + BE Statistics */}
        <TradeStatsBarCard
          title="Local H/L + BE Statistics"
          description="Analysis of trades marked as both Local High/Low and Break Even"
          data={getLocalHLBreakEvenChartData(tradesToUse)}
          mode="winsLossesWinRate"
          heightClassName="h-80"
        />

        {/* 1.4RR Hit Statistics */}
        <RRHitStats trades={tradesToUse} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TradeStatsBarCard
          title="Average Displacement Size (Points)"
          description="Average displacement size (points) for each market."
          data={getAverageDisplacementPerMarket(tradesToUse)}
          mode="singleValue"
          valueKey="value"
        />
        
        {/* Displacement Size Profitability by Market and Size Points */}
        <DisplacementSizeStats trades={tradesToUse} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Partials + BE Statistics */}
        <TradeStatsBarCard
          title="Partials + BE Statistics"
          description="Analysis of trades marked as both Break Even and Partials Taken"
          data={getPartialsBEChartData(tradesToUse)}
          mode="winsLossesWinRate"
          heightClassName="h-80"
        />
         
         {/* Launch Hour Trades Statistics */}
        <LaunchHourTradesCard filteredTrades={tradesToUse} />
      </div>



      <h2 className="text-2xl font-semibold text-slate-800 mt-20">Non-executed Trades by date range</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        {/* Non Executed Trades Statistics */}
        <NonExecutedTradesCard nonExecutedTrades={nonExecutedTrades} />

        <TradeStatsBarCard
          title="Non-Executed Trades Liquidity Statistics"
          description="Distribution of non-executed trades based on trading liquidity"
          data={nonExecutedLiquidityChartData}
          mode="winsLossesWinRate"
          heightClassName="h-72"
        />
      </div>

      <div className="space-y-8">
        <TradeStatsBarCard
          title="Non-Executed Trades Setup Statistics"
          description="Distribution of non-executed trades based on trading setup"
          data={nonExecutedChartData}
          mode="winsLossesWinRate"
          heightClassName="h-72"
        />

        <TradeStatsBarCard
          title="Non-Executed Trades Market Statistics"
          description="Distribution of non-executed trades based on market"
          data={nonExecutedMarketChartData}
          mode="winsLossesWinRate"
          heightClassName="h-96"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
        <TradeStatsBarCard
          title="Average Displacement Size (Points)"
          description="Average displacement size (points) for each market."
          data={getAverageDisplacementPerMarket(nonExecutedTrades)}
          mode="singleValue"
          valueKey="value"
        />
        
        {/* Displacement Size Profitability by Market and Size Points */}
        <DisplacementSizeStats trades={nonExecutedTrades} />
      </div>
    </>
  );
}
