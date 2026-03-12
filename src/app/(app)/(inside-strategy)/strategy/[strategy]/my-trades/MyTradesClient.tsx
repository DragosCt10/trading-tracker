'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Trade } from '@/types/trade';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TRADES_DATA } from '@/constants/queryConfig';
import { TradeFiltersBar, DateRangeValue } from '@/components/dashboard/analytics/TradeFiltersBar';
import { getFilteredTrades, deleteTrades } from '@/lib/server/trades';
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
import { exportTradesToCsv } from '@/utils/exportTradesToCsv';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import {
  getCurrencySymbolFromAccount,
  computeMonthlyStatsFromTrades,
  calculateTotalYearProfit,
} from '@/components/dashboard/analytics/AccountOverviewCard';
import { buildEquityPointsFromTrades } from '@/components/dashboard/analytics/EquityCurveCard';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { TotalTradesDonut } from '@/components/dashboard/analytics/TotalTradesChartCard';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { useDarkMode } from '@/hooks/useDarkMode';

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
  initialMode,
  initialActiveAccount,
  initialStrategyId,
}: MyTradesClientProps) {
  const [dateRange, setDateRange] = useState<DateRangeState>(() => buildPresetRange('year').dateRange);
  const [activeFilter, setActiveFilter] = useState<FilterType>('year');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [executionFilter, setExecutionFilter] = useState<'all' | 'executed' | 'nonExecuted'>('executed');
  const [showPartialTrades, setShowPartialTrades] = useState(false);
  const [sortField, setSortField] = useState<'trade_date' | 'market' | 'outcome' | 'partials_only'>('trade_date');
  const [sortConfig, setSortConfig] = useState<{ field: 'trade_date' | 'market' | 'outcome'; direction: 'asc' | 'desc' }>({
    field: 'trade_date',
    direction: 'asc',
  });
  const [exporting, setExporting] = useState(false);

  const queryClient = useQueryClient();
  const { data: userDetails } = useUserDetails();
  const { selection, setSelection } = useActionBarSelection();
  const userId = userDetails?.user?.id ?? initialUserId;
  const mode = selection.mode ?? initialMode;
  // Stable today string — same format StrategiesClient uses when seeding filteredTrades cache
  const todayStr = useMemo(() => createAllTimeRange().endDate, []);
  const { mounted } = useDarkMode();

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

  const getOutcomeValue = useCallback((trade: Trade) => {
    if (trade.break_even || trade.trade_outcome === 'BE') return 'BE';
    return trade.trade_outcome;
  }, []);

  // All filtering is client-side — no additional DB queries on filter changes
  const filteredTrades = useMemo(() => {
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

    // Partial trades filter
    if (showPartialTrades) {
      list = list.filter((t) => t.partials_taken);
    }

    // Market filter
    if (selectedMarket !== 'all') {
      list = list.filter((t) => t.market === selectedMarket);
    }

    return list;
  }, [baseList, dateRange, selectedMarket, executionFilter, showPartialTrades]);

  const trades = useMemo(() => {
    const list = [...filteredTrades];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortConfig.field === 'outcome') {
        const aValue = getOutcomeValue(a);
        const bValue = getOutcomeValue(b);
        cmp =
          sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
      } else if (sortConfig.field === 'trade_date') {
        const aVal = new Date(a.trade_date).getTime();
        const bVal = new Date(b.trade_date).getTime();
        cmp =
          sortConfig.direction === 'asc'
            ? bVal - aVal
            : aVal - bVal;
      } else {
        const aValue = (a as any)[sortConfig.field];
        const bValue = (b as any)[sortConfig.field];
        cmp =
          sortConfig.direction === 'asc'
            ? (aValue > bValue ? 1 : aValue < bValue ? -1 : 0)
            : (aValue < bValue ? 1 : aValue > bValue ? -1 : 0);
      }
      if (cmp !== 0) return cmp;
      return (a.id ?? '').localeCompare(b.id ?? '');
    });
    return list;
  }, [filteredTrades, sortConfig, getOutcomeValue]);

  const currencySymbol = useMemo(
    () => getCurrencySymbolFromAccount(activeAccount ?? undefined),
    [activeAccount]
  );

  // Reuse AccountOverviewCard helpers to compute net cumulative P&L from the current filtered trades
  const monthlyStatsForPeriod = useMemo(
    () => computeMonthlyStatsFromTrades(filteredTrades),
    [filteredTrades]
  );
  const netCumulativePnl = useMemo(
    () => calculateTotalYearProfit(monthlyStatsForPeriod),
    [monthlyStatsForPeriod]
  );

  const pnlPercent = useMemo(() => {
    const base = activeAccount?.account_balance || 1;
    return (netCumulativePnl / base) * 100;
  }, [netCumulativePnl, activeAccount?.account_balance]);

  const equityChartData = useMemo(() => buildEquityPointsFromTrades(trades), [trades]);
  const hasEquityData = equityChartData.length > 0;

  const totalTrades = trades.length;
  const wins = useMemo(
    () =>
      trades.filter(
        (t) => !t.break_even && t.trade_outcome === 'Win',
      ).length,
    [trades],
  );
  const losses = useMemo(
    () =>
      trades.filter(
        (t) => !t.break_even && t.trade_outcome === 'Lose',
      ).length,
    [trades],
  );
  const beTrades = useMemo(
    () =>
      trades.filter(
        (t) => t.break_even || t.trade_outcome === 'BE',
      ).length,
    [trades],
  );

  // TradeDetailsPanel.invalidateAndRefetchTradeQueries already handles scoped cache invalidation
  const handleTradeUpdated = useCallback(() => {}, []);

  const handleExportTrades = useCallback(() => {
    if (trades.length === 0) return;
    setExporting(true);
    try {
      exportTradesToCsv({
        trades,
        filename: `trades_${dateRange.startDate}_to_${dateRange.endDate}`,
      });
    } catch (error) {
      console.error('Error exporting trades:', error);
    } finally {
      setExporting(false);
    }
  }, [trades, dateRange.startDate, dateRange.endDate]);

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await deleteTrades(ids, mode);
      if (error) {
        console.error('Bulk delete error:', error);
        return;
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.trades.filtered(
          mode,
          activeAccount?.id,
          userId,
          'dateRange',
          '2000-01-01',
          todayStr,
          initialStrategyId
        ),
      });
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey;
          if (!Array.isArray(key)) return false;
          const first = key[0];
          return (
            (first === 'dashboardStats' || first === 'calendarTrades') &&
            (key[4] ?? null) === (initialStrategyId ?? null)
          );
        },
      });
    },
    [mode, activeAccount?.id, userId, todayStr, initialStrategyId, queryClient]
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            My Trades
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Browse your trading history with visual cards
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleExportTrades}
            disabled={exporting || trades.length === 0}
            className="cursor-pointer relative overflow-hidden rounded-xl themed-btn-primary text-white font-semibold px-4 py-2 group border-0 [&_svg]:text-white disabled:opacity-60"
          >
            <span className="relative z-10">{exporting ? 'Exporting…' : 'Export Trades'}</span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Button>
        </div>
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

      {/* Summary row: P&L + equity chart + total trades (tied to current filters) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Net P&amp;L
                </p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {currencySymbol}
                  {netCumulativePnl.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {netCumulativePnl >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
                <div
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                    netCumulativePnl >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {netCumulativePnl >= 0 ? '+' : ''}
                  {pnlPercent.toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-[80px]">
              {!mounted ? (
                <div className="w-full h-full flex items-center justify-center">
                  <BouncePulse size="md" />
                </div>
              ) : !hasEquityData ? (
                <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    No data yet
                  </p>
                </div>
              ) : (
                <EquityCurveChart
                  data={equityChartData}
                  currencySymbol={currencySymbol}
                  hasTrades={hasEquityData}
                  isLoading={false}
                  variant="card"
                  hideAxisLabels
                />
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Total Trades
                </p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {totalTrades}
                </p>
              </div>
            </div>
            <div className="flex-1 h-32">
              {!mounted ? (
                <div className="w-full h-full flex items-center justify-center">
                  <BouncePulse size="md" />
                </div>
              ) : (
                <TotalTradesDonut
                  totalTrades={totalTrades}
                  wins={wins}
                  losses={losses}
                  beTrades={beTrades}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <TradeCardsView
        trades={trades}
        isLoading={tradesLoading}
        isFetching={tradesFetching}
        resetKey={`${dateRange.startDate}-${dateRange.endDate}-${selectedMarket}-${executionFilter}-${sortField}-${showPartialTrades}`}
        onTradeUpdated={handleTradeUpdated}
        enableBulkDeleteInTableView
        onBulkDelete={handleBulkDelete}
        totalFilteredCount={filteredTrades.length}
        // Sort by control rendered on same row as View toggles
        sortControl={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
              Sort by:
            </span>
            <Select
              value={sortField}
              onValueChange={(value) => {
                if (value === 'partials_only') {
                  setShowPartialTrades(true);
                  setSortField('partials_only');
                  return;
                }
                setShowPartialTrades(false);
                setSortField(value as 'trade_date' | 'market' | 'outcome');
                setSortConfig((prev) => ({
                  field: value as 'trade_date' | 'market' | 'outcome',
                  direction: prev.field === value && prev.direction === 'asc' ? 'desc' : 'asc',
                }));
              }}
            >
              <SelectTrigger
                id="sort-by"
                className="flex w-32 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 !bg-slate-50/50 dark:!bg-slate-800/30 backdrop-blur-xl shadow-none themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                suppressHydrationWarning
              >
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent className="z-[100] border border-slate-200/70 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
                <SelectItem value="trade_date">Date</SelectItem>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="outcome">Outcome</SelectItem>
                <SelectItem value="partials_only">Partial trades</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />
    </div>
  );
}
