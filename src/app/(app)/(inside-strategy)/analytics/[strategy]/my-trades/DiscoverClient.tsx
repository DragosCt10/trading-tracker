'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear } from 'date-fns';
import { Trade } from '@/types/trade';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Loader2 } from 'lucide-react';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import { TradeFiltersBar, DateRangeValue } from '@/components/dashboard/analytics/TradeFiltersBar';
import { getFilteredTrades } from '@/lib/server/trades';
import type { Database } from '@/types/supabase';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

const ITEMS_PER_LOAD = 12;

type DateRangeState = {
  startDate: string;
  endDate: string;
};

type FilterType = 'year' | '15days' | '30days' | 'month';

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

interface DiscoverClientProps {
  /** User id from server (fallback when useUserDetails cache not yet hydrated) */
  initialUserId: string;
  initialFilteredTrades: Trade[];
  initialAllTrades: Trade[];
  initialDateRange: DateRangeState;
  initialMode: 'live' | 'backtesting' | 'demo';
  initialActiveAccount: AccountRow | null;
}

export default function DiscoverClient({
  initialUserId,
  initialFilteredTrades,
  initialAllTrades,
  initialDateRange,
  initialMode,
  initialActiveAccount,
}: DiscoverClientProps) {
  const today = new Date();

  const [dateRange, setDateRange] = useState<DateRangeState>(initialDateRange);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_LOAD);
  const [mounted, setMounted] = useState(false);
  const [selectedYear] = useState(new Date().getFullYear());
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('month');
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
  const observerTarget = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Server query when date range, mode, or account change (queryKey includes all of them)
  const {
    data: rawFilteredTrades,
    isLoading: filteredTradesLoading,
    isFetching: filteredTradesFetching,
  } = useQuery<Trade[]>({
    queryKey: [
      'filteredTrades',
      selection.mode,
      activeAccount?.id,
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async () => {
      if (!userId || !activeAccount?.id) return [];
      return getFilteredTrades({
        userId,
        accountId: activeAccount.id,
        mode: selection.mode,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        includeNonExecuted: true, // Include non-executed trades so they can be filtered client-side
      });
    },
    initialData: isInitialContext ? initialFilteredTrades : undefined,
    placeholderData: undefined,
    enabled: !!userId && !!activeAccount?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Use initial data only when mode/account/date range still match initial; otherwise show skeleton until fetch completes
  const filteredTrades = rawFilteredTrades ?? (isInitialContext ? initialFilteredTrades : []);

  // Fetch all trades for markets list (server query; refetch when mode/account/year changes)
  const isInitialModeAndAccount =
    selection.mode === initialMode && activeAccount?.id === initialActiveAccount?.id;
  const {
    data: rawAllTrades,
  } = useQuery<Trade[]>({
    queryKey: [
      'allTrades',
      selection.mode,
      activeAccount?.id,
      userId,
      selectedYear,
    ],
    queryFn: async () => {
      if (!userId || !activeAccount?.id) return [];
      const currentYear = new Date().getFullYear();
      return getFilteredTrades({
        userId,
        accountId: activeAccount.id,
        mode: selection.mode,
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        includeNonExecuted: true, // Include non-executed trades for markets list
      });
    },
    initialData: isInitialModeAndAccount ? initialAllTrades : undefined,
    enabled: !!userId && !!activeAccount?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const allTrades = rawAllTrades ?? (isInitialModeAndAccount ? initialAllTrades : []);

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
    setDisplayedCount(ITEMS_PER_LOAD); // Reset displayed count
  };

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

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_LOAD);
  }, [dateRange, selectedMarket, executionFilter]);

  // Get displayed trades (for infinite scroll)
  const displayedTrades = useMemo(() => {
    return trades.slice(0, displayedCount);
  }, [trades, displayedCount]);

  const hasMore = displayedCount < trades.length;

  // Intersection Observer for infinite scroll (only on client)
  useEffect(() => {
    if (!mounted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !filteredTradesLoading && !filteredTradesFetching) {
          setDisplayedCount((prev) => Math.min(prev + ITEMS_PER_LOAD, trades.length));
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [mounted, hasMore, filteredTradesLoading, filteredTradesFetching, trades.length]);

  const openModal = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedTrade(null);
    setIsModalOpen(false);
  };

  // No active account
  // if (!selection.activeAccount && !initialActiveAccount) {
  //   return (
  //     <div className="p-8">
  //       <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8 text-center">
  //         <h2 className="text-xl font-semibold text-slate-900 mb-2">No Active Account</h2>
  //         <p className="text-slate-600 mb-6">
  //           Please set up and activate an account for {selection.mode} mode to discover trades.
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Discover Trades</h1>
        <p className="text-sm text-slate-500 mt-1">
          Browse your trading history with visual cards
        </p>
      </div>

      {/* Trade Filters Bar */}
      <TradeFiltersBar
        dateRange={dateRange}
        onDateRangeChange={(range: DateRangeValue) => {
          setDateRange(range);
          setDisplayedCount(ITEMS_PER_LOAD); // Reset displayed count
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
      />

      {/* Trade Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
        {!mounted || (filteredTradesLoading && filteredTrades.length === 0) ? (
          // Skeleton loader
          <>
            {Array.from({ length: 12 }).map((_, index) => (
              <Card key={`skeleton-${index}`} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-32 mt-3" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : displayedTrades.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-500">No trades found for the selected period.</p>
          </div>
        ) : (
          <>
            {displayedTrades.map((trade) => (
              <Card key={trade.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {trade.trade_link ? (
                  <a
                    href={trade.trade_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-video bg-slate-100 relative overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
                  >
                    <img
                      src={trade.trade_link}
                      alt={`${trade.market} trade`}
                      className="w-full h-full object-cover scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </a>
                ) : (
                  <div className="aspect-video bg-slate-100 relative overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-12 h-12"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                        />
                      </svg>
                    </div>
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{trade.market}</h3>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`shadow-none ${
                          trade.trade_outcome === 'Win'
                            ? 'bg-emerald-100 hover:bg-emerald-100 text-green-600'
                            : 'bg-red-100 hover:bg-red-100 text-red-600'
                        }`}
                      >
                        {trade.trade_outcome}
                      </Badge>
                      {!trade.executed && (
                        <Badge className="bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-none border-none outline-none ring-0 flex items-center justify-center p-1 h-5 w-5 rounded-full">
                          <X className="h-3 w-3" />
                        </Badge>
                      )}
                      {trade.break_even && (
                        <Badge className="bg-slate-200 hover:bg-slate-200 text-slate-600 shadow-none text-xs">
                          BE
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center text-slate-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4 mr-2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                        />
                      </svg>
                      {trade.trade_date}
                    </div>
                    <div className="flex items-center text-slate-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4 mr-2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                      {trade.trade_time.substring(0, 5)}
                    </div>
                  </div>
                  <button
                    onClick={() => openModal(trade)}
                    className="mt-3 inline-flex items-center text-sm text-slate-700 hover:text-slate-900 underline cursor-pointer"
                  >
                    View Trade Details
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </CardContent>
              </Card>
            ))}
            
            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={observerTarget} className="col-span-full flex justify-center py-4">
                {filteredTradesFetching ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading more trades...</span>
                  </div>
                ) : (
                  <div className="h-4" /> // Spacer for intersection observer
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Trade Details Modal */}
      {selectedTrade && (
        <TradeDetailsModal
          trade={selectedTrade}
          isOpen={isModalOpen}
          onClose={closeModal}
          onTradeUpdated={async () => {
            // Invalidate all trade queries to refetch fresh data
            await queryClient.invalidateQueries({
              predicate: (query) => 
                query.queryKey[0] === 'filteredTrades' || 
                query.queryKey[0] === 'allTrades' ||
                query.queryKey[0] === 'discoverTrades'
            });
          }}
        />
      )}
    </div>
  );
}
