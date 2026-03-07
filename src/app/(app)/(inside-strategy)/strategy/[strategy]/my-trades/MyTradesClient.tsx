'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Trade } from '@/types/trade';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQuery } from '@tanstack/react-query';
import { TRADES_DATA } from '@/constants/queryConfig';
import { TradeFiltersBar, DateRangeValue } from '@/components/dashboard/analytics/TradeFiltersBar';
import { getFilteredTrades } from '@/lib/server/trades';
import type { Database } from '@/types/supabase';
import { TradeCardsView } from '@/components/trades/TradeCardsView';
import {
  buildPresetRange,
  isCustomDateRange,
  createAllTimeRange,
  DateRangeState,
  FilterType,
} from '@/utils/dateRangeHelpers';
import { queryKeys } from '@/lib/queryKeys';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

interface MyTradesClientProps {
  /** User id from server (fallback when useUserDetails cache not yet hydrated) */
  initialUserId: string;
  /** Only passed when there is no active account (empty array); otherwise data comes from prefetched cache */
  initialFilteredTrades?: Trade[];
  initialDateRange: DateRangeState;
  initialMode: 'live' | 'backtesting' | 'demo';
  initialActiveAccount: AccountRow | null;
  initialStrategyId: string;
}

export default function MyTradesClient({
  initialUserId,
  initialFilteredTrades,
  initialDateRange,
  initialMode,
  initialActiveAccount,
  initialStrategyId,
}: MyTradesClientProps) {
  const [dateRange, setDateRange] = useState<DateRangeState>(() => buildPresetRange('year').dateRange);
  const [activeFilter, setActiveFilter] = useState<FilterType>('year');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [executionFilter, setExecutionFilter] = useState<'all' | 'executed' | 'nonExecuted'>('all');

  const { data: userDetails } = useUserDetails();
  const { selection, setSelection } = useActionBarSelection();
  const userId = userDetails?.user?.id ?? initialUserId;
  // Stable today string — same format StrategiesClient uses when seeding filteredTrades cache
  const todayStr = useMemo(() => createAllTimeRange().endDate, []);

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

  // Single query: prefetched on server (one getFilteredTrades), so client uses hydrated cache when key matches.
  // Date range, market, and execution filtering all happen client-side on this dataset.
  const {
    data: allTrades,
    isLoading: tradesLoading,
    isFetching: tradesFetching,
  } = useQuery<Trade[]>({
    // Same key that StrategiesClient seeds — cache hit instead of re-fetch
    queryKey: queryKeys.trades.filtered(
      selection.mode ?? initialMode,
      activeAccount?.id,
      userId,
      'dateRange',
      '2000-01-01',
      todayStr,
      initialStrategyId
    ),
    queryFn: async () => {
      if (!userId || !activeAccount?.id) return [];
      const { startDate, endDate } = createAllTimeRange();
      return getFilteredTrades({
        userId,
        accountId: activeAccount.id,
        mode: (selection.mode ?? initialMode) as 'live' | 'backtesting' | 'demo',
        startDate,
        endDate,
        includeNonExecuted: true,
        strategyId: initialStrategyId,
      });
    },
    enabled: !!userId && !!activeAccount?.id,
    ...TRADES_DATA,
  });

  const baseList = allTrades ?? initialFilteredTrades ?? [];

  // Markets are derived from the full unfiltered dataset so the dropdown stays stable
  const markets = useMemo(
    () => Array.from(new Set(baseList.map((t) => t.market))),
    [baseList],
  );

  const isCustomRange = isCustomDateRange(dateRange);

  const handleFilter = useCallback((type: FilterType) => {
    setActiveFilter(type);
    const { dateRange: nextRange } = buildPresetRange(type);
    setDateRange(nextRange);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRangeValue) => {
    setDateRange(range);
  }, []);

  const handleExecutionChange = useCallback((execution: 'all' | 'executed' | 'nonExecuted') => {
    setExecutionFilter(execution);
  }, []);

  // Earliest trade date across the full dataset (shown as the "All Trades" display start)
  const earliestTradeDate = useMemo(() => {
    if (activeFilter !== 'all' || baseList.length === 0) return undefined;
    return baseList.reduce(
      (min, t) => (t.trade_date < min ? t.trade_date : min),
      baseList[0].trade_date,
    );
  }, [activeFilter, baseList]);

  // All filtering is client-side — no additional DB queries on filter changes
  const trades = useMemo(() => {
    let list = baseList;

    // Date range filter
    list = list.filter(
      (t) => t.trade_date >= dateRange.startDate && t.trade_date <= dateRange.endDate,
    );

    // Execution filter (executed can be boolean | null)
    if (executionFilter === 'executed') {
      list = list.filter((t) => t.executed === true);
    } else if (executionFilter === 'nonExecuted') {
      list = list.filter((t) => !t.executed);
    }

    // Market filter
    if (selectedMarket !== 'all') {
      list = list.filter((t) => t.market === selectedMarket);
    }

    return list;
  }, [baseList, dateRange, selectedMarket, executionFilter]);

  // TradeDetailsPanel.invalidateAndRefetchTradeQueries already handles scoped cache invalidation
  const handleTradeUpdated = useCallback(() => {}, []);

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
        onDateRangeChange={handleDateRangeChange}
        activeFilter={activeFilter}
        onFilterChange={handleFilter}
        isCustomRange={isCustomRange}
        selectedMarket={selectedMarket}
        onSelectedMarketChange={setSelectedMarket}
        markets={markets}
        selectedExecution={executionFilter}
        onSelectedExecutionChange={handleExecutionChange}
        showAllTradesOption={true}
        displayStartDate={earliestTradeDate}
      />

      <TradeCardsView
        trades={trades}
        isLoading={tradesLoading}
        isFetching={tradesFetching}
        resetKey={`${dateRange.startDate}-${dateRange.endDate}-${selectedMarket}-${executionFilter}`}
        onTradeUpdated={handleTradeUpdated}
      />
    </div>
  );
}
