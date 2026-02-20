'use client';

import { useEffect, useState, useRef } from 'react';
import { Trade } from '@/types/trade';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import NotesModal from '@/components/NotesModal';
import { useQuery } from '@tanstack/react-query';
import { format, endOfMonth, startOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { DateRange } from 'react-date-range';
import { Calendar } from 'lucide-react';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQueryClient } from '@tanstack/react-query';
import { getFilteredTrades } from '@/lib/server/trades';
import type { Database } from '@/types/supabase';

// Import shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

const ITEMS_PER_PAGE = 10;

/** Normalize trade_time so server and client render the same (avoids hydration mismatch from timezone). */
function formatTradeTimeForDisplay(value: string | Date | unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    if (value.includes('T') || value.includes('Z')) {
      const d = new Date(value);
      return d.toISOString().slice(11, 19);
    }
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }
  return String(value);
}

type DateRangeState = { startDate: string; endDate: string };

interface ManageTradesClientProps {
  initialUserId: string;
  initialTrades: Trade[];
  initialDateRange: DateRangeState;
  initialMode: 'live' | 'backtesting' | 'demo';
  initialActiveAccount: AccountRow | null;
  initialStrategyId: string;
}

export default function ManageTradesClient({
  initialUserId,
  initialTrades,
  initialDateRange,
  initialMode,
  initialActiveAccount,
  initialStrategyId,
}: ManageTradesClientProps) {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Filter states
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [showNonExecuted, setShowNonExecuted] = useState<boolean>(false);
  const [showPartialTrades, setShowPartialTrades] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<{ field: 'trade_date' | 'market' | 'outcome'; direction: 'asc' | 'desc' }>({
    field: 'trade_date',
    direction: 'asc'
  });

  const queryClient = useQueryClient();
  const { data: userDetails } = useUserDetails();
  const { selection, setSelection } = useActionBarSelection();
  const userId = userDetails?.user?.id ?? initialUserId;
  const activeAccount = selection.activeAccount ?? initialActiveAccount;

  // Sync selection from server when action bar has not hydrated yet
  useEffect(() => {
    if (initialActiveAccount && !selection.activeAccount && initialMode) {
      setSelection({ mode: initialMode, activeAccount: initialActiveAccount });
    }
  }, [initialActiveAccount, initialMode, selection.activeAccount, setSelection]);

  const [dateRange, setDateRange] = useState<DateRangeState>(initialDateRange);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [tempRange, setTempRange] = useState<DateRangeState>(initialDateRange);

  type FilterType = 'year' | '15days' | '30days' | 'month' | null;
  const [activeFilter, setActiveFilter] = useState<FilterType>('month');

  // Check if current date range is custom
  const isCustomDateRange = () => {
    const today = new Date();
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
    
    const yearStart = fmt(startOfYear(today));
    const yearEnd = fmt(endOfYear(today));
    const last15Start = fmt(subDays(today, 14));
    const last30Start = fmt(subDays(today, 29));
    const monthStart = fmt(startOfMonth(today));
    const monthEnd = fmt(endOfMonth(today));

    const presets = [
      { startDate: yearStart, endDate: yearEnd },
      { startDate: last15Start, endDate: fmt(today) },
      { startDate: last30Start, endDate: fmt(today) },
      { startDate: monthStart, endDate: monthEnd },
    ];

    return !presets.some(
      (p) => p.startDate === dateRange.startDate && p.endDate === dateRange.endDate
    );
  };

  // Update activeFilter when dateRange changes externally (only if it doesn't match current filter)
  useEffect(() => {
    const today = new Date();
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
    const yearStart = fmt(startOfYear(today));
    const yearEnd = fmt(endOfYear(today));
    const last15Start = fmt(subDays(today, 14));
    const last30Start = fmt(subDays(today, 29));
    const monthStart = fmt(startOfMonth(today));
    const monthEnd = fmt(endOfMonth(today));

    let newFilter: FilterType = null;
    if (dateRange.startDate === yearStart && dateRange.endDate === yearEnd) {
      newFilter = 'year';
    } else if (dateRange.startDate === last15Start && dateRange.endDate === fmt(today)) {
      newFilter = '15days';
    } else if (dateRange.startDate === last30Start && dateRange.endDate === fmt(today)) {
      newFilter = '30days';
    } else if (dateRange.startDate === monthStart && dateRange.endDate === monthEnd) {
      newFilter = 'month';
    }

    // Only update if the filter actually changed
    setActiveFilter((currentFilter) => {
      if (newFilter !== currentFilter) {
        return newFilter;
      }
      return currentFilter;
    });
  }, [dateRange.startDate, dateRange.endDate]);

  // Handle preset filter changes
  const handleFilter = (type: Exclude<FilterType, null>) => {
    const today = new Date();
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

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

    setActiveFilter(type);
    setDateRange({ startDate, endDate });
    setCurrentPage(1);
  };

  const isInitialContext =
    selection.mode === initialMode &&
    activeAccount?.id === initialActiveAccount?.id &&
    dateRange.startDate === initialDateRange.startDate &&
    dateRange.endDate === initialDateRange.endDate;

  const {
    data: rawTrades,
    isLoading: allTradesLoading,
    error: allTradesError,
  } = useQuery<Trade[]>({
    queryKey: [
      'allTrades',
      selection.mode,
      activeAccount?.id,
      userId,
      dateRange.startDate,
      dateRange.endDate,
      initialStrategyId,
    ],
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
    initialData: isInitialContext ? initialTrades : undefined,
    enabled: !!userId && !!activeAccount?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const allTradesData = rawTrades ?? (isInitialContext ? initialTrades : []);

  // Market options
  const tradesForMarketDropdown = allTradesData || [];
  const uniqueMarkets = Array.from(new Set(tradesForMarketDropdown.map(trade => trade.market))).filter(Boolean);

  // Table data and pagination logic
  const allTrades = allTradesData || [];
  const filteredTrades = allTrades.filter(trade => {
    // Apply market filter
    if (selectedMarket !== 'all' && trade.market !== selectedMarket) {
      return false;
    }
    // Apply non-executed filter
    if (showNonExecuted && trade.executed !== false) {
      return false;
    }
    // Apply partial trades filter
    if (showPartialTrades && !trade.partials_taken) {
      return false;
    }
    return true;
  });

  // Apply sorting
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (sortConfig.field === 'outcome') {
      const getOutcomeValue = (trade: Trade) => {
        if (trade.break_even) return 'BE';
        return trade.trade_outcome;
      };
      const aValue = getOutcomeValue(a);
      const bValue = getOutcomeValue(b);
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    }
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
    if (sortConfig.field === 'trade_date') {
      return sortConfig.direction === 'asc'
        ? new Date(bValue).getTime() - new Date(aValue).getTime()
        : new Date(aValue).getTime() - new Date(bValue).getTime();
    }
    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const paginatedTotalCount = sortedTrades.length;
  const paginatedTotalPages = Math.ceil(paginatedTotalCount / ITEMS_PER_PAGE);
  const paginatedCurrentPage = Math.min(currentPage, paginatedTotalPages === 0 ? 1 : paginatedTotalPages);
  const startIdx = (paginatedCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedTrades = sortedTrades.slice(startIdx, endIdx);

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

  const clearFilters = () => {
    const today = new Date();
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
    setDateRange({
      startDate: fmt(startOfMonth(today)),
      endDate: fmt(endOfMonth(today)),
    });
    setActiveFilter('month');
    setCurrentPage(1);
    setSelectedMarket('all');
    setShowNonExecuted(false);
    setShowPartialTrades(false);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMarket]);

  const openModal = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedTrade(null);
    setIsModalOpen(false);
  };

  const openNotesModal = (notes: string) => {
    setSelectedNotes(notes);
    setIsNotesModalOpen(true);
  };

  const closeNotesModal = () => {
    setIsNotesModalOpen(false);
    setSelectedNotes('');
  };

  const exportToCSV = async () => {
    if (!paginatedTrades || paginatedTrades.length === 0) return;

    setExporting(true);
    setExportProgress(0);

    try {
      const headers = [
        'Date', 'Time', 'Day of Week', 'Market', 'Direction', 'Setup', 'Outcome',
        'Risk %', 'Trade Link', 'Liquidity Taken', 'Local High/Low',
        'News Related', 'ReEntry', 'Break Even', 'MSS', 'Risk:Reward Ratio',
        'Risk:Reward Ratio Long', 'SL Size', 'Calculated Profit', 'P/L %',
        'Evaluation', 'Notes'
      ];

      const escapeCSV = (value: any) => {
        if (value == null) return '';
        const str = value.toString().replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...paginatedTrades.map((trade: Trade) => [
          trade.trade_date,
          trade.trade_time,
          trade.day_of_week,
          trade.market,
          trade.direction,
          trade.setup_type,
          trade.trade_outcome,
          trade.risk_per_trade,
          trade.trade_link,
          trade.liquidity_taken,
          trade.local_high_low ? 'Yes' : 'No',
          trade.news_related ? 'Yes' : 'No',
          trade.reentry ? 'Yes' : 'No',
          trade.break_even ? 'Yes' : 'No',
          trade.mss,
          trade.risk_reward_ratio,
          trade.risk_reward_ratio_long,
          trade.sl_size,
          trade.calculated_profit || '',
          trade.pnl_percentage || '',
          trade.evaluation || '',
          trade.rr_hit_1_4 ? 'Yes' : 'No',
          trade.notes || '',
          trade.executed ? 'Yes' : 'No'
        ].map(escapeCSV).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `trades_${dateRange.startDate}_to_${dateRange.endDate}_page${paginatedCurrentPage}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting trades:', error);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };


  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Manage Trades
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Viewing trades for {selection.mode} mode
                </p>
              </div>
              <Button 
                onClick={exportToCSV} 
                className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0"
              >
                <span className="relative z-10">Export Trades</span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </div>
          </div>

          {/* Filters Section - Reorganized for better UX */}
          <div className="mb-6 space-y-4">
            {/* Row 1: Primary Filters - Market and Sort */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <label htmlFor="market-filter" className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">Market:</label>
                <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                  <SelectTrigger
                    id="market-filter"
                    className="w-full sm:w-48 h-12 rounded-full bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border-slate-200/60 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300 shadow-sm text-slate-900 dark:text-slate-100"
                  >
                    <SelectValue placeholder="Market" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Markets</SelectItem>
                    {uniqueMarkets.map(market => (
                      <SelectItem key={market} value={market}>{market}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-0 sm:justify-end">
                <label htmlFor="sort-by" className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">Sort by:</label>
                <Select value={sortConfig.field} onValueChange={value => {
                  const field = value as 'trade_date' | 'market' | 'outcome';
                  setSortConfig(prev => ({
                    field,
                    direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
                  }));
                }}>
                  <SelectTrigger id="sort-by" className="w-full sm:w-48 h-12 rounded-full bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border-slate-200/60 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300 shadow-sm text-slate-900 dark:text-slate-100">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trade_date">Date</SelectItem>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="outcome">Outcome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Date Range and Quick Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
              <div className="w-full md:max-w-xs sm:max-w-sm">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Date Range
                </label>
                <div className="relative w-full">
                  <Input
                    ref={inputRef}
                    placeholder="Select date range"
                    type="text"
                    className="pr-12 w-full h-12 rounded-full bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border-slate-200/60 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300 shadow-sm text-slate-900 dark:text-slate-100"
                    value={`${dateRange.startDate} ~ ${dateRange.endDate}`}
                    readOnly
                    onClick={e => {
                      e.preventDefault();
                      setShowDatePicker(true);
                    }}
                    onFocus={e => {
                      e.preventDefault();
                      setShowDatePicker(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDatePicker((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20"
                    aria-label="Open date picker"
                  >
                    <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  </button>
                  {showDatePicker && (
                    <div
                      ref={pickerRef}
                      className="absolute left-0 z-[10000] mt-2 rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50 dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-lg shadow-slate-300/30 dark:shadow-slate-900/30"
                    >
                      {/* Gradient orbs background - dark mode only */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl hidden dark:block">
                        <div
                          className="absolute -top-40 -left-32 w-[420px] h-[420px] bg-purple-500/10 rounded-full blur-3xl"
                        />
                        <div
                          className="absolute -bottom-40 -right-32 w-[420px] h-[420px] bg-violet-500/10 rounded-full blur-3xl"
                        />
                      </div>

                      {/* Noise texture overlay - dark mode only */}
                      <div
                        className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl hidden dark:block"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'repeat',
                        }}
                      />

                      {/* Top accent line - dark mode only */}
                      <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60 hidden dark:block" />

                      <div className="relative p-2">
                        <DateRange
                          ranges={[
                            {
                              startDate: new Date(tempRange.startDate),
                              endDate: new Date(tempRange.endDate),
                              key: 'selection',
                            },
                          ]}
                          onChange={ranges => {
                            const { startDate, endDate } = ranges.selection;
                            const safeStart = startDate || new Date();
                            const safeEnd = endDate || safeStart;
                            setTempRange({
                              startDate: format(safeStart, 'yyyy-MM-dd'),
                              endDate: format(safeEnd, 'yyyy-MM-dd'),
                            });
                          }}
                          moveRangeOnFirstSelection={false}
                          editableDateInputs={false}
                          maxDate={new Date()}
                          showMonthAndYearPickers
                          rangeColors={['#a855f7']} // purple-500 for gradient
                          direction="vertical"
                        />

                        <div className="flex justify-end gap-2 border-t border-slate-200/60 dark:border-slate-700/50 bg-transparent dark:bg-transparent px-4 py-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTempRange({ ...dateRange });
                              setShowDatePicker(false);
                            }}
                            className="cursor-pointer rounded-xl px-4 py-2 text-sm transition-colors duration-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setDateRange({ ...tempRange });
                              // Check if the selected range matches a preset, otherwise reset filter
                              const today = new Date();
                              const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
                              const yearStart = fmt(startOfYear(today));
                              const yearEnd = fmt(endOfYear(today));
                              const last15Start = fmt(subDays(today, 14));
                              const last30Start = fmt(subDays(today, 29));
                              const monthStart = fmt(startOfMonth(today));
                              const monthEnd = fmt(endOfMonth(today));

                              if (tempRange.startDate === yearStart && tempRange.endDate === yearEnd) {
                                setActiveFilter('year');
                              } else if (tempRange.startDate === last15Start && tempRange.endDate === fmt(today)) {
                                setActiveFilter('15days');
                              } else if (tempRange.startDate === last30Start && tempRange.endDate === fmt(today)) {
                                setActiveFilter('30days');
                              } else if (tempRange.startDate === monthStart && tempRange.endDate === monthEnd) {
                                setActiveFilter('month');
                              } else {
                                setActiveFilter(null);
                              }
                              setCurrentPage(1);
                              setShowDatePicker(false);
                            }}
                            className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 border-0 bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white shadow-md shadow-purple-500/30"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full md:w-auto md:ml-auto">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Quick Filters
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['year', '15days', '30days', 'month'] as const).map((filterType) => {
                    const isActive = activeFilter === filterType && !isCustomDateRange();
                    const labels: Record<Exclude<FilterType, null>, string> = {
                      year: 'Current Year',
                      '15days': 'Last 15 Days',
                      '30days': 'Last 30 Days',
                      month: 'Current Month',
                    };
                    return (
                      <Button
                        key={filterType}
                        variant={isActive ? 'default' : 'outline'}
                        onClick={() => handleFilter(filterType)}
                        className={`cursor-pointer rounded-xl px-4 py-2 text-sm transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white border-0 shadow-md shadow-purple-500/30 dark:shadow-purple-500/20'
                            : 'border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80'
                        }`}
                      >
                        {labels[filterType]}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 3: Checkbox Filters */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center">
                <Checkbox
                  id="non-executed-checkbox"
                  checked={showNonExecuted}
                  onCheckedChange={checked => setShowNonExecuted(!!checked)}
                  className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-400 data-[state=checked]:!text-white transition-colors duration-150"
                />
                <Label
                  htmlFor="non-executed-checkbox"
                  className="cursor-pointer text-slate-700 dark:text-slate-300 text-sm flex items-center font-normal ml-2"
                >
                  Show only non-executed trades
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="w-64 max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl">
                      <div className="text-slate-600 dark:text-slate-300">
                        This filter shows trades marked as "not executed" due to reasons such as emotions, discipline errors, or other factors. These trades are <span className="font-semibold">not</span> included in your statistics.
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>

              <div className="flex items-center">
                <Checkbox
                  id="partial-trades-checkbox"
                  checked={showPartialTrades}
                  onCheckedChange={checked => setShowPartialTrades(!!checked)}
                  className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-400 data-[state=checked]:!text-white transition-colors duration-150"
                />
                <Label
                  htmlFor="partial-trades-checkbox"
                  className="cursor-pointer text-slate-700 dark:text-slate-300 text-sm flex items-center font-normal ml-2"
                >
                  Show only partial trades
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="w-64 max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl">
                    <div className="text-slate-600 dark:text-slate-300">
                      This filter shows trades where partial profits were taken during the trade execution.
                    </div>
                  </TooltipContent>
                </Tooltip>
              </Label>
              </div>
            </div>
          </div>

          {exporting && (
            <div className="w-5/12 mx-auto mb-6 relative z-10">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Exporting {paginatedTotalCount} trades ...({Math.round(exportProgress)}%)</div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-violet-600 transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Trades Table Card - same design as analytics page cards */}
          <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
            <div className="relative overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
                <thead className="bg-transparent border-b border-slate-300 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Market</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Direction</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Setup</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Outcome</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Risk</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Trade</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Liquidity</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-slate-200/30 dark:divide-slate-700/30">
                  {allTradesError ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-red-600 dark:text-red-400 text-sm font-semibold">
                            Failed to load trades: {(allTradesError as Error).message}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : allTradesLoading && allTrades.length === 0 ? (
                    // Skeleton rows
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={`skeleton-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-20" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-16" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-16" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-12" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-20" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-12" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-20" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-20" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-20" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-24" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    paginatedTrades.map((trade: Trade) => (
                    <tr key={trade.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{trade.trade_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300" suppressHydrationWarning>{formatTradeTimeForDisplay(trade.trade_time)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{trade.market}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{trade.direction}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{trade.setup_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1">
                          <Badge
                            className={`shadow-none border-none outline-none ring-0 ${
                              trade.trade_outcome === 'Win'
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                                : 'bg-gradient-to-br from-rose-500 to-rose-300 text-white'
                            }`}
                          >
                            {trade.trade_outcome}
                          </Badge>
                          {trade.break_even && (
                            <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-slate-400 to-slate-600 text-white">
                              BE
                            </Badge>
                          )}
                          {!trade.executed && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white cursor-pointer">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-4">
                                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  </svg>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl">
                                <div className="text-slate-600 dark:text-slate-300">Not executed trade</div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {trade.launch_hour && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white cursor-pointer">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" d="M12 8v4l2 2"/>
                                    <rect x="11" y="2" width="2" height="3" rx="1" fill="currentColor"/>
                                    <rect x="11" y="19" width="2" height="3" rx="1" fill="currentColor"/>
                                  </svg>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl">
                                <div className="text-slate-600 dark:text-slate-300">Launch Hour trade</div>  
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {trade.partials_taken && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-blue-400 to-blue-600 text-white cursor-pointer">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
                                  </svg>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl">
                                <div className="text-slate-600 dark:text-slate-300">Partial profits taken</div>  
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{trade.risk_per_trade}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {trade.trade_link ? (
                          <a
                            href={trade.trade_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors"
                          >
                            View Trade
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">No link</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {trade.liquidity_taken ? (
                          <a
                            href={trade.liquidity_taken}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors"
                          >
                            View Liquidity
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
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
                          <span className="text-slate-400 dark:text-slate-500">No notes</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            openModal(trade);
                          }}
                          className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline font-medium transition-colors"
                        >
                          Trade Details
                        </a>
                      </td>
                    </tr>
                    ))
                  )}
                  {!allTradesLoading && paginatedTrades.length === 0 && activeAccount && (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-slate-600 dark:text-slate-400 text-sm">
                            No trades found for the selected filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination Controls */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{(paginatedCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {Math.min(paginatedCurrentPage * ITEMS_PER_PAGE, paginatedTotalCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-900 dark:text-slate-100">{paginatedTotalCount}</span> trades
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={paginatedCurrentPage === 1}
                className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginatedTotalPages))}
                disabled={paginatedCurrentPage === paginatedTotalPages}
                className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0 disabled:opacity-60"
              >
                <span className="relative z-10">Next</span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </div>
          </div>

          {/* Modals */}
          {selectedTrade && (
            <TradeDetailsModal
              isOpen={isModalOpen}
              onClose={closeModal}
              trade={selectedTrade}
              onTradeUpdated={() => {
                queryClient.invalidateQueries({ predicate: (q) => (q.queryKey?.[0] as string) === 'allTrades' });
              }}
            />
          )}

          <NotesModal
            isOpen={isNotesModalOpen}
            onClose={closeNotesModal}
            notes={selectedNotes}
          />
        </div>
      </TooltipProvider>
  );
}