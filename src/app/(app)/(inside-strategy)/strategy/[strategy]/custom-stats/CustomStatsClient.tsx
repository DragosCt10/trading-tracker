'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, Eye, Pencil, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatPercent, roundToCents } from '@/lib/utils';
import { useBECalc } from '@/contexts/BECalcContext';
import type { Trade } from '@/types/trade';
import type { Database } from '@/types/supabase';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { CustomStatConfig } from '@/types/customStats';
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
import { calculateWinRates } from '@/utils/calculateWinRates';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { getFilteredTrades } from '@/lib/server/trades';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';
import { getCurrencySymbolFromAccount } from '@/components/dashboard/analytics/AccountOverviewCard';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { buildEquityPointsFromTrades } from '@/components/dashboard/analytics/EquityCurveCard';
import { useSubscription } from '@/hooks/useSubscription';
import { applyCustomStatFilter, buildFilterPills } from '@/utils/applyCustomStatFilter';
import { buildPreviewTrade } from '@/utils/previewTrades';
import { updateStrategyCustomStats } from '@/lib/server/strategies';
import { CustomStatModal } from '@/components/CustomStatModal';
import { CustomStatDetailView } from '@/components/CustomStatDetailView';
import { CustomStatsSkeleton } from './CustomStatsSkeleton';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

