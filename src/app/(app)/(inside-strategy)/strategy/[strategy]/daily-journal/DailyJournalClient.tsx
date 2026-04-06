'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useBECalc } from '@/contexts/BECalcContext';
import type { Trade } from '@/types/trade';
import type { Database } from '@/types/supabase';
import { TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import NotesModal from '@/components/NotesModal';
import { useStrategyClientContext } from '@/hooks/useStrategyClientContext';
import { useStrategyAllTimeTrades } from '@/hooks/useStrategyAllTimeTrades';
import { useTradeFilters } from '@/hooks/useTradeFilters';
import { applyTradeClientFilters } from '@/utils/applyTradeClientFilters';
import { getCurrencySymbolFromAccount } from '@/utils/accountOverviewHelpers';
import { DailyJournalSkeleton } from './DailyJournalSkeleton';
import { DayCard } from './DayCard';
import type { DayGroup } from './DayCard';
import { useSubscription } from '@/hooks/useSubscription';
import { buildPreviewTrade } from '@/utils/previewTrades';
import { SavedTag } from '@/types/saved-tag';

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
  savedTags?: SavedTag[];
}

import { buildDayChartData, buildDayGroup } from './dailyJournalUtils';

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
  savedTags,
}: DailyJournalClientProps) {
  const { beCalcEnabled } = useBECalc();
  const { userId, mode, activeAccount, isInitialContext } = useStrategyClientContext({
    initialUserId,
    initialMode,
    initialActiveAccount,
  });
  const { isPro, isError: subscriptionError, refetchSubscription } = useSubscription({ userId });
  const { allTradesData, tradesLoading, tradesError, refetchTrades } = useStrategyAllTimeTrades({
    userId,
    activeAccountId: activeAccount?.id,
    mode,
    strategyId,
    isPro,
    initialTrades,
    isInitialContext,
  });

  const currencySymbol = activeAccount
    ? getCurrencySymbolFromAccount(activeAccount)
    : initialCurrencySymbol;
  const accountBalance = activeAccount?.account_balance ?? initialAccountBalance;

  // Infinite scroll for days (mirrors TradeCardsView behavior)
  const [displayedCount, setDisplayedCount] = useState(DAYS_PER_LOAD);
  const [mounted, setMounted] = useState(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Per-day collapse state
  const [openByDate, setOpenByDate] = useState<Record<string, boolean>>({});

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string>('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);

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
    return [buildDayGroup(date, previewTrades, accountBalance)];
  }, [accountBalance]);

  const nonProEarliestSource = useMemo(
    () => lockedPreviewDayGroups.flatMap((g) => g.trades),
    [lockedPreviewDayGroups]
  );

  const {
    dateRange,
    activeFilter,
    selectedMarket,
    setSelectedMarket,
    executionFilter,
    markets,
    isCustomRange,
    earliestTradeDate,
    handleFilterChange,
    handleDateRangeChange,
    handleExecutionChange,
  } = useTradeFilters({
    tradesForMarkets: allTradesData,
    tradesForEarliestDate: isPro ? allTradesData : nonProEarliestSource,
  });

  const filteredTrades = useMemo(
    () =>
      applyTradeClientFilters({
        trades: allTradesData,
        dateRange,
        selectedMarket,
        executionFilter,
      }),
    [allTradesData, dateRange, executionFilter, selectedMarket]
  );

  // Group trades by day
  const dayGroups: DayGroup[] = useMemo(() => {
    const byDate: Record<string, Trade[]> = {};
    for (const trade of filteredTrades) {
      const key = trade.trade_date;
      (byDate[key] ??= []).push(trade);
    }

    return Object.entries(byDate)
      .sort(([d1], [d2]) => (d1 < d2 ? 1 : -1)) // newest first
      .map(([date, trades]) => buildDayGroup(date, trades, accountBalance));
  }, [filteredTrades, accountBalance]);

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

      {activeAccount && tradesError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          Failed to load all strategy trades.{' '}
          <button
            type="button"
            onClick={() => {
              void refetchTrades();
            }}
            className="cursor-pointer underline underline-offset-2"
          >
            Try again
          </button>
          .
        </div>
      )}

      {subscriptionError && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Could not verify your subscription status.{' '}
          <button
            type="button"
            onClick={() => {
              void refetchSubscription();
            }}
            className="cursor-pointer underline underline-offset-2"
          >
            Try again
          </button>
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
        {displayedDayGroups.map((group, index) => (
          <DayCard
            key={group.date}
            group={group}
            isOpen={openByDate[group.date] ?? index === 0}
            isPro={isPro}
            currencySymbol={currencySymbol}
            beCalcEnabled={beCalcEnabled}
            mounted={mounted}
            onToggle={toggleDay}
            onOpenTradeDetails={openTradeDetails}
            onOpenNotes={openNotesModal}
          />
        ))}

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
          savedTags={savedTags}
        />
      )}
      <NotesModal isOpen={isNotesOpen} onClose={closeNotesModal} notes={selectedNotes} />
      </div>
    </TooltipProvider>
  );
}
