'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStrategies } from '@/hooks/useStrategies';
import { useStrategyClientContext } from '@/hooks/useStrategyClientContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TRADES_DATA } from '@/constants/queryConfig';
import { queryKeys, TRADE_QUERY_PREFIXES } from '@/lib/queryKeys';
import { getStrategiesOverview, type StrategiesOverviewResult } from '@/lib/server/strategiesOverview';
import type { AccountRow, AccountMode } from '@/lib/server/accounts';
import type { Strategy } from '@/types/strategy';
import { CreateStrategyModal } from '@/components/CreateStrategyModal';
import { EditStrategyModal } from '@/components/EditStrategyModal';
import {
  deleteStrategy,
  permanentlyDeleteStrategy,
  reactivateStrategy,
} from '@/lib/server/strategies';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrencySymbolFromAccount } from '@/utils/accountOverviewHelpers';
import { computeStrategiesAccountTotals } from '@/utils/strategiesAccountTotals';
import { sortStrategies, type SortByOption } from '@/utils/strategySorting';
import { useSubscription } from '@/hooks/useSubscription';
import { StatsHeader } from './_components/StatsHeader';
import { StatsSortBar } from './_components/StatsSortBar';
import { StrategyGrid } from './_components/StrategyGrid';
import { ArchivedStrategiesDialog } from './_components/ArchivedStrategiesDialog';

interface StrategiesClientProps {
  /** Server-resolved user ID — eliminates the useUserDetails round-trip on first render. */
  initialUserId: string;
  /** Pre-resolved server-side active account — eliminates client-side account resolution delay. */
  initialActiveAccount: AccountRow | null;
  /** Pre-resolved server-side mode — passed to useStrategyClientContext. */
  initialMode: AccountMode;
  /** Pre-fetched strategies — seeds the TanStack Query cache to skip the client fetch. */
  initialStrategies: Strategy[];
  /** Pre-fetched overview stats — used as initialData for the overview query. */
  initialOverview: StrategiesOverviewResult;
}