interface CustomStatsClientProps {
  strategyId: string;
  strategyName: string;
  extraCards: ExtraCardKey[];
  savedCustomStats: CustomStatConfig[];
  savedSetupTypes: string[];
  savedLiquidityTypes: string[];
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
  initialTrades,
  initialActiveAccount,
  initialMode,
  initialUserId,
  currencySymbol: initialCurrencySymbol,
  accountBalance: initialAccountBalance,
}: CustomStatsClientProps) {
  const { data: userDetails } = useUserDetails();
  const { beCalcEnabled } = useBECalc();
  const { selection, setSelection } = useActionBarSelection();
  const queryClient = useQueryClient();
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

  const { data: rawTrades, isLoading: tradesLoading } = useQuery<Trade[]>({
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

  // Filters (date range only — market and execution are per-card via CustomStatFilter)
  const [dateRange, setDateRange] = useState<DateRangeState>(() => buildPresetRange('year').dateRange);
  const [activeFilter, setActiveFilter] = useState<FilterType>('year');

  const [mounted] = useState(() => typeof window !== 'undefined');

  // Preview data for non-Pro users
  const previewStats: CustomStatConfig[] = useMemo(() => [
    {
      id: 'preview-1',
      name: 'Long DAX Morning',
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
  }), []);

  // Custom stats state
  const [savedStats, setSavedStats] = useState<CustomStatConfig[]>(savedCustomStats);
  const [detailStatId, setDetailStatId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CustomStatConfig | null>(null);

  const isCustomRange = isCustomDateRange(dateRange);

  const earliestTradeDate = useMemo(() => {
    if (activeFilter !== 'all') return undefined;
    if (allTradesData.length === 0) return undefined;
    return allTradesData.reduce(
      (min: string, t: Trade) => (t.trade_date < min ? t.trade_date : min),
      allTradesData[0].trade_date
    );
  }, [activeFilter, allTradesData]);

  // Only filter by date range — market/execution are handled per-card by applyCustomStatFilter
  const filteredTrades = useMemo(
    () => allTradesData.filter(
      (t: Trade) => t.trade_date >= dateRange.startDate && t.trade_date <= dateRange.endDate
    ),
    [allTradesData, dateRange]
  );

  const handleFilterChange = useCallback((type: FilterType) => {
    setActiveFilter(type);
    const { dateRange: nextRange } = buildPresetRange(type);
    setDateRange(nextRange);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRangeValue) => {
    setDateRange(range);
  }, []);

  const persistStats = useCallback(
    async (nextStats: CustomStatConfig[]) => {
      setSavedStats(nextStats);
      await updateStrategyCustomStats(strategyId, userId, nextStats);
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies(userId) });
    },
    [strategyId, userId, queryClient]
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

  const handleDelete = useCallback(
    (id: string) => {
      const nextStats = savedStats.filter((s) => s.id !== id);
      persistStats(nextStats);
    },
    [savedStats, persistStats]
  );

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

  if (activeAccount && tradesLoading && !isInitialContext) {
    return (
      <TooltipProvider>
        <CustomStatsSkeleton />
      </TooltipProvider>
    );
  }

  if (detailStatId !== null && detailConfig) {
    return (
      <TooltipProvider>
        <CustomStatDetailView
          config={detailConfig}
          trades={detailTrades}
          currencySymbol={currencySymbol}
          accountBalance={accountBalance}
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

        {activeAccount && (
          <div className="mb-6">
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
                  Select an account from the toolbar above to view custom stats.
                </p>
              </div>
            </Card>
          )}

          {/* Small card grid — 3 per row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isPro ? savedStats : previewStats).map((config) => {
              const cardTrades = isPro
                ? applyCustomStatFilter(filteredTrades, config.filters)
                : (previewTradesMap[config.id] ?? []);
              const totalTrades = cardTrades.length;
              const { winRate, winRateWithBE } = calculateWinRates(cardTrades);
              const effectiveWinRate = beCalcEnabled ? winRateWithBE : winRate;
              const filterPills = buildFilterPills(config.filters);
              const visiblePills = filterPills.slice(0, 3);
              const extraPillCount = filterPills.length - visiblePills.length;
              const chartData = buildEquityPointsFromTrades(cardTrades);
              const totalPnL = cardTrades.reduce((sum, t) => sum + (t.calculated_profit ?? 0), 0);
              const pnlPercent = (totalPnL / (accountBalance || 1)) * 100;

              const cardContent = (
                <Card
                  key={config.id}
                  role="button"
                  tabIndex={isPro ? 0 : -1}
                  onClick={() => isPro && setDetailStatId(config.id)}
                  onKeyDown={(e) => {
                    if (isPro && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setDetailStatId(config.id);
                    }
                  }}
                  className={cn(
                    'rounded-2xl border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden relative transition-all duration-200',
                    isPro && 'hover:border-slate-400/60 dark:hover:border-slate-600/60 hover:shadow-lg cursor-pointer'
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
                    <div className="h-24 w-full px-3 pt-3">
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
                          <div className="inline-flex items-center gap-1.5">
                            {totalPnL >= 0 ? (
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                            )}
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                              totalPnL >= 0
                                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            }`}>
                              {totalPnL >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-end justify-between gap-4 mt-2">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Win Rate</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {formatPercent(effectiveWinRate)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Trades</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{totalTrades}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Net P&amp;L</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {totalPnL >= 0 ? '+' : ''}{currencySymbol}{roundToCents(totalPnL).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Filter pills */}
                      {filterPills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-3">
                          {visiblePills.map((pill) => (
                            <span
                              key={pill}
                              className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                            >
                              {pill}
                            </span>
                          ))}
                          {extraPillCount > 0 && (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400">
                              +{extraPillCount} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bottom action row */}
                      {isPro && (
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); handleEdit(config); }}
                              className="h-8 rounded-xl px-3 text-xs cursor-pointer transition-colors duration-200 border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); handleDelete(config.id); }}
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
                            onClick={(e) => { e.stopPropagation(); setDetailStatId(config.id); }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-2 transition-colors cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            View Details
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );

              if (!isPro) {
                return (
                  <Tooltip key={config.id} delayDuration={120}>
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
            })}

            {/* Add Card */}
            <button
              type="button"
              onClick={isPro ? handleAdd : undefined}
              className={cn(
                'rounded-2xl border-2 border-dashed py-8 flex flex-col items-center justify-center gap-2 transition-all duration-200 min-h-[200px]',
                isPro
                  ? 'border-slate-300/70 dark:border-slate-600/60 hover:border-slate-400/80 dark:hover:border-slate-500/70 hover:bg-slate-100/40 dark:hover:bg-slate-800/30 cursor-pointer'
                  : 'border-slate-200/50 dark:border-slate-700/40 opacity-60 cursor-not-allowed'
              )}
            >
              <Plus className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {isPro ? 'Add Custom Combination' : 'PRO feature — upgrade to create custom stats'}
              </span>
            </button>
          </div>
        </div>

        <CustomStatModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingConfig(null); }}
          onSave={handleSave}
          editing={editingConfig}
          extraCards={extraCards}
          setupOptions={savedSetupTypes}
          liquidityOptions={savedLiquidityTypes}
        />


      </div>
    </TooltipProvider>
  );
}
