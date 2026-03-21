'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ChevronRight, Crown, Infinity as InfinityIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatPercent } from '@/lib/utils';
import { useBECalc } from '@/contexts/BECalcContext';
import type { Trade } from '@/types/trade';
import type { Database } from '@/types/supabase';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
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
import { getCurrencySymbolFromAccount } from '@/utils/accountOverviewHelpers';
import { DailyJournalSkeleton } from './DailyJournalSkeleton';
import { OutcomeChips } from '@/components/trades/OutcomeChips';
import { useSubscription } from '@/hooks/useSubscription';
import { buildPreviewTrade } from '@/utils/previewTrades';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

interface DailyJournalClientProps {
  strategyId: string;
  strategyName: string;
  initialTrades: Trade[];
  initialActiveAccount: AccountRow | null;
  initialMode: 'live' | 'demo' | 'backtesting';
  initialUserId: string;
  currencySymbol: string;
  accountBalance: number | null;
}

type DayGroup = {
  date: string;
  trades: Trade[];
  totalProfit: number;
};

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

const DAYS_PER_LOAD = 7;

export default function DailyJournalClient({
  strategyId,
  strategyName,
  initialTrades,
  initialActiveAccount,
  initialMode,
  initialUserId,
  currencySymbol: initialCurrencySymbol,
  accountBalance: initialAccountBalance,
}: DailyJournalClientProps) {
  const { data: userDetails } = useUserDetails();
  const { beCalcEnabled } = useBECalc();
  const { selection, setSelection } = useActionBarSelection();
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

  const {
    data: rawTrades,
    isLoading: tradesLoading,
  } = useQuery<Trade[]>({
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
    // Only use initialTrades as initialData when they're actually populated.
    // An empty array (server timeout fired) must NOT be treated as loaded data
    // or TanStack Query will never refetch within the staleTime window.
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

  // Filters (reuse patterns from MyTradesClient)
  const [dateRange, setDateRange] = useState<DateRangeState>(() => buildPresetRange('year').dateRange);
  const [activeFilter, setActiveFilter] = useState<FilterType>('year');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [executionFilter, setExecutionFilter] = useState<'all' | 'executed' | 'nonExecuted'>('executed');

  // Infinite scroll for days (mirrors TradeCardsView behavior)
  const [displayedCount, setDisplayedCount] = useState(DAYS_PER_LOAD);
  const [mounted, setMounted] = useState(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Per-day collapse state
  const [openByDate, setOpenByDate] = useState<Record<string, boolean>>({});

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string>('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Markets from full dataset
  const markets = useMemo(
    () => Array.from(new Set(allTradesData.map((t: Trade) => t.market).filter(Boolean))),
    [allTradesData]
  );

  const isCustomRange = isCustomDateRange(dateRange);

  const lockedPreviewDayGroups: DayGroup[] = useMemo(() => {
    const today = new Date();
    const date = format(today, 'yyyy-MM-dd');
    const previewTrades: Trade[] = [
      buildPreviewTrade({
        id: 'preview-1',
        trade_date: date,
        trade_outcome: 'Lose',
        calculated_profit: -100,
        direction: 'Long',
      }),
      buildPreviewTrade({
        id: 'preview-2',
        trade_date: date,
        trade_outcome: 'Win',
        calculated_profit: 200,
        direction: 'Long',
      }),
    ];
    return [
      {
        date,
        trades: previewTrades,
        totalProfit: 100,
      },
    ];
  }, []);

  const handleFilterChange = useCallback((type: FilterType) => {
    setActiveFilter(type);
    const { dateRange: nextRange } = buildPresetRange(type);
    setDateRange(nextRange);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRangeValue) => {
    setDateRange(range);
  }, []);

  const handleExecutionChange = useCallback(
    (execution: 'all' | 'executed' | 'nonExecuted') => {
      setExecutionFilter(execution);
    },
    []
  );

  // Earliest trade date for "All Trades" display
  const earliestTradeDate = useMemo(() => {
    if (activeFilter !== 'all') return undefined;
    const source = isPro ? allTradesData : lockedPreviewDayGroups.flatMap((g) => g.trades);
    if (source.length === 0) return undefined;
    return source.reduce(
      (min: string, t: Trade) => (t.trade_date < min ? t.trade_date : min),
      source[0].trade_date
    );
  }, [activeFilter, isPro, allTradesData, lockedPreviewDayGroups]);

  // Apply filters client-side
  const filteredTrades = useMemo(() => {
    let list = allTradesData;

    // Date range
    list = list.filter(
      (t: Trade) => t.trade_date >= dateRange.startDate && t.trade_date <= dateRange.endDate
    );

    // Execution
    if (executionFilter === 'executed') {
      list = list.filter((t: Trade) => t.executed === true);
    } else if (executionFilter === 'nonExecuted') {
      list = list.filter((t: Trade) => !t.executed);
    }

    // Market
    if (selectedMarket !== 'all') {
      list = list.filter((t: Trade) => t.market === selectedMarket);
    }

    return list;
  }, [allTradesData, dateRange, executionFilter, selectedMarket]);

  // Group trades by day
  const dayGroups: DayGroup[] = useMemo(() => {
    const byDate: Record<string, Trade[]> = {};
    for (const trade of filteredTrades) {
      const key = trade.trade_date;
      (byDate[key] ??= []).push(trade);
    }

    return Object.entries(byDate)
      .sort(([d1], [d2]) => (d1 < d2 ? 1 : -1)) // newest first
      .map(([date, trades]) => ({
        date,
        trades: trades.slice().sort((a: Trade, b: Trade) => a.trade_time.localeCompare(b.trade_time)),
        totalProfit: trades.reduce((sum: number, t: Trade) => sum + (t.calculated_profit ?? 0), 0),
      }));
  }, [filteredTrades]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayedCount(DAYS_PER_LOAD);
  }, [dateRange, executionFilter, selectedMarket, filteredTrades.length]);

  const hasMore = displayedCount < dayGroups.length;

  // IntersectionObserver for infinite scroll (per day)
  // Same pattern as TradeCardsView: bump displayedCount when sentinel enters viewport.
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (!hasMore) return;
        if (tradesLoading) return;
        setDisplayedCount((prev) => Math.min(prev + DAYS_PER_LOAD, dayGroups.length));
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => observer.disconnect();
  }, [mounted, hasMore, tradesLoading, dayGroups.length]);

  const visibleDayGroups = useMemo(
    () => dayGroups.slice(0, displayedCount),
    [dayGroups, displayedCount]
  );

  const displayedDayGroups = isPro ? visibleDayGroups : lockedPreviewDayGroups;

  const toggleDay = (date: string, currentlyOpen: boolean) => {
    setOpenByDate((prev: Record<string, boolean>) => ({
      ...prev,
      [date]: !currentlyOpen,
    }));
  };

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

  // Per‑day equity curve data (one series per day)
  const buildDayChartData = (trades: Trade[]) => {
    if (!trades.length) return [];

    const sorted = trades
      .slice()
      .sort((a, b) => a.trade_time.localeCompare(b.trade_time));

    const dayDate = sorted[0].trade_date;

    let cumulative = 0;
    const points = [];

    // Start-of-day baseline so the curve is visible even for a single trade
    points.push({
      date: new Date(dayDate),
      profit: 0,
    });

    for (const trade of sorted) {
      const profit = trade.calculated_profit ?? 0;
      cumulative += profit;
      points.push({
        date: trade.trade_date,
        profit: cumulative,
      });
    }

    return points;
  };

  if (activeAccount && tradesLoading && !isInitialContext) {
    return (
      <TooltipProvider>
        <DailyJournalSkeleton />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Daily Journal
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Log daily notes and reflections for {strategyName}
            </p>
          </div>
        </div>

      {activeAccount && (
        <div className="mb-6">
          <TradeFiltersBar
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            isCustomRange={isCustomRange}
            selectedMarket={selectedMarket}
            onSelectedMarketChange={setSelectedMarket}
            markets={markets}
            selectedExecution={executionFilter}
            onSelectedExecutionChange={handleExecutionChange}
            showAllTradesOption={true}
            displayStartDate={earliestTradeDate}
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
                Select an account from the toolbar above to view your daily journal trades.
              </p>
            </div>
          </Card>
        )}
        {activeAccount && isPro && !tradesLoading && visibleDayGroups.length === 0 && (
          <Card className="rounded-2xl border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm py-10 px-6 flex items-center justify-center text-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                No trades match the current filters
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try adjusting the date range, market, or execution filters to see trades here.
              </p>
            </div>
          </Card>
        )}
        {displayedDayGroups.map((group, index) => {
          const isOpen = openByDate[group.date] ?? index === 0;
          const dayChartData = buildDayChartData(group.trades);
          const hasTrades = group.trades.length > 0;
          const totalTrades = group.trades.length;
          const winners = group.trades.filter((t) => !t.break_even && t.trade_outcome === 'Win').length;
          const losers = group.trades.filter((t) => !t.break_even && t.trade_outcome === 'Lose').length;
          const breakEven = group.trades.filter((t) => t.break_even).length;
          const { winRate, winRateWithBE } = calculateWinRates(group.trades);
          const totalPnLPct = calculateAveragePnLPercentage(
            group.trades,
            accountBalance
          );
          const profitFactor = calculateProfitFactor(group.trades, winners, losers);
          const isValidProfitFactor =
            Number.isFinite(profitFactor) && !Number.isNaN(profitFactor);
          const realTrades = group.trades.filter(
            (t) => !t.break_even || (t.break_even && t.partials_taken)
          );
          const profitableTrades = realTrades.filter(
            (t) =>
              (!t.break_even && t.trade_outcome === 'Win') ||
              (t.break_even && t.partials_taken)
          );
          const consistency =
            realTrades.length > 0 ? (profitableTrades.length / realTrades.length) * 100 : 0;
          const formattedDate = format(new Date(group.date), 'EEE, MMM d, yyyy');

          const cardContent = (
            <Card
              className="rounded-2xl border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden"
            >
              {!isPro && (
                <>
                  <span className="absolute right-4 top-4 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" /> PRO
                  </span>
                  <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
                </>
              )}

              <div
                className={cn(
                  'relative',
                  !isPro && 'blur-[3px] opacity-70 pointer-events-none select-none'
                )}
              >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleDay(group.date, isOpen)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleDay(group.date, isOpen);
                  }
                }}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform duration-200',
                      isOpen ? 'rotate-90' : 'rotate-0'
                    )}
                  />
                  <div className="gap-1 flex flex-col">
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {formattedDate}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {group.trades.length} trades • P&L:{' '}
                      <span className={group.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        <strong>
                          {currencySymbol}
                          {formatPercent(group.totalProfit)}
                        </strong>
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleDay(group.date, isOpen);
                  }}
                  className="h-8 rounded-xl px-3 text-xs cursor-pointer transition-colors duration-200 border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium"
                >
                  {isOpen ? 'Collapse' : 'Expand'}
                </Button>
              </div>

              {/* Equity curve + header stats for this day — always visible (outside collapse) */}
              <div className="px-5 py-4">
                <div className="flex flex-col gap-10 md:flex-row md:items-center">
                  <div className="md:w-1/3 h-32 flex items-center">
                    <EquityCurveChart
                      data={dayChartData}
                      currencySymbol={currencySymbol}
                      hasTrades={hasTrades}
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
                      <p className="text-base font-semibold text-emerald-500">
                        {winners}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Losses
                      </p>
                      <p className="text-base font-semibold text-rose-500">
                        {losers}
                      </p>
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
                        Winrate
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

              <div
                className={cn(
                  'border-t border-slate-200/70 dark:border-slate-700/60 px-5 overflow-hidden transition-all duration-300 ease-in-out',
                  isOpen ? 'max-h-[1200px] py-4 opacity-100' : 'max-h-0 py-0 opacity-0'
                )}
              >
                <div className="relative overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
                      <thead className="bg-transparent border-b border-slate-200/70 dark:border-slate-700/70">
                        <tr>
                          <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Screens
                          </th>
                          <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Market
                          </th>
                          <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            P&L
                          </th>
                          <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Direction
                          </th>
                          <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            RR
                          </th>
                          <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Outcome
                          </th>
                          <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Risk
                          </th>
                          <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Notes
                          </th>
                          <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
                        {group.trades.map((trade, index) => (
                          <tr
                            key={
                              trade.id
                                ? `${trade.id}-${index}`
                                : `${group.date}-${trade.trade_time}-${trade.market}-${index}`
                            }
                          >
                            <td className="px-3 py-3 whitespace-nowrap align-middle">
                              <ScreensCarouselCell trade={trade} />
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
                            <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                              {(() => {
                                const profit = trade.calculated_profit ?? 0;
                                return (
                                  <span
                                    className={
                                      profit >= 0 ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'
                                    }
                                  >
                                    {currencySymbol}
                                    {profit.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
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
                            <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                              <OutcomeChips trade={trade} />
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">
                              {trade.risk_per_trade}%
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                              {trade.notes ? (
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openNotesModal(trade.notes || '');
                                  }}
                                  className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors"
                                >
                                  View Notes
                                </a>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">
                                  No notes
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openTradeDetails(trade);
                                }}
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
                </div>
              </div>
            </Card>
          );

          if (!isPro) {
            return (
              <Tooltip key={group.date} delayDuration={120}>
                <TooltipTrigger asChild>
                  {cardContent}
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  sideOffset={8}
                  className="max-w-sm text-xs rounded-2xl p-3 border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50"
                >
                  The data shown under the blur card is fictive and for demo purposes only.
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <div key={group.date}>
              {cardContent}
            </div>
          );
        })}

        {hasMore && (
          <div
            ref={observerTarget}
            className="flex justify-center py-6 text-sm text-slate-500 dark:text-slate-400"
          >
            Loading more days...
          </div>
        )}
      </div>

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
