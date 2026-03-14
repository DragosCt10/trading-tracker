'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Trade } from '@/types/trade';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TRADES_DATA } from '@/constants/queryConfig';
import { TradeFiltersBar, DateRangeValue } from '@/components/dashboard/analytics/TradeFiltersBar';
import { getFilteredTrades, deleteTrades, moveTradestoStrategy } from '@/lib/server/trades';
import { getStrategiesOverview } from '@/lib/server/strategiesOverview';
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
import { useStrategies } from '@/hooks/useStrategies';
import { exportTradesToCsv } from '@/utils/exportTradesToCsv';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, Columns2, LayoutGrid, PanelLeft } from 'lucide-react';
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
import { calculateTradingOverviewStats } from '@/utils/calculateTradingOverviewStats';
import { calculateAverageDrawdown } from '@/utils/analyticsCalculations';
import { SummaryHalfGauge } from '@/components/dashboard/analytics/SummaryHalfGauge';
import { cn, formatPercent, roundToCents } from '@/lib/utils';
import { Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MonteCarloCard } from '@/components/trades/MonteCarloCard';

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
  const [cardViewMode, setCardViewMode] = useState<'grid-4' | 'grid-2' | 'split' | 'table'>('grid-4');

  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: userDetails } = useUserDetails();
  const { selection, setSelection } = useActionBarSelection();
  const userId = userDetails?.user?.id ?? initialUserId;
  const mode = selection.mode ?? initialMode;
  // Stable today string — same format StrategiesClient uses when seeding filteredTrades cache
  const todayStr = useMemo(() => createAllTimeRange().endDate, []);
  const { mounted, isDark } = useDarkMode();

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

  // Strategies for this account — used for the "move trades" feature
  const { strategies } = useStrategies({ userId, accountId: activeAccount?.id });
  const moveToStrategies = strategies
    .filter((s) => s.id !== initialStrategyId)
    .map((s) => ({ id: s.id, name: s.name }));

  // Strategy overview (same cache as Strategies list) — for "All trades" cumulative PnL to match StrategyCard
  const { data: strategiesOverview } = useQuery({
    queryKey: queryKeys.strategiesOverview(userId, activeAccount?.id, selection.mode ?? initialMode),
    queryFn: async () => {
      if (!activeAccount?.id) return {};
      return getStrategiesOverview(activeAccount.id, selection.mode ?? initialMode);
    },
    enabled: !!userId && !!activeAccount?.id && !!mode,
    ...TRADES_DATA,
  });

  const strategyCumulativePnl = useMemo(() => {
    const row = strategiesOverview?.[initialStrategyId];
    const curve = row?.equityCurve;
    if (!curve?.length) return undefined;
    return curve[curve.length - 1]?.p ?? undefined;
  }, [strategiesOverview, initialStrategyId]);

  const strategyWinRate = strategiesOverview?.[initialStrategyId]?.winRate;

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

  // When "All trades" + all markets + not "Non-executed only", use strategy overview (same as StrategyCard)
  const useOverviewPnl =
    activeFilter === 'all' &&
    selectedMarket === 'all' &&
    executionFilter !== 'nonExecuted' &&
    strategyCumulativePnl !== undefined;
  const displayCumulativePnl = useOverviewPnl ? strategyCumulativePnl : netCumulativePnl;

  const pnlPercent = useMemo(() => {
    const base = activeAccount?.account_balance || 1;
    return (displayCumulativePnl / base) * 100;
  }, [displayCumulativePnl, activeAccount?.account_balance]);

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

  const overviewStats = useMemo(
    () => calculateTradingOverviewStats(trades),
    [trades],
  );
  const displayWinRate =
    useOverviewPnl && typeof strategyWinRate === 'number' ? strategyWinRate : overviewStats.winRate;

  // Use same trade set as StrategyClient for drawdown: executed-only when execution is "all" or "executed"
  const tradesForDrawdown = useMemo(
    () =>
      executionFilter === 'nonExecuted'
        ? trades
        : trades.filter((t) => t.executed === true),
    [trades, executionFilter],
  );
  const averageDrawdown = useMemo(
    () => calculateAverageDrawdown(tradesForDrawdown, activeAccount?.account_balance || 0),
    [tradesForDrawdown, activeAccount?.account_balance],
  );
  const normalizedAverageDrawdown = useMemo(() => {
    const capped = Math.max(0, Math.min(averageDrawdown, 20));
    return (capped / 20) * 100;
  }, [averageDrawdown]);

  const avgDrawdownTooltipContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Average Drawdown Interpretation
      </div>
      <div className="space-y-2">
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all',
            averageDrawdown <= 2
              ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30',
          )}
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔹 0% – 2%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Excellent — Very low average drawdown, consistent performance.
          </div>
        </div>
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all',
            averageDrawdown > 2 && averageDrawdown <= 5
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30',
          )}
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">✅ 2% – 5%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Healthy — Acceptable average drawdown for most strategies.
          </div>
        </div>
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all',
            averageDrawdown > 5 && averageDrawdown <= 10
              ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30',
          )}
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">⚠️ 5% – 10%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Moderate — Higher average drawdown, monitor risk management.
          </div>
        </div>
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all',
            averageDrawdown > 10 && averageDrawdown <= 15
              ? 'bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30',
          )}
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">❗ 10% – 15%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            High Risk — Significant average drawdown exposure.
          </div>
        </div>
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all',
            averageDrawdown > 15
              ? 'bg-red-50/80 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30',
          )}
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🚫 15%+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Danger Zone — Extreme average drawdown, immediate review required.
          </div>
        </div>
      </div>
    </div>
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

  const handleBulkMoveToStrategy = useCallback(
    async (ids: string[], newStrategyId: string) => {
      if (ids.length === 0) return;
      const { error } = await moveTradestoStrategy(ids, newStrategyId, mode as 'live' | 'backtesting' | 'demo');
      if (error) {
        console.error('Move trades error:', error);
        return;
      }
      // Invalidate all trade + stats caches — refetchType:'all' forces a background
      // refetch of inactive queries too (e.g. StrategyClient while unmounted),
      // so the data is fresh before the user navigates back.
      const TRADE_PREFIXES = new Set([
        'allTrades', 'filteredTrades', 'nonExecutedTrades',
        'dashboardStats', 'calendarTrades', 'compactTrades', 'strategies-overview',
      ]);
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && TRADE_PREFIXES.has(q.queryKey[0] as string),
        refetchType: 'all',
      });
      // Tell StrategyClient's hydrateQueryCache to skip stale server-props on next mount
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('trade-data-invalidated', Date.now().toString());
      }
      // Flush Next.js router cache so navigating back to the strategy dashboard re-fetches
      router.refresh();
    },
    [mode, activeAccount?.id, userId, todayStr, initialStrategyId, queryClient, router]
  );

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
        queryKey: queryKeys.strategiesOverview(userId, activeAccount?.id, mode),
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

      {/* Summary row: P&L + equity chart + total trades + win rate + avg drawdown (tied to current filters) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Net P&amp;L
                </p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {currencySymbol}
                  {roundToCents(displayCumulativePnl).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {displayCumulativePnl >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
                <div
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                    displayCumulativePnl >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {displayCumulativePnl >= 0 ? '+' : ''}
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
                    No trades yet
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
                  variant="compact"
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
                  Win Rate
                </p>
              </div>
            </div>
            <div className="flex-1 h-32 relative">
              {!mounted || tradesLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <BouncePulse size="md" />
                </div>
              ) : totalTrades === 0 ? (
                <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    No trades yet
                  </p>
                </div>
              ) : (
                <SummaryHalfGauge
                  variant="winRate"
                  valueNormalized={displayWinRate}
                  centerLabel={`${formatPercent(displayWinRate)}%`}
                  minLabel="0%"
                  maxLabel="100%"
                />
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40 shadow-lg shadow-slate-200/60 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Avg Drawdown
                </p>
                <TooltipProvider>
                  <UITooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={0}
                        className="inline-flex h-3.5 w-3.5 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                        aria-label="Average drawdown info"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="center"
                      className="w-[320px] text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-700/80 bg-slate-900/90 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.7)] text-slate-50"
                      sideOffset={8}
                    >
                      {isDark && (
                        <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />
                      )}
                      <div className="relative text-left">
                        <div className="text-[11px] font-extrabold tracking-[0.18em] text-slate-300 mb-2">
                          AVERAGE DRAWDOWN INTERPRETATION
                        </div>
                        {avgDrawdownTooltipContent}
                      </div>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex-1 h-32 relative">
              {!mounted || tradesLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <BouncePulse size="md" />
                </div>
              ) : totalTrades === 0 ? (
                <div className="w-full h-full flex items-center justify-center rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    No trades yet
                  </p>
                </div>
              ) : (
                <SummaryHalfGauge
                  variant="avgDrawdown"
                  valueNormalized={normalizedAverageDrawdown}
                  centerLabel={`${averageDrawdown.toFixed(2)}%`}
                  minLabel="0%"
                  maxLabel="20%"
                  rawValueForTooltip={averageDrawdown}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Future Equity (Monte Carlo) card, using the same filtered trades */}
      <div className="mt-6">
        <MonteCarloCard trades={trades} currencySymbol={currencySymbol} />
      </div>

      <div className="mt-6 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              View Mode Trades
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              View your trades as cards, split, or table.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
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
                <SelectContent className="z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 cursor-pointer">
                  <SelectItem value="trade_date">Date</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="outcome">Outcome</SelectItem>
                  <SelectItem value="partials_only">Partial trades</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
              View:
            </span>
            <div className="inline-flex h-8 items-center rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none p-0.5">
              <button
                type="button"
                onClick={() => setCardViewMode('grid-2')}
                className={cn(
                  'rounded-lg h-6 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  cardViewMode === 'grid-2'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                aria-label="2 cards per row"
                aria-pressed={cardViewMode === 'grid-2'}
              >
                <Columns2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCardViewMode('grid-4')}
                className={cn(
                  'rounded-lg h-6 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  cardViewMode === 'grid-4'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                aria-label="4 cards per row"
                aria-pressed={cardViewMode === 'grid-4'}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCardViewMode('split')}
                className={cn(
                  'rounded-lg h-6 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  cardViewMode === 'split'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                aria-label="Split view"
                aria-pressed={cardViewMode === 'split'}
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCardViewMode('table')}
                className={cn(
                  'rounded-lg h-6 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  cardViewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                aria-label="Table view"
                aria-pressed={cardViewMode === 'table'}
              >
                Table
              </button>
            </div>
          </div>
        </div>
        <TradeCardsView
          trades={trades}
          isLoading={tradesLoading}
          isFetching={tradesFetching}
          resetKey={`${dateRange.startDate}-${dateRange.endDate}-${selectedMarket}-${executionFilter}-${sortField}-${showPartialTrades}`}
          onTradeUpdated={handleTradeUpdated}
          enableBulkDeleteInTableView
          onBulkDelete={handleBulkDelete}
          moveToStrategies={moveToStrategies}
          onBulkMoveToStrategy={handleBulkMoveToStrategy}
          totalFilteredCount={filteredTrades.length}
          cardViewMode={cardViewMode}
          onCardViewModeChange={setCardViewMode}
          suppressHeaderControls
        />
      </div>
    </div>
  );
}
