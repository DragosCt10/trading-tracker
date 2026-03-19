'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Crown, Infinity as InfinityIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn, formatPercent } from '@/lib/utils';
import { useBECalc } from '@/contexts/BECalcContext';
import type { Trade } from '@/types/trade';
import type { Database } from '@/types/supabase';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { CustomStatConfig } from '@/types/customStats';
import {
  buildPresetRange,
  isCustomDateRange,
  createAllTimeRange,
  type DateRangeState,
  type FilterType,
} from '@/utils/dateRangeHelpers';
import {
  TradeFiltersBar,
  type DateRangeValue,
} from '@/components/dashboard/analytics/TradeFiltersBar';
import { calculateProfitFactor, calculateAveragePnLPercentage } from '@/utils/analyticsCalculations';
import { calculateWinRates } from '@/utils/calculateWinRates';
import { getIntervalForTime } from '@/constants/analytics';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import NotesModal from '@/components/NotesModal';
import { ScreensCarouselCell } from '@/components/trades/ScreensCarouselCell';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { getFilteredTrades } from '@/lib/server/trades';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';
import { getCurrencySymbolFromAccount } from '@/components/dashboard/analytics/AccountOverviewCard';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { OutcomeChips } from '@/components/trades/OutcomeChips';
import { useSubscription } from '@/hooks/useSubscription';
import { applyCustomStatFilter } from '@/utils/applyCustomStatFilter';
import { updateStrategyCustomStats } from '@/lib/server/strategies';
import { CustomStatModal } from '@/components/CustomStatModal';
import { CustomStatsSkeleton } from './CustomStatsSkeleton';
import { TIME_INTERVALS } from '@/constants/analytics';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

interface CustomStatsClientProps {
  strategyId: string;
  strategyName: string;
  extraCards: ExtraCardKey[];
  savedCustomStats: CustomStatConfig[];
  savedSetupTypes: string[];
  savedLiquidityTypes: string[];
  initialTrades: Trade[];
  initialActiveAccount: AccountRow | null;
  initialMode: 'live' | 'demo' | 'backtesting';
  initialUserId: string;
  currencySymbol: string;
  accountBalance: number | null;
}

function formatTradeTimeForDisplay(value: string | Date | unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    if (value.includes('T') || value.includes('Z')) {
      const d = new Date(value);
      return d.toISOString().slice(11, 19);
    }
    const interval = getIntervalForTime(value);
    return interval?.label ?? value;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }
  return String(value);
}

function buildFilterPills(filters: CustomStatConfig['filters']): string[] {
  const pills: string[] = [];
  if (filters.direction) pills.push(filters.direction);
  if (filters.market) pills.push(filters.market);
  if (filters.trade_time) {
    const interval = TIME_INTERVALS.find((i) => i.start === filters.trade_time);
    pills.push(interval ? interval.label : filters.trade_time);
  }
  if (filters.trade_outcome) pills.push(filters.trade_outcome);
  if (filters.day_of_week) pills.push(filters.day_of_week);
  if (filters.quarter) pills.push(filters.quarter);
  if (filters.news_related !== undefined) pills.push(filters.news_related ? 'News' : 'No News');
  if (filters.reentry !== undefined) pills.push(filters.reentry ? 'Re-entry' : 'No Re-entry');
  if (filters.partials_taken !== undefined) pills.push(filters.partials_taken ? 'Partials' : 'No Partials');
  if (filters.executed !== undefined) pills.push(filters.executed ? 'Executed' : 'Not Executed');
  if (filters.confidence_at_entry !== undefined) pills.push(`Conf: ${filters.confidence_at_entry}`);
  if (filters.mind_state_at_entry !== undefined) pills.push(`Mind: ${filters.mind_state_at_entry}`);
  if (filters.setup_type) pills.push(filters.setup_type);
  if (filters.liquidity) pills.push(filters.liquidity);
  if (filters.mss) pills.push(`MSS: ${filters.mss}`);
  if (filters.session) pills.push(filters.session);
  if (filters.evaluation) pills.push(filters.evaluation);
  if (filters.trend) pills.push(filters.trend);
  if (filters.local_high_low !== undefined) pills.push(filters.local_high_low ? 'Local H/L' : 'No Local H/L');
  if (filters.launch_hour !== undefined) pills.push(filters.launch_hour ? 'Launch Hour' : 'No Launch Hour');
  if (filters.fvg_size !== undefined) pills.push(`FVG: ${filters.fvg_size}`);
  return pills;
}

