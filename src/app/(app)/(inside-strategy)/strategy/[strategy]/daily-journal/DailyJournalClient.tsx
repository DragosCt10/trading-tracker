'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Infinity as InfinityIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatPercent } from '@/lib/utils';
import type { Trade } from '@/types/trade';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import {
  buildPresetRange,
  isCustomDateRange,
  type DateRangeState,
  type FilterType,
} from '@/utils/dateRangeHelpers';
import {
  TradeFiltersBar,
  type DateRangeValue,
} from '@/components/dashboard/analytics/TradeFiltersBar';
import { calculateProfitFactor, calculateAveragePnLPercentage } from '@/utils/analyticsCalculations';
import { getIntervalForTime } from '@/constants/analytics';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import NotesModal from '@/components/NotesModal';

interface DailyJournalClientProps {
  strategyId: string;
  strategyName: string;
  initialTrades: Trade[];
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

function ScreensCarouselCell({ trade }: { trade: Trade }) {
  const screens = useMemo(
    () => (trade.trade_screens ?? []).filter(Boolean),
    [trade.trade_screens]
  );
  const [activeIdx, setActiveIdx] = useState(0);

  if (screens.length === 0) {
    return (
      <div className="w-28 h-16 rounded-lg bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500">
        No screen
      </div>
    );
  }

  const activeScreen = screens[activeIdx]!;
  const hasMultiple = screens.length > 1;

  return (
    <div className="relative w-32 h-20">
      <a
        href={activeScreen}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800/60 group"
      >
        <img
          src={activeScreen}
          alt={`${trade.market} trade screen ${activeIdx + 1}`}
          className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />

        {hasMultiple && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full pointer-events-none select-none">
            {activeIdx + 1}/{screens.length}
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveIdx((i) => (i - 1 + screens.length) % screens.length);
              }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center"
              aria-label="Previous screen"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                className="w-3 h-3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveIdx((i) => (i + 1) % screens.length);
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center"
              aria-label="Next screen"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                className="w-3 h-3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}
      </a>
    </div>
  );
}

const DAYS_PER_LOAD = 7;

export default function DailyJournalClient({
  strategyId: _strategyId,
  strategyName,
  initialTrades,
  currencySymbol,
  accountBalance,
}: DailyJournalClientProps) {
  // Filters (reuse patterns from MyTradesClient)
  const [dateRange, setDateRange] = useState<DateRangeState>(() => buildPresetRange('year').dateRange);
  const [activeFilter, setActiveFilter] = useState<FilterType>('year');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [executionFilter, setExecutionFilter] = useState<'all' | 'executed' | 'nonExecuted'>('executed');

  // Infinite scroll for days
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
    () => Array.from(new Set(initialTrades.map((t) => t.market).filter(Boolean))),
    [initialTrades]
  );

