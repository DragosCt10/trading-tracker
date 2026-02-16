'use client';

import React, { useState, useEffect } from 'react';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useStrategies } from '@/hooks/useStrategies';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useAccounts } from '@/hooks/useAccounts';
import { useQuery } from '@tanstack/react-query';
import { getFilteredTrades, getStrategyStatsFromTrades } from '@/lib/server/trades';
import { StrategyCard } from '@/components/dashboard/strategy/StrategyCard';
import { AddStrategyCard } from '@/components/dashboard/strategy/AddStrategyCard';
import { CreateStrategyModal } from '@/components/CreateStrategyModal';
import { EditStrategyModal } from '@/components/EditStrategyModal';
import { deleteStrategy, getInactiveStrategies, reactivateStrategy } from '@/lib/server/strategies';
import { Strategy } from '@/types/strategy';
import { Trade } from '@/types/trade';
import { useQueryClient } from '@tanstack/react-query';
import { Target, Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function StrategiesClient() {
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;
  const { strategies, strategiesLoading, refetchStrategies } = useStrategies({ userId });
  const { selection } = useActionBarSelection();
  const mode = selection.mode;
  const { accounts } = useAccounts({ userId, pendingMode: mode });
  const queryClient = useQueryClient();
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isArchivedSheetOpen, setIsArchivedSheetOpen] = useState(false);
  const [reactivatingStrategyId, setReactivatingStrategyId] = useState<string | null>(null);

  // Get active account
  const activeAccount = accounts.find((a) => a.is_active) ?? accounts[0] ?? null;

  // Get currency symbol from active account
  const currencySymbol = activeAccount?.currency === 'USD' ? '$' : activeAccount?.currency === 'EUR' ? '€' : '£';

  // Fetch trades for each strategy (all years)
  const startDate = '2000-01-01'; // Very early date to fetch all trades
  const endDate = new Date().toISOString().split('T')[0]; // Today's date


  // Fetch trades for all strategies using a single query (for all years)
  const {
    data: allStrategyTrades,
    isFetching: tradesLoading,
  } = useQuery<Record<string, Trade[]>>({
    queryKey: ['all-strategy-trades', userId, activeAccount?.id, mode, 'all-years'],
    queryFn: async () => {
      if (!userId || !activeAccount?.id || strategies.length === 0) return {};
      
      const tradesMap: Record<string, Trade[]> = {};
      await Promise.all(
        strategies.map(async (strategy) => {
          try {
            const trades = await getFilteredTrades({
              userId,
              accountId: activeAccount.id,
              mode,
              startDate,
              endDate,
              strategyId: strategy.id,
            });
            tradesMap[strategy.id] = trades;
          } catch (err) {
            console.error(`Error fetching trades for strategy ${strategy.id}:`, err);
            tradesMap[strategy.id] = [];
          }
        })
      );
      return tradesMap;
    },
    enabled: !!userId && !!activeAccount?.id && !!mode && strategies.length > 0,
    staleTime: 0,
    gcTime: 5 * 60_000,
  });

  // Fetch aggregated stats from trades table for all strategies (dynamically based on mode)
  const {
    data: allStrategyStats,
    isFetching: statsLoading,
  } = useQuery<Record<string, { totalTrades: number; winRate: number; avgRR: number }>>({
    queryKey: ['all-strategy-stats', userId, activeAccount?.id, mode, strategies.map(s => s.id).join(',')],
    queryFn: async () => {
      if (!userId || !activeAccount?.id || !mode || strategies.length === 0) return {};
      
      const statsMap: Record<string, { totalTrades: number; winRate: number; avgRR: number }> = {};
      await Promise.all(
        strategies.map(async (strategy) => {
          try {
            const stats = await getStrategyStatsFromTrades({
              userId,
              accountId: activeAccount.id,
              strategyId: strategy.id,
              mode: mode as 'live' | 'backtesting' | 'demo',
            });
            if (stats) {
              statsMap[strategy.id] = stats;
            }
          } catch (err) {
            console.error(`Error fetching stats for strategy ${strategy.id}:`, err);
          }
        })
      );
      return statsMap;
    },
    enabled: !!userId && !!activeAccount?.id && !!mode && strategies.length > 0,
    staleTime: 0,
    gcTime: 5 * 60_000,
  });

  // Fetch archived (inactive) strategies
  const {
    data: archivedStrategies,
    isLoading: archivedLoading,
    refetch: refetchArchived,
  } = useQuery<Strategy[]>({
    queryKey: ['archived-strategies', userId],
    queryFn: async () => {
      if (!userId) return [];
      return getInactiveStrategies(userId);
    },
    enabled: !!userId && isArchivedSheetOpen,
    staleTime: 0,
  });

  // Ensure default strategy exists on mount
  useEffect(() => {
    if (userId && !strategiesLoading && strategies.length === 0) {
      // This will trigger ensureDefaultStrategy via getUserStrategies
      refetchStrategies();
    }
  }, [userId, strategiesLoading, strategies.length, refetchStrategies]);

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    refetchStrategies();
    queryClient.invalidateQueries({ queryKey: ['strategy-trades'] });
    queryClient.invalidateQueries({ queryKey: ['all-strategy-trades'] });
    queryClient.invalidateQueries({ queryKey: ['all-strategy-stats'] });
  };

  const handleEdit = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setEditingStrategy(null);
    refetchStrategies();
    queryClient.invalidateQueries({ queryKey: ['strategy-trades'] });
    queryClient.invalidateQueries({ queryKey: ['all-strategy-stats'] });
  };

  const handleDelete = async (strategyId: string): Promise<void> => {
    if (!userId) return;
    const result = await deleteStrategy(strategyId, userId);
    if (!result.error) {
      refetchStrategies();
      refetchArchived();
      queryClient.invalidateQueries({ queryKey: ['strategy-trades'] });
      queryClient.invalidateQueries({ queryKey: ['all-strategy-trades'] });
      queryClient.invalidateQueries({ queryKey: ['all-strategy-stats'] });
    }
  };

  const handleReactivate = async (strategyId: string): Promise<void> => {
    if (!userId) return;
    setReactivatingStrategyId(strategyId);
    try {
      const result = await reactivateStrategy(strategyId, userId);
      if (!result.error) {
        refetchStrategies();
        refetchArchived();
        queryClient.invalidateQueries({ queryKey: ['strategy-trades'] });
        queryClient.invalidateQueries({ queryKey: ['all-strategy-trades'] });
        queryClient.invalidateQueries({ queryKey: ['all-strategy-stats'] });
      }
    } finally {
      setReactivatingStrategyId(null);
    }
  };

  if (strategiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500 dark:text-slate-400">Loading strategies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-700/50 shadow-sm">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Strategies
            </h1>
          </div>
          <AlertDialog open={isArchivedSheetOpen} onOpenChange={setIsArchivedSheetOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
              >
                <Archive className="h-4 w-4" />
                <span>Archived</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-white via-purple-100/80 to-violet-100/70 dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-2xl px-6 py-5">
              {/* Gradient orbs background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                <div
                  className="absolute -top-40 -left-32 w-[420px] h-[420px] bg-purple-500/8 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse"
                  style={{ animationDuration: '8s' }}
                />
                <div
                  className="absolute -bottom-40 -right-32 w-[420px] h-[420px] bg-violet-500/8 dark:bg-violet-500/10 rounded-full blur-3xl animate-pulse"
                  style={{ animationDuration: '10s', animationDelay: '2s' }}
                />
              </div>

              {/* Noise texture overlay */}
              <div
                className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'repeat',
                }}
              />

              {/* Top accent line */}
              <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60" />

              <div className="relative flex flex-col h-full">
                {/* Close button */}
                <div className="absolute top-1 right-1 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsArchivedSheetOpen(false)}
                    className="rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span className="sr-only">Close</span>
                  </Button>
                </div>

                <AlertDialogHeader className="space-y-1.5 mb-4">
                  <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-700/50">
                      <Archive className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span>Archived Strategies</span>
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                    View and reactivate your archived trading strategies. Reactivated strategies will appear in your main strategies list.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                  <div className="space-y-3">
                    {archivedLoading ? (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                        <svg
                          className="h-8 w-8 animate-spin mx-auto mb-3 text-purple-600 dark:text-purple-400"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <p>Loading archived strategies...</p>
                      </div>
                    ) : archivedStrategies && archivedStrategies.length > 0 ? (
                      archivedStrategies.map((strategy) => (
                        <div
                          key={strategy.id}
                          className="group flex items-center justify-between p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:border-slate-300/80 dark:hover:border-slate-600/80 transition-all duration-200 cursor-pointer"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {strategy.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Archived on {new Date(strategy.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleReactivate(strategy.id)}
                            disabled={reactivatingStrategyId === strategy.id}
                            className="ml-4 flex-shrink-0 cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group/btn border-0 disabled:opacity-60"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                              {reactivatingStrategyId === strategy.id ? (
                                <svg
                                  className="h-4 w-4 animate-spin"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    className="opacity-25"
                                  />
                                  <path
                                    className="opacity-90"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4A4 4 0 004 12z"
                                  />
                                </svg>
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                              <span>Reactivate</span>
                            </span>
                            <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                        <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No archived strategies</p>
                        <p className="text-xs mt-1">Strategies you delete will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 ml-[52px]">
          Organize and track your trading strategies separately. Each strategy shows its own performance metrics and analytics.
        </p>
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strategy) => {
          const trades = allStrategyTrades?.[strategy.id] ?? [];
          // Use aggregated stats from trades table (dynamically based on mode)
          const aggregatedStats = allStrategyStats?.[strategy.id];

          return (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              trades={trades}
              aggregatedStats={aggregatedStats}
              currencySymbol={currencySymbol}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          );
        })}

        <AddStrategyCard onClick={() => setIsCreateModalOpen(true)} />
        <CreateStrategyModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onCreated={handleCreateSuccess}
        />
      </div>

      {/* Edit Modal */}
      <EditStrategyModal
        strategy={editingStrategy}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onUpdated={handleEditSuccess}
      />
    </div>
  );
}
