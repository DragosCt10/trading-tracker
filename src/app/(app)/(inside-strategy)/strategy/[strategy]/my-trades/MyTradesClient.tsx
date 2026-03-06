'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear } from 'date-fns';
import { Trade } from '@/types/trade';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TradeFiltersBar, DateRangeValue } from '@/components/dashboard/analytics/TradeFiltersBar';
import { getFilteredTrades } from '@/lib/server/trades';
import type { Database } from '@/types/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { TradeCardsView } from '@/components/trades/TradeCardsView';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

type DateRangeState = {
  startDate: string;
  endDate: string;
};

type FilterType = 'year' | '15days' | '30days' | 'month' | 'all';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

function buildPresetRange(
  type: FilterType,
  today = new Date()
): {
  dateRange: DateRangeState;
  currentDate: Date;
} {
  let startDate: string;
  let endDate: string;

  if (type === 'all') {
    startDate = '2000-01-01';
    endDate = fmt(today);
  } else if (type === 'year') {
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
    { startDate: '2000-01-01', endDate: fmt(today) },
    { startDate: yearStart, endDate: yearEnd },
    { startDate: last15Start, endDate: fmt(today) },
    { startDate: last30Start, endDate: fmt(today) },
    { startDate: monthStart, endDate: monthEnd },
  ];

  return !presets.some(
    (p) => p.startDate === range.startDate && p.endDate === range.endDate
  );
}

interface MyTradesClientProps {
  /** User id from server (fallback when useUserDetails cache not yet hydrated) */
  initialUserId: string;
  initialFilteredTrades: Trade[];
  initialAllTrades: Trade[];
  initialDateRange: DateRangeState;
  initialMode: 'live' | 'backtesting' | 'demo';
  initialActiveAccount: AccountRow | null;
  initialStrategyId: string;
}

