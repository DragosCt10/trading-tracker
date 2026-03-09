'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface DailyJournalClientProps {
  strategyId: string;
  strategyName: string;
  initialTrades: Trade[];
  currencySymbol: string;
}

type DayGroup = {
  date: string;
  trades: Trade[];
  totalProfit: number;
};

const DAYS_PER_LOAD = 7;

export default function DailyJournalClient({
  strategyId: _strategyId,
  strategyName,
  initialTrades,
  currencySymbol,
}: DailyJournalClientProps) {
  // Filters (reuse patterns from MyTradesClient)
  const [dateRange, setDateRange] = useState<DateRangeState>(() => buildPresetRange('year').dateRange);
  const [activeFilter, setActiveFilter] = useState<FilterType>('year');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [executionFilter, setExecutionFilter] = useState<'all' | 'executed' | 'nonExecuted'>('all');

  // Infinite scroll for days
  const [displayedCount, setDisplayedCount] = useState(DAYS_PER_LOAD);
  const [mounted, setMounted] = useState(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Per-day collapse state
  const [openByDate, setOpenByDate] = useState<Record<string, boolean>>({});

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

  const toggleDay = (date: string) => {
    setOpenByDate((prev) => ({
      ...prev,
      [date]: !(prev[date] ?? true),
    }));
  };

  // Per‑day equity curve data (one series per day)
  const buildDayChartData = (trades: Trade[]) => {
    if (!trades.length) return [];
    const sorted = trades
      .slice()
      .sort((a, b) => a.trade_time.localeCompare(b.trade_time));

    let cumulative = 0;
    return sorted.map((trade) => {
      const profit = trade.calculated_profit ?? 0;
      cumulative += profit;
      return {
        date: trade.trade_date,
        profit: cumulative,
      };
    });
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

      <div className="space-y-4 mt-4">
        {visibleDayGroups.map((group) => {
          const isOpen = openByDate[group.date] ?? true;
          const dayChartData = buildDayChartData(group.trades);
          const hasTrades = group.trades.length > 0;
          const formattedDate = format(new Date(group.date), 'EEE, MMM d, yyyy');

          return (
            <Card
              key={group.date}
              className="rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/40 shadow-sm overflow-hidden"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleDay(group.date)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleDay(group.date);
                  }
                }}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formattedDate}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {group.trades.length} trades • P&amp;L:{' '}
                      <span className={group.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {currencySymbol}
                        {group.totalProfit.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl text-xs px-3 cursor-pointer"
                >
                  {isOpen ? 'Collapse' : 'Expand'}
                </Button>
              </div>

              {/* Equity curve for this day — always visible (outside collapse) */}
              <div className="border-t border-slate-200/70 dark:border-slate-700/60 px-5 py-4">
                <div className="h-40">
                  <EquityCurveChart
                    data={dayChartData}
                    currencySymbol={currencySymbol}
                    hasTrades={hasTrades}
                    isLoading={!mounted}
                  />
                </div>
              </div>

              {/* Collapsible body: reserved for future daily‑journal content */}
              {isOpen && (
                <div className="border-t border-slate-200/70 dark:border-slate-700/60 px-5 py-4" />
              )}
            </Card>
          );
        })}

        {hasMore && (
          <div ref={observerTarget} className="flex justify-center py-4">
            <div className="h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
