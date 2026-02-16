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
import { deleteStrategy } from '@/lib/server/strategies';
import { Strategy } from '@/types/strategy';
import { Trade } from '@/types/trade';
import { useQueryClient } from '@tanstack/react-query';
import { Target } from 'lucide-react';

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
      queryClient.invalidateQueries({ queryKey: ['strategy-trades'] });
      queryClient.invalidateQueries({ queryKey: ['all-strategy-trades'] });
      queryClient.invalidateQueries({ queryKey: ['all-strategy-stats'] });
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
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-700/50 shadow-sm">
            <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Strategies
          </h1>
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