export function StrategiesClient({
  initialUserId,
  initialActiveAccount,
  initialMode,
  initialStrategies,
  initialOverview,
}: StrategiesClientProps) {
  const queryClient = useQueryClient();

  // Seed the server pre-fetch into the TanStack Query cache exactly once at
  // mount. Lazy `useState` initializer runs before any other hooks, so the
  // `useStrategies` / overview `useQuery` calls below find the cached data on
  // first render and skip their initial network roundtrip. This is idempotent
  // and safe under React strict-mode double-invoke (the initializer runs once).
  useState(() => {
    if (initialUserId && initialActiveAccount?.id) {
      if (initialStrategies.length > 0) {
        const strategiesKey = queryKeys.strategies(initialUserId, initialActiveAccount.id);
        if (!queryClient.getQueryData(strategiesKey)) {
          queryClient.setQueryData(strategiesKey, initialStrategies);
        }
      }
      if (Object.keys(initialOverview).length > 0 && initialMode) {
        const overviewKey = queryKeys.strategiesOverview(
          initialUserId,
          initialActiveAccount.id,
          initialMode
        );
        if (!queryClient.getQueryData(overviewKey)) {
          queryClient.setQueryData(overviewKey, initialOverview);
        }
      }
    }
    return true;
  });

  const {
    userId,
    userLoading,
    mode,
    activeAccount: selectedAccount,
  } = useStrategyClientContext({
    initialUserId,
    initialMode,
    initialActiveAccount,
  });
  const { accounts, accountsLoading } = useAccounts({ userId, pendingMode: mode });
  const activeAccount = useMemo(
    () =>
      selectedAccount ??
      accounts.find((account) => account.is_active) ??
      accounts[0] ??
      null,
    [accounts, selectedAccount]
  );

  const { strategies, strategiesLoading, refetchStrategies } = useStrategies({
    userId,
    accountId: activeAccount?.id,
  });
  const { isPro } = useSubscription({ userId: userId ?? undefined });
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isArchivedSheetOpen, setIsArchivedSheetOpen] = useState(false);
  const [reactivatingStrategyId, setReactivatingStrategyId] = useState<string | null>(null);
  const [deletingStrategyId, setDeletingStrategyId] = useState<string | null>(null);
  const [crudError, setCrudError] = useState<string | null>(null);
  const [archiveRefreshKey, setArchiveRefreshKey] = useState(0);

  const [sortBy, setSortBy] = useState<SortByOption>('default');

  const currencySymbol = useMemo(
    () => getCurrencySymbolFromAccount(activeAccount ?? undefined),
    [activeAccount]
  );

  // Fetch per-strategy aggregated stats + equity curves via a single RPC call.
  // The cache is seeded via the lazy `useState` initializer above when the
  // (userId, accountId, mode) tuple matches the server pre-fetch, so the first
  // render finds cached data and isFetching stays false — no skeleton flash.
  const {
    data: strategiesOverview,
    isLoading: strategiesOverviewInitialLoading,
  } = useQuery<StrategiesOverviewResult>({
    queryKey: queryKeys.strategiesOverview(userId, activeAccount?.id, mode),
    queryFn: async () => {
      if (!activeAccount?.id) return {};
      return getStrategiesOverview(activeAccount.id, mode);
    },
    enabled: !!userId && !!activeAccount?.id && !!mode,
    ...TRADES_DATA,
  });

  // Sort strategies by selected metric. Returns input reference unchanged in default mode.
  const sortedStrategies = useMemo(
    () => sortStrategies(strategies, sortBy, strategiesOverview),
    [strategies, strategiesOverview, sortBy]
  );

  const accountTotals = useMemo(
    () => computeStrategiesAccountTotals(strategies, strategiesOverview),
    [strategies, strategiesOverview]
  );

  const showAccountTotalsLoading =
    isPro &&
    (userLoading ||
      accountsLoading ||
      strategiesLoading ||
      (strategies.length > 0 &&
        (strategiesOverviewInitialLoading || strategiesOverview === undefined)));

  const invalidateStrategiesOverview = useCallback(() => {
    if (!userId || !activeAccount?.id) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.strategiesOverview(userId, activeAccount.id, mode),
    });
  }, [queryClient, userId, activeAccount?.id, mode]);

  const refreshStrategiesData = useCallback(() => {
    void refetchStrategies();
    if (isArchivedSheetOpen) {
      setArchiveRefreshKey((k) => k + 1);
    }
    invalidateStrategiesOverview();
  }, [invalidateStrategiesOverview, isArchivedSheetOpen, refetchStrategies]);

  const handleCreateSuccess = useCallback(() => {
    setIsCreateModalOpen(false);
    void refetchStrategies();
    invalidateStrategiesOverview();
  }, [invalidateStrategiesOverview, refetchStrategies]);

  const handleEdit = useCallback((strategy: Strategy) => {
    setEditingStrategy(strategy);
    setIsEditModalOpen(true);
  }, []);

  const handleEditSuccess = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingStrategy(null);
    void refetchStrategies();
    invalidateStrategiesOverview();
  }, [invalidateStrategiesOverview, refetchStrategies]);

  const handleDelete = useCallback(
    async (strategyId: string): Promise<void> => {
      if (!userId) return;
      setCrudError(null);
      try {
        const result = await deleteStrategy(strategyId, userId);
        if (result.error) {
          console.error('[stats] deleteStrategy failed', result.error);
          setCrudError('Could not archive the Stats Board. Please try again.');
          return;
        }
        refreshStrategiesData();
      } catch (err) {
        console.error('[stats] deleteStrategy threw', err);
        setCrudError('Could not archive the Stats Board. Please try again.');
      }
    },
    [refreshStrategiesData, userId]
  );

  const handleReactivate = useCallback(
    async (strategyId: string): Promise<void> => {
      if (!userId) return;
      setCrudError(null);
      setReactivatingStrategyId(strategyId);
      try {
        const result = await reactivateStrategy(strategyId, userId);
        if (result.error) {
          console.error('[stats] reactivateStrategy failed', result.error);
          setCrudError('Could not reactivate the Stats Board. Please try again.');
          return;
        }
        refreshStrategiesData();
      } catch (err) {
        console.error('[stats] reactivateStrategy threw', err);
        setCrudError('Could not reactivate the Stats Board. Please try again.');
      } finally {
        setReactivatingStrategyId(null);
      }
    },
    [refreshStrategiesData, userId]
  );

  const handlePermanentDelete = useCallback(
    async (strategyId: string): Promise<void> => {
      if (!userId) return;
      setCrudError(null);
      setDeletingStrategyId(strategyId);
      try {
        const result = await permanentlyDeleteStrategy(strategyId, userId);
        if (result.error) {
          console.error('[stats] permanentlyDeleteStrategy failed', result.error);
          setCrudError('Could not permanently delete the Stats Board. Please try again.');
          return;
        }
        refreshStrategiesData();
        // Permanent delete cascade-deletes trades — clear all trade caches
        void queryClient.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) && TRADE_QUERY_PREFIXES.has(q.queryKey[0] as string),
        });
      } catch (err) {
        console.error('[stats] permanentlyDeleteStrategy threw', err);
        setCrudError('Could not permanently delete the Stats Board. Please try again.');
      } finally {
        setDeletingStrategyId(null);
      }
    },
    [refreshStrategiesData, userId, queryClient]
  );

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <StatsHeader
        activeAccount={activeAccount}
        isArchivedSheetOpen={isArchivedSheetOpen}
        onOpenArchived={() => setIsArchivedSheetOpen(true)}
      />

      {crudError ? (
        <Alert
          role="alert"
          aria-live="polite"
          className="rounded-xl border-red-300/60 bg-red-50/70 dark:border-red-800/60 dark:bg-red-950/30"
        >
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
          <AlertDescription className="flex items-center justify-between gap-2 text-sm text-red-800 dark:text-red-200">
            <span>{crudError}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCrudError(null)}
              aria-label="Dismiss error"
              className="h-6 w-6 shrink-0 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <StatsSortBar
        sortBy={sortBy}
        onSortChange={setSortBy}
        isPro={isPro}
        showAccountTotalsLoading={!!showAccountTotalsLoading}
        accountTotals={accountTotals}
      />

      <StrategyGrid
        strategies={sortedStrategies}
        strategiesLoading={strategiesLoading}
        strategiesOverview={strategiesOverview}
        overviewLoading={strategiesOverviewInitialLoading}
        activeAccount={activeAccount}
        mode={mode}
        userId={userId ?? ''}
        currencySymbol={currencySymbol}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={() => setIsCreateModalOpen(true)}
        reservedCardCount={initialStrategies.length + 1}
      />

      <CreateStrategyModal
        accountId={activeAccount?.id}
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreated={handleCreateSuccess}
      />

      <EditStrategyModal
        strategy={editingStrategy}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onUpdated={handleEditSuccess}
      />

      <ArchivedStrategiesDialog
        open={isArchivedSheetOpen}
        onOpenChange={setIsArchivedSheetOpen}
        userId={userId ?? ''}
        onReactivate={handleReactivate}
        onPermanentDelete={handlePermanentDelete}
        reactivatingStrategyId={reactivatingStrategyId}
        deletingStrategyId={deletingStrategyId}
        refreshKey={archiveRefreshKey}
      />
    </div>
  );
}
