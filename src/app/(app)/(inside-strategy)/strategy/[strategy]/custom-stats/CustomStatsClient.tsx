'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Crown, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn, formatPercent, roundToCents } from '@/lib/utils';
import { useBECalc } from '@/contexts/BECalcContext';
import type { Trade } from '@/types/trade';
import type { Database } from '@/types/supabase';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { CustomStatConfig } from '@/types/customStats';
import { CARD_BASE_CLASSES } from '@/constants/styles';
import { TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { calculateWinRates } from '@/utils/calculateWinRates';
import { queryKeys } from '@/lib/queryKeys';
import { useStrategyClientContext } from '@/hooks/useStrategyClientContext';
import { useStrategyAllTimeTrades } from '@/hooks/useStrategyAllTimeTrades';
import { useTradeFilters } from '@/hooks/useTradeFilters';
import { getCurrencySymbolFromAccount } from '@/utils/accountOverviewHelpers';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { buildEquityPointsFromTrades } from '@/utils/equityPoints';
import { useSubscription } from '@/hooks/useSubscription';
import { applyCustomStatFilter } from '@/utils/applyCustomStatFilter';
import { buildPreviewTrade } from '@/utils/previewTrades';
import { updateStrategyCustomStats } from '@/lib/server/strategies';
import { CustomStatModal } from '@/components/CustomStatModal';
import { CustomStatDetailView } from '@/components/CustomStatDetailView';
import { CustomStatsCardsSkeleton } from './CustomStatsSkeleton';
import { FilterPillList } from '@/components/shared/FilterPillList';
import { PnLBadge } from '@/components/shared/PnLBadge';
import type { SavedTag } from '@/types/saved-tag';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

// ---------------------------------------------------------------------------
// Per-card memoized component
// Each card computes its own metrics so that editing one card's filters only
// recalculates that card — not all cards at once.
// ---------------------------------------------------------------------------

interface CustomStatCardItemProps {
  config: CustomStatConfig;
  filteredTrades: Trade[];
  isPro: boolean;
  previewTrades: Trade[] | undefined;
  beCalcEnabled: boolean;
  accountBalance: number | null;
  currencySymbol: string;
  mounted: boolean;
  savedTags: SavedTag[];
  onEdit: (config: CustomStatConfig) => void;
  onDelete: (id: string) => void;
  onDetail: (id: string) => void;
}

const CustomStatCardItem = memo(function CustomStatCardItem({
  config,
  filteredTrades,
  isPro,
  previewTrades,
  beCalcEnabled,
  accountBalance,
  currencySymbol,
  mounted,
  savedTags,
  onEdit,
  onDelete,
  onDetail,
}: CustomStatCardItemProps) {
  const cardTrades = useMemo(
    () => isPro ? applyCustomStatFilter(filteredTrades, config.filters) : (previewTrades ?? []),
    [isPro, filteredTrades, config.filters, previewTrades]
  );
  const { winRate, winRateWithBE } = useMemo(() => calculateWinRates(cardTrades), [cardTrades]);
  const effectiveWinRate = beCalcEnabled ? winRateWithBE : winRate;
  const chartData = useMemo(() => buildEquityPointsFromTrades(cardTrades), [cardTrades]);
  const totalPnL = useMemo(
    () => cardTrades.reduce((sum, t) => sum + (t.calculated_profit ?? 0), 0),
    [cardTrades]
  );
  const pnlPercent = (totalPnL / (accountBalance || 1)) * 100;
  const hasTrades = cardTrades.length > 0;
  const canNavigate = isPro && hasTrades;

  const cardContent = (
    <Card
      role={canNavigate ? 'button' : undefined}
      tabIndex={canNavigate ? 0 : -1}
      onClick={() => canNavigate && onDetail(config.id)}
      onKeyDown={(e) => {
        if (canNavigate && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onDetail(config.id);
        }
      }}
      className={cn(
        CARD_BASE_CLASSES, 'overflow-hidden relative transition-all duration-200',
        canNavigate && 'hover:border-slate-400/60 dark:hover:border-slate-600/60 hover:shadow-lg cursor-pointer'
      )}
    >
      {!isPro && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px] rounded-2xl" />
          <span className="absolute right-3 top-3 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> PRO
          </span>
        </>
      )}

      <div className={cn(!isPro && 'blur-[3px] opacity-70 pointer-events-none select-none')}>
        {/* Equity chart */}
        <div className="h-30 w-full px-3 pt-3">
          <EquityCurveChart
            data={chartData}
            currencySymbol={currencySymbol}
            hasTrades={cardTrades.length > 0}
            isLoading={!mounted}
            variant="card"
            hideAxisLabels
          />
        </div>

        {/* Card info */}
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 min-w-0">
              {config.name}
            </p>
            <div className="flex items-start shrink-0">
              <PnLBadge value={pnlPercent} size="xs" />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-end justify-between gap-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Win Rate</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatPercent(effectiveWinRate)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Trades</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cardTrades.length}</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Net P&amp;L</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {totalPnL >= 0 ? '+' : ''}{currencySymbol}{roundToCents(totalPnL).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Filter pills */}
          <div className="mt-3">
            <FilterPillList filters={config.filters} savedTags={savedTags} maxVisible={3} />
          </div>

          {/* Bottom action row */}
          {isPro && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onEdit(config); }}
                  className="h-8 rounded-xl px-3 text-xs cursor-pointer transition-colors duration-200 border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onDelete(config.id); }}
                  className="relative h-8 w-8 p-0 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 border-0 disabled:opacity-60 transition-all duration-300 group cursor-pointer"
                  aria-label="Delete custom stat"
                >
                  <span className="relative z-10 flex h-full w-full items-center justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                </Button>
              </div>
              <button
                type="button"
                disabled={!hasTrades}
                onClick={(e) => { e.stopPropagation(); if (hasTrades) onDetail(config.id); }}
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 transition-colors',
                  hasTrades
                    ? 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer'
                    : 'text-slate-400 dark:text-slate-600 cursor-not-allowed no-underline'
                )}
              >
                <Eye className="h-3 w-3" />
                {hasTrades ? 'View Details' : 'No trades'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (!isPro) {
    return (
      <Tooltip delayDuration={120}>
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

  return cardContent;
});

// ---------------------------------------------------------------------------

interface CustomStatsClientProps {
  strategyId: string;
  strategyName: string;
  extraCards: ExtraCardKey[];
  savedCustomStats: CustomStatConfig[];
  savedSetupTypes: string[];
  savedLiquidityTypes: string[];
  savedTags: SavedTag[];
  initialTrades: Trade[];
  initialActiveAccount: AccountRow | null;
  initialMode: 'live' | 'demo' | 'backtesting';
  initialUserId: string;
  currencySymbol: string;
  accountBalance: number | null;
}

export default function CustomStatsClient({
  strategyId,
  strategyName,
  extraCards,
  savedCustomStats,
  savedSetupTypes,
  savedLiquidityTypes,
  savedTags,
  initialTrades,
  initialActiveAccount,
  initialMode,
  initialUserId,
  currencySymbol: initialCurrencySymbol,
  accountBalance: initialAccountBalance,
}: CustomStatsClientProps) {
  const { beCalcEnabled } = useBECalc();
  const queryClient = useQueryClient();
  const { userId, mode, activeAccount, isInitialContext } = useStrategyClientContext({
    initialUserId,
    initialMode,
    initialActiveAccount,
  });
  const { isPro } = useSubscription({ userId });
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Preview data for non-Pro users
  const previewStats: CustomStatConfig[] = useMemo(() => [
    {
      id: 'preview-1',
      name: 'Long DAX Morning',
      filters: { direction: 'Long', market: 'DAX', trade_time: '06:00' },
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'preview-2',
      name: 'Long DAX Morning (Preview)',
      filters: { direction: 'Long', market: 'DAX', trade_time: '06:00' },
      created_at: '2026-01-01T00:00:00Z',
    },
  ], []);

  const previewTradesMap = useMemo<Record<string, Trade[]>>(() => ({
    'preview-1': [
      buildPreviewTrade({ id: 'p1-1', trade_outcome: 'Win', calculated_profit: 150, direction: 'Long' }),
      buildPreviewTrade({ id: 'p1-2', trade_outcome: 'Win', calculated_profit: 200, direction: 'Long' }),
      buildPreviewTrade({ id: 'p1-3', trade_outcome: 'Lose', calculated_profit: -100, direction: 'Long' }),
      buildPreviewTrade({ id: 'p1-4', trade_outcome: 'Win', calculated_profit: 180, direction: 'Long' }),
      buildPreviewTrade({ id: 'p1-5', trade_outcome: 'Lose', calculated_profit: -90, direction: 'Long' }),
    ],
    'preview-2': [
      buildPreviewTrade({ id: 'p2-1', trade_outcome: 'Win', calculated_profit: 120, direction: 'Long' }),
      buildPreviewTrade({ id: 'p2-2', trade_outcome: 'Win', calculated_profit: 100, direction: 'Long' }),
      buildPreviewTrade({ id: 'p2-3', trade_outcome: 'Lose', calculated_profit: -200, direction: 'Long' }),
      buildPreviewTrade({ id: 'p2-4', trade_outcome: 'Win', calculated_profit: 120, direction: 'Long' }),
      buildPreviewTrade({ id: 'p2-5', trade_outcome: 'Lose', calculated_profit: -60, direction: 'Long' }),
    ],
  }), []);

  // URL-based detail view navigation
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const detailStatId = searchParams.get('detail');

  const setDetailStatId = useCallback((id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set('detail', id);
    } else {
      params.delete('detail');
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  // Custom stats state
  const [savedStats, setSavedStats] = useState<CustomStatConfig[]>(savedCustomStats);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CustomStatConfig | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    dateRange,
    activeFilter,
    isCustomRange,
    earliestTradeDate,
    handleFilterChange,
    handleDateRangeChange,
  } = useTradeFilters({
    initialExecution: 'all',
    tradesForMarkets: allTradesData,
  });

  // Only filter by date range — market/execution are handled per-card by applyCustomStatFilter
  const filteredTrades = useMemo(
    () => allTradesData.filter(
      (t: Trade) => t.trade_date >= dateRange.startDate && t.trade_date <= dateRange.endDate
    ),
    [allTradesData, dateRange]
  );

  const persistStats = useCallback(
    async (nextStats: CustomStatConfig[]) => {
      const previousStats = savedStats;
      setSavedStats(nextStats);
      setSaveError(null);
      try {
        const result = await updateStrategyCustomStats(strategyId, userId, nextStats);
        if (result.error) {
          throw result.error;
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.strategies(userId) });
      } catch (error) {
        console.error('Failed to persist custom stats:', error);
        setSavedStats(previousStats);
        setSaveError('Failed to save custom stat. Please try again.');
      }
    },
    [savedStats, strategyId, userId, queryClient]
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

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTargetId) return;
    const nextStats = savedStats.filter((s) => s.id !== deleteTargetId);
    persistStats(nextStats);
    setDeleteTargetId(null);
  }, [deleteTargetId, savedStats, persistStats]);

  const handleEdit = useCallback((config: CustomStatConfig) => {
    setEditingConfig(config);
    setIsModalOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingConfig(null);
    setIsModalOpen(true);
  }, []);

  // Detail modal data
  const detailConfig = useMemo(
    () => (isPro ? savedStats : previewStats).find((s) => s.id === detailStatId) ?? null,
    [isPro, savedStats, previewStats, detailStatId]
  );
  const detailTrades = useMemo(
    () => (detailConfig ? applyCustomStatFilter(filteredTrades, detailConfig.filters) : []),
    [detailConfig, filteredTrades]
  );

  const displayedStats = isPro ? savedStats : previewStats;

  const deleteTargetConfig = savedStats.find((s) => s.id === deleteTargetId);

  if (detailStatId && detailConfig) {
    return (
      <TooltipProvider>
        <CustomStatDetailView
          config={detailConfig}
          trades={detailTrades}
          currencySymbol={currencySymbol}
          accountBalance={accountBalance}
          savedTags={savedTags}
          onBack={() => setDetailStatId(null)}
        />
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

        {activeAccount && tradesError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
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

        <div className="space-y-6 mt-6">
          {!activeAccount && (
            <Card className={cn(CARD_BASE_CLASSES, 'py-10 px-6 flex items-center justify-center text-center')}>
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

          {/* Small card grid — 3 per row */}
          {activeAccount && tradesLoading && !isInitialContext ? (
            <CustomStatsCardsSkeleton />
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedStats.map((config) => (
              <CustomStatCardItem
                key={config.id}
                config={config}
                filteredTrades={filteredTrades}
                isPro={isPro}
                previewTrades={previewTradesMap[config.id]}
                beCalcEnabled={beCalcEnabled}
                accountBalance={accountBalance}
                currencySymbol={currencySymbol}
                mounted={mounted}
                savedTags={savedTags}
                onEdit={handleEdit}
                onDelete={setDeleteTargetId}
                onDetail={setDetailStatId}
              />
            ))}

            {/* Add Card */}
            <button
              type="button"
              onClick={isPro ? handleAdd : undefined}
              className={cn(
                'relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 p-6 flex flex-col items-center justify-center',
                isPro
                  ? 'border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                  : 'border-slate-200/50 dark:border-slate-700/40 opacity-60 cursor-not-allowed'
              )}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 themed-header-icon-box">
                <Plus className="w-8 h-8" />
              </div>
              <span className={cn(isPro ? "text-base" : "text-sm", "font-medium text-slate-500 dark:text-slate-400")}>
                {isPro ? 'Add Custom Combination' : 'PRO feature - Upgrade to create custom stats'}
              </span>
            </button>
          </div>
          )}
        </div>

        {saveError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {saveError}{' '}
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="cursor-pointer underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <CustomStatModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingConfig(null); }}
          onSave={handleSave}
          editing={editingConfig}
          extraCards={extraCards}
          setupOptions={savedSetupTypes}
          liquidityOptions={savedLiquidityTypes}
          tagOptions={savedTags.map((t) => t.name)}
        />

        <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
          <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                <span className="text-slate-600 dark:text-slate-400">
                  Are you sure you want to delete &ldquo;{deleteTargetConfig?.name}&rdquo;? This action cannot be undone.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-3">
              <AlertDialogCancel asChild>
                <Button
                  variant="outline"
                  onClick={() => setDeleteTargetId(null)}
                  className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 flex items-center gap-2"
                >
                  Yes, Delete
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </TooltipProvider>
  );
}