export default function MyTradesClient({
  initialUserId,
  initialFilteredTrades,
  initialAllTrades,
  initialDateRange,
  initialMode,
  initialActiveAccount,
  initialStrategyId,
}: MyTradesClientProps) {
  const today = new Date();

  const [dateRange, setDateRange] = useState<DateRangeState>(initialDateRange);
  const [selectedYear] = useState(new Date().getFullYear());
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [executionFilter, setExecutionFilter] = useState<'all' | 'executed' | 'non-executed'>('all');
  
  // Map executionFilter to TradeFiltersBar's selectedExecution format
  const selectedExecution = useMemo<'all' | 'executed' | 'nonExecuted'>(() => {
    if (executionFilter === 'non-executed') return 'nonExecuted';
    if (executionFilter === 'executed') return 'executed';
    return 'all';
  }, [executionFilter]);
  
  const handleExecutionChange = (execution: 'all' | 'executed' | 'nonExecuted') => {
    if (execution === 'all') {
      setExecutionFilter('all');
    } else if (execution === 'nonExecuted') {
      setExecutionFilter('non-executed');
    } else {
      setExecutionFilter('executed');
    }
  };
  const { data: userDetails } = useUserDetails();
  const { selection, setSelection } = useActionBarSelection();
  const queryClient = useQueryClient();
  const userId = userDetails?.user?.id ?? initialUserId;

  // Initialize selection from server props if not already set
  useEffect(() => {
    if (initialActiveAccount && !selection.activeAccount && initialMode) {
      setSelection({
        mode: initialMode,
        activeAccount: initialActiveAccount,
      });
    }
  }, [initialActiveAccount, initialMode, selection.activeAccount, setSelection]);

  // Resolve account: use selection when set, else initial from server (so query can run before action bar hydrates)
  const activeAccount = selection.activeAccount ?? initialActiveAccount;

  // Initial server data is only valid for the same mode + account + date range; otherwise we must refetch
  const isInitialContext =
    selection.mode === initialMode &&
    activeAccount?.id === initialActiveAccount?.id &&
    dateRange.startDate === initialDateRange.startDate &&
    dateRange.endDate === initialDateRange.endDate;

  // Check if trade data was recently invalidated (to skip stale initialData)
  const wasInvalidated = typeof window !== 'undefined' && sessionStorage.getItem('trade-data-invalidated');
  const shouldSkipInitialData = wasInvalidated && (Date.now() - parseInt(wasInvalidated, 10)) < 30000; // Skip initialData for 30 seconds after invalidation

  // Server query when date range, mode, or account change (queryKey includes all of them)
  const {
    data: rawFilteredTrades,
    isLoading: filteredTradesLoading,
    isFetching: filteredTradesFetching,
  } = useQuery<Trade[]>({
    queryKey: queryKeys.trades.filtered(
      selection.mode,
      activeAccount?.id,
      userId,
      'dateRange',
      dateRange.startDate,
      dateRange.endDate,
      initialStrategyId,
    ),
    queryFn: async () => {
      if (!userId || !activeAccount?.id) return [];
      return getFilteredTrades({
        userId,
        accountId: activeAccount.id,
        mode: selection.mode,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        includeNonExecuted: true,
        strategyId: initialStrategyId,
      });
    },
    initialData: isInitialContext && !shouldSkipInitialData ? initialFilteredTrades : undefined,
    placeholderData: undefined,
    enabled: !!userId && !!activeAccount?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Use initial data only when mode/account/date range still match initial; otherwise show skeleton until fetch completes
  const filteredTrades = rawFilteredTrades ?? (isInitialContext && !shouldSkipInitialData ? initialFilteredTrades : []);

  // Fetch all trades for markets list (server query; refetch when mode/account/year changes)
  const isInitialModeAndAccount =
    selection.mode === initialMode && activeAccount?.id === initialActiveAccount?.id;
  const {
    data: rawAllTrades,
  } = useQuery<Trade[]>({
    queryKey: queryKeys.trades.all(
      selection.mode,
      activeAccount?.id,
      userId,
      selectedYear,
      initialStrategyId,
    ),
    queryFn: async () => {
      if (!userId || !activeAccount?.id) return [];
      const currentYear = new Date().getFullYear();
      return getFilteredTrades({
        userId,
        accountId: activeAccount.id,
        mode: selection.mode,
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        includeNonExecuted: true,
        strategyId: initialStrategyId,
      });
    },
    initialData: isInitialModeAndAccount && !shouldSkipInitialData ? initialAllTrades : undefined,
    enabled: !!userId && !!activeAccount?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  
  // Clear invalidation flag after checking (if it was set)
  useEffect(() => {
    if (shouldSkipInitialData && typeof window !== 'undefined') {
      sessionStorage.removeItem('trade-data-invalidated');
    }
  }, [shouldSkipInitialData]);
  
  const allTrades = rawAllTrades ?? (isInitialModeAndAccount && !shouldSkipInitialData ? initialAllTrades : []);

  // Extract unique markets from all trades
  const markets = useMemo(() => {
    return Array.from(new Set(allTrades.map((t) => t.market)));
  }, [allTrades]);

  // Check if current date range is custom
  const isCustomRange = isCustomDateRange(dateRange);

  // Handle preset filter changes
  const handleFilter = (type: FilterType) => {
    const today = new Date();
    setActiveFilter(type);

    const { dateRange: nextRange } = buildPresetRange(type, today);
    setDateRange(nextRange);
  };

  const earliestTradeDate = useMemo(() => {
    if (activeFilter !== 'all' || !filteredTrades || filteredTrades.length === 0) return undefined;
    return filteredTrades.reduce((min, t) => t.trade_date < min ? t.trade_date : min, filteredTrades[0].trade_date);
  }, [activeFilter, filteredTrades]);

  // Filter by market and execution status (client-side: date-range data is already loaded)
  const trades = useMemo(() => {
    let list = filteredTrades || [];
    
    // Apply execution filter
    // Note: executed can be boolean | null, so non-executed includes false, null, and undefined
    if (executionFilter === 'executed') {
      list = list.filter((t) => t.executed === true);
    } else if (executionFilter === 'non-executed') {
      // Non-executed includes both false and null/undefined values
      list = list.filter((t) => !t.executed);
    }
    
    // Apply market filter
    if (selectedMarket === 'all') return list;
    return list.filter((t) => t.market === selectedMarket);
  }, [filteredTrades, selectedMarket, executionFilter]);

  return (
      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          My Trades
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Browse your trading history with visual cards
        </p>
      </div>

      {/* Trade Filters Bar */}
      <TradeFiltersBar
        dateRange={dateRange}
        onDateRangeChange={(range: DateRangeValue) => {
          setDateRange(range);
        }}
        activeFilter={activeFilter}
        onFilterChange={handleFilter}
        isCustomRange={isCustomRange}
        selectedMarket={selectedMarket}
        onSelectedMarketChange={setSelectedMarket}
        markets={markets}
        selectedExecution={selectedExecution}
        onSelectedExecutionChange={handleExecutionChange}
        showAllTradesOption={true}
        displayStartDate={earliestTradeDate}
      />

      <TradeCardsView
        trades={trades}
        isLoading={filteredTradesLoading}
        isFetching={filteredTradesFetching}
        resetKey={`${dateRange.startDate}-${dateRange.endDate}-${selectedMarket}-${executionFilter}`}
        onTradeUpdated={async () => {
          await queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'filteredTrades' ||
              query.queryKey[0] === 'allTrades' ||
              query.queryKey[0] === 'discoverTrades',
          });
        }}
      />
      </div>
  );
}
