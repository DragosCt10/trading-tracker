'use client';

import { useEffect, useState, useRef } from 'react';
import { Trade } from '@/types/trade';
import { useUserDetails } from '@/hooks/useUserDetails';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import NotesModal from '@/components/NotesModal';
import { useQuery } from '@tanstack/react-query';
import { format, endOfMonth, startOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { DateRange } from 'react-date-range';
import AppLayout from '@/components/shared/layout/AppLayout';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';

// Import shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';

const ITEMS_PER_PAGE = 10;

export default function TradesPage() {
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

  const { selection } = useActionBarSelection();
  const { data: userDetails, isLoading: userLoading } = useUserDetails();

  const queryEnabled =
    !!selection.activeAccount?.id && !!userDetails?.user;

  const today = new Date();
  const initialStartDate = format(today, 'yyyy-MM-01');
  const initialEndDate = format(endOfMonth(today), 'yyyy-MM-dd');
  const [dateRange, setDateRange] = useState({
    startDate: initialStartDate,
    endDate: initialEndDate,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [tempRange, setTempRange] = useState({
    startDate: initialStartDate,
    endDate: initialEndDate,
  });

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

  const {
    data: allTradesData,
    isLoading: allTradesLoading,
    error: allTradesError,
    refetch: refetchAllTrades,
  } = useQuery<Trade[]>({
    queryKey: [
      'allTrades',
      selection.mode,
      selection.activeAccount?.id,
      dateRange.startDate,
      dateRange.endDate,
      userDetails?.user?.id,
    ],
    queryFn: async () => {
      if (!userDetails?.user || !selection.activeAccount?.id) {
        throw new Error('User not authenticated or no active account');
      }

      const supabase = (await import('@/utils/supabase/client')).createClient();

      let query = supabase
        .from(`${selection.mode}_trades`)
        .select('*')
        .eq('user_id', userDetails.user.id)
        .eq('account_id', selection.activeAccount.id);

      if (dateRange.startDate) query = query.gte('trade_date', dateRange.startDate);
      if (dateRange.endDate) query = query.lte('trade_date', dateRange.endDate);

      query = query.order('trade_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []) as Trade[];
    },
    enabled: queryEnabled,
    refetchOnMount: 'always'
  });


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

  // still waiting for user info
  // All three loading states render the same content; let's DRY it up with a function/component.

  function LoadingScreen() {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div role="status">
          <svg aria-hidden="true" className="w-8 h-8 text-slate-200 animate-spin fill-slate-800" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
          </svg>
        </div>
        <p className="ml-4 text-slate-600">Loading...</p>
      </div>
    );
  }

  if (userLoading || (!selection.activeAccount) || (queryEnabled && allTradesLoading)) {
    return <LoadingScreen />;
  }

  // optional: handle error
  if (allTradesError) {
    return (
      <AppLayout>
        <div className="p-8">
          <Card className="group relative max-w-2xl mx-auto overflow-hidden border-red-200/60 dark:border-red-700/50 bg-gradient-to-br from-white via-red-50/30 to-rose-50/20 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-lg shadow-red-200/50 dark:shadow-none backdrop-blur-sm transition-all duration-500 hover:shadow-xl hover:shadow-red-200/60 dark:hover:border-red-600/50 p-8 text-center">
            {/* Ambient glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 dark:from-red-500/10 dark:to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative">
              <div className="text-red-600 dark:text-red-400 font-semibold">
                Failed to load trades: {(allTradesError as Error).message}
              </div>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }


  if (!selection.activeAccount) {
    return (
      <AppLayout>
        <div className="p-8">
          <Card className="group relative max-w-2xl mx-auto overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:border-slate-600/50 p-8 text-center">
            {/* Ambient glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 dark:from-purple-500/10 dark:to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative">
              <div className="mb-6">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-2">No Active Account</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Please set up and activate an account for {selection.mode} mode to view your trades.
              </p>
              <Button asChild className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0">
                <a href="/settings">
                  <span className="relative z-10">Go to Settings</span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                </a>
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="max-w-(--breakpoint-xl) mx-auto py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">Trades</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
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

          {/* Filters Section */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="market-filter" className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Market:</label>
              <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                <SelectTrigger
                  id="market-filter"
                  className="w-full shadow-none sm:w-48 h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300 text-slate-900 dark:text-slate-100"
                >
                  <SelectValue placeholder="Market" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                  <SelectItem value="all">All Markets</SelectItem>
                  {uniqueMarkets.map(market => (
                    <SelectItem key={market} value={market}>{market}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center w-full sm:w-auto">
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

            <div className="flex items-center w-full sm:w-auto sm:ml-4">
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

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="sort-by" className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Sort by:</label>
              <Select value={sortConfig.field} onValueChange={value => {
                const field = value as 'trade_date' | 'market' | 'outcome';
                setSortConfig(prev => ({
                  field,
                  direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
                }));
              }}>
                <SelectTrigger id="sort-by" className="w-full shadow-none sm:w-48 h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                  <SelectItem value="trade_date">Date</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="outcome">Outcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters Card */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-4 w-full md:flex-row md:items-end">
              <div className="w-full md:flex-1">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date Range
                </label>
                <div className="relative w-full max-w-xs sm:w-72">
                  <Input
                    ref={inputRef}
                    placeholder="Select date range"
                    type="text"
                    className="pr-10 shadow-none w-full h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300 text-slate-900 dark:text-slate-100"
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
                  <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    onClick={() => setShowDatePicker(v => !v)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
                      />
                    </svg>
                  </span>
                  {showDatePicker && (
                    <div
                      ref={pickerRef}
                      className="absolute shadow-xl rounded-xl z-50 mt-2 left-0 date-range-popup bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    >
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
                          setTempRange({
                            startDate: format(startDate as Date, 'yyyy-MM-dd'),
                            endDate: format(endDate as Date, 'yyyy-MM-dd'),
                          });
                        }}
                        moveRangeOnFirstSelection={false}
                        editableDateInputs
                        maxDate={new Date()}
                        showMonthAndYearPickers
                        rangeColors={['#334155']}
                        direction="vertical"
                      />

                      <div className="flex justify-end gap-2 p-2 bg-white dark:bg-slate-900">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setTempRange({ ...dateRange });
                            setShowDatePicker(false);
                          }}
                          className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
                        >
                          Cancel
                        </Button>
                        <Button
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
                          className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0"
                        >
                          <span className="relative z-10">Apply</span>
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 md:mt-0 md:items-end">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Filter by:
                </span>
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
                        className={`cursor-pointer rounded-lg px-4 py-2 text-sm transition-colors duration-200 ${
                          isActive
                            ? 'bg-slate-800 text-slate-50 hover:bg-slate-900 border-slate-900 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
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

            {exporting && (
              <div className="w-5/12 mx-auto mt-4 relative z-10">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Exporting {paginatedTotalCount} trades ...({Math.round(exportProgress)}%)</div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-violet-600 transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Trades Table Card */}
          <Card className="relative overflow-hidden border border-slate-300 dark:border-slate-700 bg-transparent">
            <div className="relative overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/30 dark:divide-slate-700/30">
                <thead className="bg-transparent">
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
                  {paginatedTrades.map((trade: Trade) => (
                    <tr key={trade.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{trade.trade_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{trade.trade_time}</td>
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
                                <Badge className="bg-yellow-100 hover:bg-yellow-100 text-yellow-800 relative shadow-none cursor-pointer">
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
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline font-medium transition-colors"
                        >
                          View Details
                        </a>
                      </td>
                    </tr>
                  ))}
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
              onTradeUpdated={() => refetchAllTrades()}
            />
          )}

          <NotesModal
            isOpen={isNotesModalOpen}
            onClose={closeNotesModal}
            notes={selectedNotes}
          />
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}