export default function CustomStatsClient({
  strategyId,
  strategyName,
  extraCards,
  savedCustomStats,
  savedSetupTypes,
  savedLiquidityTypes,
  initialTrades,
  initialActiveAccount,
  initialMode,
  initialUserId,
  currencySymbol: initialCurrencySymbol,
  accountBalance: initialAccountBalance,
}: CustomStatsClientProps) {
  const { data: userDetails } = useUserDetails();
  const { beCalcEnabled } = useBECalc();
  const { selection, setSelection } = useActionBarSelection();
  const queryClient = useQueryClient();
  const userId = userDetails?.user?.id ?? initialUserId;
  const { isPro } = useSubscription({ userId });
  const activeAccount = selection.activeAccount ?? initialActiveAccount;

  useEffect(() => {
    if (initialActiveAccount && !selection.activeAccount && initialMode) {
      setSelection({ mode: initialMode, activeAccount: initialActiveAccount });
    }
  }, [initialActiveAccount, initialMode, selection.activeAccount, setSelection]);

  const allTime = useMemo(() => createAllTimeRange(), []);
  const isInitialContext =
    selection.mode === initialMode && activeAccount?.id === initialActiveAccount?.id;

  const { data: rawTrades, isLoading: tradesLoading } = useQuery<Trade[]>({
    queryKey: queryKeys.trades.filtered(
      selection.mode,
      activeAccount?.id,
      userId,
      'all',
      allTime.startDate,
      allTime.endDate,
      strategyId,
    ),
    queryFn: async () => {
      if (!isPro) return [];
      if (!userId || !activeAccount?.id) return [];
      return getFilteredTrades({
        userId,
        accountId: activeAccount.id,
        mode: selection.mode,
        startDate: allTime.startDate,
        endDate: allTime.endDate,
        includeNonExecuted: true,
        strategyId,
      });
    },
    initialData: (isPro && isInitialContext && initialTrades.length > 0) ? initialTrades : undefined,
    enabled: isPro && !!userId && !!activeAccount?.id,
    ...TRADES_DATA,
  });

  const allTradesData = useMemo(
    () => (isPro ? (rawTrades ?? (isInitialContext && initialTrades.length > 0 ? initialTrades : [])) : []),
    [isPro, rawTrades, isInitialContext, initialTrades]
  );

  const currencySymbol = activeAccount
    ? getCurrencySymbolFromAccount(activeAccount)
    : initialCurrencySymbol;
  const accountBalance = activeAccount?.account_balance ?? initialAccountBalance;

  // Filters (date range only — market and execution are per-card via CustomStatFilter)
  const [dateRange, setDateRange] = useState<DateRangeState>(() => buildPresetRange('year').dateRange);
  const [activeFilter, setActiveFilter] = useState<FilterType>('year');

  const [mounted] = useState(() => typeof window !== 'undefined');

  // Custom stats state
  const [savedStats, setSavedStats] = useState<CustomStatConfig[]>(savedCustomStats);
  const [openById, setOpenById] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CustomStatConfig | null>(null);

  // Trade detail/notes modals
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string>('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const isCustomRange = isCustomDateRange(dateRange);

  const earliestTradeDate = useMemo(() => {
    if (activeFilter !== 'all') return undefined;
    if (allTradesData.length === 0) return undefined;
    return allTradesData.reduce(
      (min: string, t: Trade) => (t.trade_date < min ? t.trade_date : min),
      allTradesData[0].trade_date
    );
  }, [activeFilter, allTradesData]);

  // Only filter by date range — market/execution are handled per-card by applyCustomStatFilter
  const filteredTrades = useMemo(
    () => allTradesData.filter(
      (t: Trade) => t.trade_date >= dateRange.startDate && t.trade_date <= dateRange.endDate
    ),
    [allTradesData, dateRange]
  );

  const handleFilterChange = useCallback((type: FilterType) => {
    setActiveFilter(type);
    const { dateRange: nextRange } = buildPresetRange(type);
    setDateRange(nextRange);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRangeValue) => {
    setDateRange(range);
  }, []);

  const openTradeDetails = useCallback((trade: Trade) => {
    setSelectedTrade(trade);
    setIsDetailsOpen(true);
  }, []);

  const closeTradeDetails = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedTrade(null);
  }, []);

  const openNotesModal = useCallback((notes: string) => {
    setSelectedNotes(notes);
    setIsNotesOpen(true);
  }, []);

  const closeNotesModal = useCallback(() => {
    setIsNotesOpen(false);
  }, []);

  const persistStats = useCallback(
    async (nextStats: CustomStatConfig[]) => {
      setSavedStats(nextStats);
      await updateStrategyCustomStats(strategyId, userId, nextStats);
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies(userId) });
    },
    [strategyId, userId, queryClient]
  );

  const handleSave = useCallback(
    (config: CustomStatConfig) => {
      const idx = savedStats.findIndex((s) => s.id === config.id);
      const nextStats =
        idx >= 0
          ? savedStats.map((s, i) => (i === idx ? config : s))
          : [...savedStats, config];
      persistStats(nextStats);
      setIsModalOpen(false);
      setEditingConfig(null);
    },
    [savedStats, persistStats]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const nextStats = savedStats.filter((s) => s.id !== id);
      persistStats(nextStats);
    },
    [savedStats, persistStats]
  );

  const handleEdit = useCallback((config: CustomStatConfig) => {
    setEditingConfig(config);
    setIsModalOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingConfig(null);
    setIsModalOpen(true);
  }, []);

  const toggleCard = useCallback((id: string) => {
    setOpenById((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const buildCardChartData = (trades: Trade[]) => {
    if (!trades.length) return [];
    const sorted = trades
      .slice()
      .sort((a, b) =>
        a.trade_date !== b.trade_date
          ? a.trade_date.localeCompare(b.trade_date)
          : a.trade_time.localeCompare(b.trade_time)
      );
    let cumulative = 0;
    const points: { date: string | Date; profit: number }[] = [{ date: sorted[0].trade_date, profit: 0 }];
    for (const trade of sorted) {
      cumulative += trade.calculated_profit ?? 0;
      points.push({ date: trade.trade_date, profit: cumulative });
    }
    return points;
  };

  if (activeAccount && tradesLoading && !isInitialContext) {
    return (
      <TooltipProvider>
        <CustomStatsSkeleton />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Custom Stats
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Custom filter combinations for {strategyName}
          </p>
        </div>

        {activeAccount && (
          <div className="mb-6">
            <TradeFiltersBar
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
              isCustomRange={isCustomRange}
              selectedMarket="all"
              onSelectedMarketChange={() => {}}
              markets={[]}
              selectedExecution="all"
              onSelectedExecutionChange={() => {}}
              showAllTradesOption={true}
              displayStartDate={earliestTradeDate}
              hideMarket
              hideExecution
            />
          </div>
        )}

        <div className="space-y-4 mt-4">
          {!activeAccount && (
            <Card className="rounded-2xl border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm py-10 px-6 flex items-center justify-center text-center">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  No account selected
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select an account from the toolbar above to view custom stats.
                </p>
              </div>
            </Card>
          )}

          {savedStats.map((config, index) => {
            const isOpen = openById[config.id] ?? index === 0;
            const cardTrades = applyCustomStatFilter(filteredTrades, config.filters);
            const totalTrades = cardTrades.length;
            const winners = cardTrades.filter((t) => !t.break_even && t.trade_outcome === 'Win').length;
            const losers = cardTrades.filter((t) => !t.break_even && t.trade_outcome === 'Lose').length;
            const breakEven = cardTrades.filter((t) => t.break_even).length;
            const { winRate, winRateWithBE } = calculateWinRates(cardTrades);
            const totalPnLPct = calculateAveragePnLPercentage(cardTrades, accountBalance);
            const profitFactor = calculateProfitFactor(cardTrades, winners, losers);
            const isValidProfitFactor = Number.isFinite(profitFactor) && !Number.isNaN(profitFactor);
            const realTrades = cardTrades.filter(
              (t) => !t.break_even || (t.break_even && t.partials_taken)
            );
            const profitableTrades = realTrades.filter(
              (t) =>
                (!t.break_even && t.trade_outcome === 'Win') ||
                (t.break_even && t.partials_taken)
            );
            const consistency =
              realTrades.length > 0 ? (profitableTrades.length / realTrades.length) * 100 : 0;

            const filterPills = buildFilterPills(config.filters);
            const totalPnL = cardTrades.reduce((sum, t) => sum + (t.calculated_profit ?? 0), 0);
            const cardChartData = buildCardChartData(cardTrades);

            return (
              <Card
                key={config.id}
                className="rounded-2xl border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden relative"
              >
                {!isPro && (
                  <>
                    <span className="absolute right-4 top-4 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" /> PRO
                    </span>
                    <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
                  </>
                )}

                <div className={cn(!isPro && 'blur-[3px] opacity-70 pointer-events-none select-none')}>
                  {/* Card header */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleCard(config.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCard(config.id);
                      }
                    }}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 shrink-0',
                          isOpen ? 'rotate-90' : 'rotate-0'
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {config.name}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {totalTrades} trade{totalTrades !== 1 ? 's' : ''} • P&L:{' '}
                          <span className={totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                            <strong>
                              {currencySymbol}
                              {formatPercent(totalPnL)}
                            </strong>
                          </span>
                        </p>
                        {filterPills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-4">
                            {filterPills.map((pill) => (
                              <span
                                key={pill}
                                className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                              >
                                {pill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(config);
                        }}
                        className="h-8 rounded-xl px-3 text-xs cursor-pointer transition-colors duration-200 border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(config.id);
                        }}
                        className="h-8 rounded-xl px-3 text-xs cursor-pointer transition-colors duration-200 border border-rose-200/80 bg-rose-50/60 text-rose-600 hover:bg-rose-100/80 hover:text-rose-700 hover:border-rose-300/80 dark:border-rose-800/80 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 dark:hover:text-rose-300 dark:hover:border-rose-700/80 font-medium"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Stats row — always visible */}
                  <div className="border-t border-slate-200/70 dark:border-slate-700/60 px-5 py-4">
                    <div className="flex flex-col gap-10 md:flex-row md:items-center">
                      <div className="md:w-1/3 h-32 flex items-center">
                        <EquityCurveChart
                          data={cardChartData}
                          currencySymbol={currencySymbol}
                          hasTrades={cardTrades.length > 0}
                          isLoading={!mounted}
                          variant="card"
                          hideAxisLabels
                        />
                      </div>
                      <div className="flex-1 md:flex md:items-center">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-20 gap-y-6 text-xs sm:text-sm w-full">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Total Trades
                            </p>
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              {totalTrades}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Wins
                            </p>
                            <p className="text-base font-semibold text-emerald-500">{winners}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Losses
                            </p>
                            <p className="text-base font-semibold text-rose-500">{losers}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              BE
                            </p>
                            <p className="text-base font-semibold text-slate-600 dark:text-slate-300">
                              {breakEven}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              P&L %
                            </p>
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              {formatPercent(totalPnLPct)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Win Rate
                            </p>
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              {formatPercent(beCalcEnabled ? winRateWithBE : winRate)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Profit Factor
                            </p>
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              {isValidProfitFactor ? (
                                profitFactor.toFixed(2)
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <InfinityIcon className="h-4 w-4" aria-label="Infinite profit factor" />
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Consistency
                            </p>
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              {formatPercent(consistency)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible trade table */}
                  <div
                    className={cn(
                      'border-t border-slate-200/70 dark:border-slate-700/60 px-5 overflow-hidden transition-all duration-300 ease-in-out',
                      isOpen ? 'max-h-[1200px] py-4 opacity-100' : 'max-h-0 py-0 opacity-0'
                    )}
                  >
                    {cardTrades.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
                        No trades match these filters in the selected date range.
                      </p>
                    ) : (
                      <div className="relative overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
                          <thead className="bg-transparent border-b border-slate-200/70 dark:border-slate-700/70">
                            <tr>
                              {['Screens', 'Date', 'Time', 'Market', 'P&L', 'Direction', 'RR', 'Outcome', 'Risk', 'Notes', 'Actions'].map((col) => (
                                <th
                                  key={col}
                                  className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
                            {cardTrades.map((trade, idx) => (
                              <tr
                                key={
                                  trade.id
                                    ? `${trade.id}-${idx}`
                                    : `${trade.trade_date}-${trade.trade_time}-${trade.market}-${idx}`
                                }
                              >
                                <td className="px-3 py-3 whitespace-nowrap align-middle">
                                  <ScreensCarouselCell trade={trade} />
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                  {trade.trade_date}
                                </td>
                                <td
                                  className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                                  suppressHydrationWarning
                                >
                                  {formatTradeTimeForDisplay(trade.trade_time)}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {trade.market}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm">
                                  {(() => {
                                    const profit = trade.calculated_profit ?? 0;
                                    return (
                                      <span className={profit >= 0 ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>
                                        {currencySymbol}
                                        {profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                  {trade.direction === 'Long' ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="text-emerald-500 dark:text-emerald-400 text-[11px]">↑</span>
                                      <span>Long</span>
                                    </span>
                                  ) : trade.direction === 'Short' ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="text-rose-500 dark:text-rose-400 text-[11px]">↓</span>
                                      <span>Short</span>
                                    </span>
                                  ) : (
                                    <span>{trade.direction ?? '—'}</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                  {typeof trade.risk_reward_ratio === 'number' && !Number.isNaN(trade.risk_reward_ratio) ? (
                                    <span>
                                      {trade.risk_reward_ratio.toFixed(2)}
                                      <span className="ml-0.5 text-[10px] text-slate-400 dark:text-slate-500">R</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <OutcomeChips trade={trade} />
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {trade.risk_per_trade}%
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm">
                                  {trade.notes ? (
                                    <a
                                      href="#"
                                      onClick={(e) => { e.preventDefault(); openNotesModal(trade.notes || ''); }}
                                      className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors"
                                    >
                                      View Notes
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500">No notes</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm">
                                  <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); openTradeDetails(trade); }}
                                    className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors"
                                  >
                                    Trade Details
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Add Card */}
          <button
            type="button"
            onClick={isPro ? handleAdd : undefined}
            className={cn(
              'w-full rounded-2xl border-2 border-dashed py-8 flex flex-col items-center justify-center gap-2 transition-all duration-200',
              isPro
                ? 'border-slate-300/70 dark:border-slate-600/60 hover:border-slate-400/80 dark:hover:border-slate-500/70 hover:bg-slate-100/40 dark:hover:bg-slate-800/30 cursor-pointer'
                : 'border-slate-200/50 dark:border-slate-700/40 opacity-60 cursor-not-allowed'
            )}
          >
            <Plus className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {isPro ? 'Add Custom Combination' : 'PRO feature — upgrade to create custom stats'}
            </span>
          </button>
        </div>

        <CustomStatModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingConfig(null); }}
          onSave={handleSave}
          editing={editingConfig}
          extraCards={extraCards}
          setupOptions={savedSetupTypes}
          liquidityOptions={savedLiquidityTypes}
        />

        {selectedTrade && (
          <TradeDetailsModal
            trade={selectedTrade}
            isOpen={isDetailsOpen}
            onClose={closeTradeDetails}
            strategyName={strategyName}
          />
        )}
        <NotesModal isOpen={isNotesOpen} onClose={closeNotesModal} notes={selectedNotes} />
      </div>
    </TooltipProvider>
  );
}
