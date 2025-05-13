'use client';

import { useEffect, useState, useMemo } from 'react';
import { Trade } from '@/types/trade';
import { useTradingMode } from '@/context/TradingModeContext';
import { useUserDetails } from '@/hooks/useUserDetails';
import Link from 'next/link';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import NotesModal from '@/components/NotesModal';
import { useQuery } from '@tanstack/react-query';

const ITEMS_PER_PAGE = 10;

export default function TradesPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const { mode, activeAccount, isLoading: modeLoading } = useTradingMode();
  const { data: userDetails, isLoading: userLoading } = useUserDetails();

  // Fetch trades from backend API using React Query
  const {
    data: tradesData,
    isLoading: loading,
    error: queryError,
    refetch: refreshTrades
  } = useQuery({
    queryKey: ['trades', mode, activeAccount?.id, currentPage, startDate, endDate, userDetails?.user?.id],
    queryFn: async () => {
      if (!userDetails?.user || !activeAccount?.id) {
        throw new Error('User not authenticated or no active account');
      }
      const supabase = (await import('@/utils/supabase/client')).createClient();
      let query = supabase
        .from(`${mode}_trades`)
        .select('*', { count: 'exact' })
        .eq('user_id', userDetails.user.id)
        .eq('account_id', activeAccount.id);
      if (startDate) query = query.gte('trade_date', startDate);
      if (endDate) query = query.lte('trade_date', endDate);
      query = query.order('trade_date', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      return {
        trades: data || [],
        totalCount: count || 0
      };
    },
    enabled: !modeLoading && !userLoading && !!activeAccount?.id && !!userDetails?.user
  });

  const trades = tradesData?.trades || [];
  const totalCount = tradesData?.totalCount || 0;
  const error = queryError instanceof Error ? queryError.message : null;

  const filteredTrades = useMemo(() => {
    if (!startDate && !endDate) return trades;
    
    return trades.filter((trade: Trade) => {
      const tradeDate = new Date(trade.trade_date);
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return tradeDate >= start && tradeDate <= end;
      }
      
      if (startDate) {
        const start = new Date(startDate);
        return tradeDate >= start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        return tradeDate <= end;
      }
      
      return true;
    });
  }, [startDate, endDate, trades]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const exportToCSV = () => {
    // Create CSV header
    const headers = [
      'Date', 'Time', 'Day of Week', 'Market', 'Direction', 'Setup', 'Outcome', 
      'Risk %', 'Trade Link', 'Liquidity Taken', 'Local High/Low',
      'News Related', 'ReEntry', 'Break Even', 'MSS', 'Risk:Reward Ratio',
      'Risk:Reward Ratio Long', 'SL Size', 'Calculated Profit'
    ];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...filteredTrades.map((trade: Trade) => [
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
        trade.notes || ''
      ].join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trades_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (modeLoading || loading || userLoading) {
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

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!activeAccount) {
    return (
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
    );
  }

  return (
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

      {/* Filters Card */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-stone-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full py-2 px-3 border border-stone-200 rounded-lg hover:border-stone-300 focus:border-stone-400 focus:ring-none text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-stone-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full py-2 px-3 border border-stone-200 rounded-lg hover:border-stone-300 focus:border-stone-400 focus:ring-none text-sm"
          />
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
            Clear Filters
          </button>
        </div>
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
              {filteredTrades.map((trade: Trade) => (
                <tr key={trade.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.trade_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.trade_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.market}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.direction}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{trade.setup_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      trade.trade_outcome === 'Win' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.trade_outcome}
                    </span>
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
          Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
          <span className="font-medium">
            {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}
          </span>{' '}
          of <span className="font-medium">{totalCount}</span> trades
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center transition-all ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm bg-transparent relative text-stone-700 hover:text-stone-700 border-stone-500 hover:bg-transparent duration-150 hover:border-stone-600 rounded-lg hover:opacity-60 hover:shadow-none"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
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
          onTradeUpdated={() => refreshTrades()}
        />
      )}

      <NotesModal
        isOpen={isNotesModalOpen}
        onClose={closeNotesModal}
        notes={selectedNotes}
      />
    </div>
  );
}