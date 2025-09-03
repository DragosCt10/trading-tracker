'use client';

import { useEffect, useState, useRef } from 'react';
import { Trade } from '@/types/trade';
import { useTradingMode } from '@/context/TradingModeContext';
import { useUserDetails } from '@/hooks/useUserDetails';
import Link from 'next/link';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import NotesModal from '@/components/NotesModal';
import { useQuery } from '@tanstack/react-query';
import { format, endOfMonth } from 'date-fns';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import DashboardLayout from '@/components/shared/layout/DashboardLayout';

const ITEMS_PER_PAGE = 10;

export default function TradesPage() {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Market filter state (must be before any code that uses it)
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ field: 'trade_date' | 'market' | 'outcome'; direction: 'asc' | 'desc' }>({
    field: 'trade_date',
    direction: 'asc'
  });

  const { mode, activeAccount, isLoading: modeLoading } = useTradingMode();
  const { data: userDetails, isLoading: userLoading } = useUserDetails();

  // Replace startDate/endDate with dateRange
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

  // Single query: always fetch all trades for the date range (no backend pagination)
  const {
    data: allTradesData,
    isLoading: allTradesLoading,
    error: allTradesError,
    refetch: refetchAllTrades
  } = useQuery({
    queryKey: ['allTrades', mode, activeAccount?.id, dateRange.startDate, dateRange.endDate, userDetails?.user?.id],
    queryFn: async () => {
      if (!userDetails?.user || !activeAccount?.id) {
        throw new Error('User not authenticated or no active account');
      }
      const supabase = (await import('@/utils/supabase/client')).createClient();
      let query = supabase
        .from(`${mode}_trades`)
        .select('*')
        .eq('user_id', userDetails.user.id)
        .eq('account_id', activeAccount.id);
      if (dateRange.startDate) query = query.gte('trade_date', dateRange.startDate);
      if (dateRange.endDate) query = query.lte('trade_date', dateRange.endDate);
      query = query.order('trade_date', { ascending: false })

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !modeLoading && !userLoading && !!activeAccount?.id && !!userDetails?.user
  });

  // Market options (from all trades loaded for dropdown)
  const tradesForMarketDropdown = allTradesData || [];
  const uniqueMarkets = Array.from(new Set(tradesForMarketDropdown.map(trade => trade.market))).filter(Boolean);

  // Table data and pagination logic (always client-side)
  const allTrades = allTradesData || [];
  const filteredTrades = selectedMarket === 'all' ? allTrades : allTrades.filter(trade => trade.market === selectedMarket);
  
  // Apply sorting
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (sortConfig.field === 'outcome') {
      // Special handling for outcome sorting
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
    
    // For date sorting, we want descending order by default
    if (sortConfig.field === 'trade_date') {
      return sortConfig.direction === 'asc' 
        ? new Date(bValue).getTime() - new Date(aValue).getTime()
        : new Date(aValue).getTime() - new Date(bValue).getTime();
    }
    
    // For other fields (like market)
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

  // Close picker on outside click
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
    setDateRange({
      startDate: initialStartDate,
      endDate: initialEndDate,
    });
    setCurrentPage(1);
    setSelectedMarket('all');
  };

  // Reset to page 1 when market filter changes
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

  const totalPages = Math.ceil(paginatedTotalCount / ITEMS_PER_PAGE);

  const exportToCSV = async () => {
    // Export only the trades currently visible in the table (paginatedTrades)
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

  if (modeLoading || allTradesLoading || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div role="status">
          <svg aria-hidden="true" className="w-8 h-8 text-stone-200 animate-spin fill-stone-800" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
          </svg>
        </div>
        <p className="ml-4 text-stone-600">Loading...</p>
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <DashboardLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-12 w-12 text-stone-400"
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
          <h2 className="text-xl font-semibold text-stone-900 mb-2">No Active Account</h2>
          <p className="text-stone-600 mb-6">
            Please set up and activate an account for {mode} mode to view your trades.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
          >
            Go to Settings
          </a>
        </div>
      </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="max-w-7xl mx-auto py-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Trades</h1>
          <p className="text-sm text-stone-500 mt-1">
            Viewing trades for {mode} mode
          </p>
        </div>
        <Link
          href="/trades/new"
          className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
        >
          Add New Trade
        </Link>
      </div>

      {/* Market Filter Dropdown */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="market-filter" className="text-sm font-medium text-stone-700">Filter by Market:</label>
          <select
            id="market-filter"
            value={selectedMarket}
            onChange={e => setSelectedMarket(e.target.value)}
            className="w-48 bg-white border border-stone-200 text-stone-800 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Markets</option>
            {uniqueMarkets.map(market => (
              <option key={market} value={market}>{market}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-by" className="text-sm font-medium text-stone-700">Sort by:</label>
          <select
            id="sort-by"
            value={sortConfig.field}
            onChange={e => {
              const field = e.target.value as 'trade_date' | 'market' | 'outcome';
              setSortConfig(prev => ({
                field,
                direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
              }));
            }}
            className="w-48 bg-white border border-stone-200 text-stone-800 rounded-lg px-3 py-2 text-sm"
          >
            <option value="trade_date">Date</option>
            <option value="market">Market</option>
            <option value="outcome">Outcome</option>
          </select>
        </div>
      </div>

      {/* Filters Card */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-6 flex flex-col gap-4">
         <div className="flex flex-row gap-4 w-full">
          <div className="flex-1">
            <label className="block text-sm font-medium text-stone-700 mb-1">Date Range</label>
            <div className="relative w-72">
              <input
                ref={inputRef}
                placeholder="Select date range"
                type="text"
                className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer pr-10"
                value={`${dateRange.startDate} ~ ${dateRange.endDate}`}
                readOnly
                onClick={(e) => {
                  e.preventDefault();
                  setShowDatePicker(true);
                }}
                onFocus={(e) => {
                  e.preventDefault();
                  setShowDatePicker(true);
                }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowDatePicker(v => !v)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                </svg>
              </span>
              {showDatePicker && (
                <div ref={pickerRef} className="absolute shadow-lg rounded-lg z-50 mt-2 left-0 date-range-popup">
                  {/* ← UPDATED to use tempRange + Apply/Cancel */}
                  <DateRange
                    ranges={[{
                      startDate: new Date(tempRange.startDate),
                      endDate:   new Date(tempRange.endDate),
                      key: 'selection',
                    }]}
                    onChange={(ranges) => {
                      const { startDate, endDate } = ranges.selection;
                      setTempRange({
                        startDate: format(startDate as Date, 'yyyy-MM-dd'),
                        endDate:   format(endDate   as Date, 'yyyy-MM-dd'),
                      });
                    }}
                    moveRangeOnFirstSelection={false}
                    editableDateInputs
                    maxDate={new Date()}
                    showMonthAndYearPickers
                    rangeColors={['#333']}
                    direction="vertical"
                  />

                  <div className="flex justify-end gap-2 p-2 bg-white">
                    <button
                      className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-white to-white border-stone-200 text-stone-700 rounded-lg hover:bg-gradient-to-b hover:from-stone-50 hover:to-stone-50 hover:border-stone-200 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-1px_0px_rgba(0,0,0,0.20)] after:pointer-events-none transition antialiased"
                      onClick={() => {
                        // discard changes
                        setTempRange({ ...dateRange });
                        setShowDatePicker(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
                      onClick={() => {
                        // commit changes, reset to page 1, and close picker
                        setDateRange({ ...tempRange });
                        setCurrentPage(1);
                        setShowDatePicker(false);
                      }}
                    >
                      Apply
                    </button>
                  </div>


                </div>
              )}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
            >
              Export Trades
            </button>
            <button
              onClick={clearFilters}
              className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-white to-white border-stone-200 text-stone-700 rounded-lg hover:bg-gradient-to-b hover:from-stone-50 hover:to-stone-50 hover:border-stone-200 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-1px_0px_rgba(0,0,0,0.20)] after:pointer-events-none transition antialiased"
            >
              Current Month
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const startOfYear = `${now.getFullYear()}-01-01`;
                const endOfYear = `${now.getFullYear()}-12-31`;
                setDateRange({ startDate: startOfYear, endDate: endOfYear });
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-white to-white border-stone-200 text-stone-700 rounded-lg hover:bg-gradient-to-b hover:from-stone-50 hover:to-stone-50 hover:border-stone-200 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-1px_0px_rgba(0,0,0,0.20)] after:pointer-events-none transition antialiased"
            >
              Current Year
            </button>
          </div>
        </div>


        {exporting && (
          <div className="w-5/12 mx-auto mt-4">
            <div className="text-sm text-stone-600 mb-1">Exporting {paginatedTotalCount} trades ...({Math.round(exportProgress)}%)</div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-800 transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Trades Table Card */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Market</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Direction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Setup</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Outcome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Risk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Trade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Liquidity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
              {paginatedTrades.map((trade: Trade) => (
                <tr key={trade.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.trade_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.trade_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.market}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.direction}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.setup_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        trade.trade_outcome === 'Win' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.trade_outcome}
                      </span>
                      {trade.break_even && (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-stone-200 text-stone-800">BE</span>
                      )}
                      {!trade.executed && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800 relative group cursor-help">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-stone-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                            Not executed trade
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-stone-800"></div>
                          </div>
                        </span>
                      )}
                      {trade.launch_hour && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800 relative group cursor-help">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                            <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" d="M12 8v4l2 2"/>
                            <rect x="11" y="2" width="2" height="3" rx="1" fill="currentColor"/>
                            <rect x="11" y="19" width="2" height="3" rx="1" fill="currentColor"/>
                          </svg>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-stone-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                            Launch Hour trade
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-stone-800"></div>
                          </div>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.risk_per_trade}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                    {trade.trade_link ? (
                      <a
                        href={trade.trade_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-700 hover:text-stone-900 underline"
                      >
                        View Trade
                      </a>
                    ) : (
                      <span className="text-stone-400">No link</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                    {trade.liquidity_taken ? (
                      <a
                        href={trade.liquidity_taken}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-700 hover:text-stone-900 underline"
                      >
                        View Liquidity
                      </a>
                    ) : (
                      <span className="text-stone-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                    {trade.notes ? (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          openNotesModal(trade.notes || '');
                        }}
                        className="text-stone-700 hover:text-stone-900 underline"
                      >
                        View Notes
                      </a>
                    ) : (
                      <span className="text-stone-400">No notes</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        openModal(trade);
                      }}
                      className="text-stone-700 hover:text-stone-900 underline"
                    >
                      View Details
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-stone-700">
          Showing <span className="font-medium">{(paginatedCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
          <span className="font-medium">
            {Math.min(paginatedCurrentPage * ITEMS_PER_PAGE, paginatedTotalCount)}
          </span>{' '}
          of <span className="font-medium">{paginatedTotalCount}</span> trades
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={paginatedCurrentPage === 1}
            className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center transition-all ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm bg-transparent relative text-stone-700 hover:text-stone-700 border-stone-500 hover:bg-transparent duration-150 hover:border-stone-600 rounded-lg hover:opacity-60 hover:shadow-none"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginatedTotalPages))}
            disabled={paginatedCurrentPage === paginatedTotalPages}
            className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
          >
            Next
          </button>
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
    </DashboardLayout>
  );
}