  const isCustomRange = isCustomDateRange(dateRange);

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
    if (activeFilter !== 'all' || initialTrades.length === 0) return undefined;
    return initialTrades.reduce(
      (min, t) => (t.trade_date < min ? t.trade_date : min),
      initialTrades[0].trade_date
    );
  }, [activeFilter, initialTrades]);

  // Apply filters client-side
  const filteredTrades = useMemo(() => {
    let list = initialTrades;

    // Date range
    list = list.filter(
      (t) => t.trade_date >= dateRange.startDate && t.trade_date <= dateRange.endDate
    );

    // Execution
    if (executionFilter === 'executed') {
      list = list.filter((t) => t.executed === true);
    } else if (executionFilter === 'nonExecuted') {
      list = list.filter((t) => !t.executed);
    }

    // Market
    if (selectedMarket !== 'all') {
      list = list.filter((t) => t.market === selectedMarket);
    }

    return list;
  }, [initialTrades, dateRange, executionFilter, selectedMarket]);

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
        trades: trades.slice().sort((a, b) => a.trade_time.localeCompare(b.trade_time)),
        totalProfit: trades.reduce((sum, t) => sum + (t.calculated_profit ?? 0), 0),
      }));
  }, [filteredTrades]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayedCount(DAYS_PER_LOAD);
  }, [dateRange, executionFilter, selectedMarket, filteredTrades.length]);

  const hasMore = displayedCount < dayGroups.length;
  const hasMoreRef = useRef(hasMore);
  const totalDaysRef = useRef(dayGroups.length);
  hasMoreRef.current = hasMore;
  totalDaysRef.current = dayGroups.length;

  // IntersectionObserver for infinite scroll (per day)
  useEffect(() => {
    if (!mounted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current) {
          setDisplayedCount((prev) => Math.min(prev + DAYS_PER_LOAD, totalDaysRef.current));
        }
      },
      { threshold: 0.1 }
    );

    const current = observerTarget.current;
    if (current) observer.observe(current);
    return () => observer.disconnect();
  }, [mounted]);

  const visibleDayGroups = useMemo(
    () => dayGroups.slice(0, displayedCount),
    [dayGroups, displayedCount]
  );

  const toggleDay = (date: string, currentlyOpen: boolean) => {
    setOpenByDate((prev) => ({
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Daily Journal
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Log daily notes and reflections for {strategyName}
        </p>
      </div>

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

      <div className="space-y-4 mt-4">
        {visibleDayGroups.length === 0 && (
          <Card className="rounded-2xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm py-10 px-6 flex items-center justify-center text-center">
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
        {visibleDayGroups.map((group, index) => {
          const isOpen = openByDate[group.date] ?? index === 0;
          const dayChartData = buildDayChartData(group.trades);
          const hasTrades = group.trades.length > 0;
          const totalTrades = group.trades.length;
          const winners = group.trades.filter((t) => t.trade_outcome === 'Win').length;
          const losers = group.trades.filter((t) => t.trade_outcome === 'Lose').length;
          const breakEven = group.trades.filter((t) => t.break_even).length;
          const winRate = totalTrades > 0 ? (winners / totalTrades) * 100 : 0;
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

          return (
            <Card
              key={group.date}
              className="rounded-2xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden"
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
              <div className="border-t border-slate-200/70 dark:border-slate-700/60 px-5 py-4">
                <div className="flex flex-col gap-10 md:flex-row md:items-center">
                  <div className="md:w-1/3 h-32 flex items-center">
                    <EquityCurveChart
                      data={dayChartData}
                      currencySymbol={currencySymbol}
                      hasTrades={hasTrades}
                      isLoading={!mounted}
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
                      <p className="text-base font-semibold text-amber-500">
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
                        {formatPercent(winRate)}%
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
                            Setup
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
                        {group.trades.map((trade) => (
                          <tr key={trade.id ?? `${group.date}-${trade.trade_time}-${trade.market}`}>
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
                              {trade.direction}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                              {trade.setup_type}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-1">
                                {trade.break_even || trade.trade_outcome === 'BE' ? (
                                  <>
                                    <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600 text-white">
                                      BE
                                    </Badge>
                                    {trade.be_final_result && (
                                      <Badge
                                        className={cn(
                                          'shadow-none border-none outline-none ring-0',
                                          trade.be_final_result === 'Win'
                                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                                            : 'bg-gradient-to-br from-rose-500 to-rose-300 text-white'
                                        )}
                                      >
                                        {trade.be_final_result}
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <Badge
                                    className={cn(
                                      'shadow-none border-none outline-none ring-0',
                                      trade.trade_outcome === 'Win'
                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                                        : 'bg-gradient-to-br from-rose-500 to-rose-300 text-white'
                                    )}
                                  >
                                    {trade.trade_outcome}
                                  </Badge>
                                )}
                                {!trade.executed && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white cursor-pointer">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          strokeWidth={2}
                                          stroke="currentColor"
                                          className="size-4"
                                        >
                                          <line
                                            x1="6"
                                            y1="6"
                                            x2="18"
                                            y2="18"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                          />
                                          <line
                                            x1="18"
                                            y1="6"
                                            x2="6"
                                            y2="18"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                          />
                                        </svg>
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl"
                                    >
                                      <div className="text-slate-600 dark:text-slate-300">
                                        Not executed trade
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {trade.partials_taken && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-blue-400 to-blue-600 text-white cursor-pointer">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          strokeWidth={1.5}
                                          stroke="currentColor"
                                          className="size-4"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z"
                                          />
                                        </svg>
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-2.5"
                                    >
                                      <div className="text-sm font-medium">
                                        Partial profits taken
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
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
            </Card>
          );
        })}

        {hasMore && (
          <div ref={observerTarget} className="flex justify-center py-4">
            <div className="h-4" />
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
  );
}
