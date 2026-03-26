'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useStrategies } from '@/hooks/useStrategies';
import { useStrategyClientContext } from '@/hooks/useStrategyClientContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TRADES_DATA } from '@/constants/queryConfig';
import { queryKeys } from '@/lib/queryKeys';
import { getStrategiesOverview, type StrategiesOverviewResult } from '@/lib/server/strategiesOverview';
import type { AccountRow, AccountMode } from '@/lib/server/accounts';
import type { Strategy } from '@/types/strategy';
import { StrategyCard } from '@/components/dashboard/strategy/StrategyCard';
import { AddStrategyCard } from '@/components/dashboard/strategy/AddStrategyCard';
import { Card } from '@/components/ui/card';
import { CreateStrategyModal } from '@/components/CreateStrategyModal';
import { EditStrategyModal } from '@/components/EditStrategyModal';
import { deleteStrategy, permanentlyDeleteStrategy, getInactiveStrategies, reactivateStrategy } from '@/lib/server/strategies';
import { Target, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getCurrencySymbolFromAccount } from '@/utils/accountOverviewHelpers';
import { computeStrategiesAccountTotals } from '@/utils/strategiesAccountTotals';
import { cn, formatPercent } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';

type SortByOption = 'default' | 'winRate' | 'totalRR' | 'totalTrades';

interface StrategiesClientProps {
  /** Pre-resolved server-side active account — eliminates client-side account resolution delay. */
  initialActiveAccount?: AccountRow | null;
  /** Pre-resolved server-side mode — passed to useStrategyClientContext. */
  initialMode?: AccountMode;
  /** Pre-fetched strategies — seeds the TanStack Query cache to skip the client fetch. */
  initialStrategies?: Strategy[];
  /** Pre-fetched overview stats — used as initialData for the overview query. */
  initialOverview?: StrategiesOverviewResult;
}

const DEFAULT_DESCRIPTION =
  'Track your Stats Boards, each with its own metrics, and monitor your overall performance.';

const SORT_BY_OPTIONS: Array<{ value: SortByOption; label: string }> = [
  { value: 'default', label: 'Default order' },
  { value: 'winRate', label: 'Win rate (high → low)' },
  { value: 'totalRR', label: 'RR total (high → low)' },
  { value: 'totalTrades', label: 'Total trades (high → low)' },
];

/** Same border, background, and blur as `StrategyCard` root `<Card>`. */
const STRATEGY_CARD_SURFACE =
  'relative overflow-hidden border shadow-none backdrop-blur-sm border-slate-300/40 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-800/30';

function getStrategySortMetric(
  overview: StrategiesOverviewResult[string] | undefined,
  sortBy: Exclude<SortByOption, 'default'>
): number {
  if (!overview) return Number.NEGATIVE_INFINITY;
  if (sortBy === 'winRate') return overview.winRate;
  if (sortBy === 'totalRR') return overview.totalRR;
  return overview.totalTrades;
}

export function StrategiesClient({
  initialActiveAccount,
  initialMode,
  initialStrategies,
  initialOverview,
}: StrategiesClientProps = {}) {
  // queryClient must be obtained before the cache-seeding block below.
  const queryClient = useQueryClient();
  // Tracks whether the one-time seed has already fired. A ref (not state)
  // so the flag survives re-renders without causing another render cycle.
  const hasSeededRef = useRef(false);

  const {
    userId,
    userLoading,
    mode,
    activeAccount: selectedAccount,
  } = useStrategyClientContext({
    initialUserId: '',
    initialMode: initialMode ?? 'live',
    initialActiveAccount: initialActiveAccount ?? null,
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

  // One-shot cache seed: write server-pre-fetched data into the TanStack Query
  // cache so the first render finds data immediately (isFetching stays false).
  //
  // Why a ref instead of just an account-ID guard?
  //   useStrategies uses `enabled: !cached` — once any value is written into a
  //   cache key it never auto-fetches that key again (staleTime: Infinity).
  //   Without the ref, every re-render with a new activeAccount would re-evaluate
  //   the ID guard, and on the render where the new account's key is empty the
  //   guard would pass and write initialStrategies (the *original* account's
  //   data) into the new account's key, permanently poisoning that cache.
  //
  // The ref fires exactly once per component lifetime. After the first
  // successful seed, any account switch produces a clean (empty) cache key,
  // and the normal query fetch path takes over.
  if (!hasSeededRef.current && userId && activeAccount?.id && activeAccount.id === initialActiveAccount?.id) {
    hasSeededRef.current = true;
    if (initialStrategies && initialStrategies.length > 0) {
      const strategiesKey = queryKeys.strategies(userId, activeAccount.id);
      if (!queryClient.getQueryData(strategiesKey)) {
        queryClient.setQueryData(strategiesKey, initialStrategies);
      }
    }
    if (initialOverview && Object.keys(initialOverview).length > 0 && mode) {
      const overviewKey = queryKeys.strategiesOverview(userId, activeAccount.id, mode);
      if (!queryClient.getQueryData(overviewKey)) {
        queryClient.setQueryData(overviewKey, initialOverview);
      }
    }
  }

  const { strategies, strategiesLoading, refetchStrategies } = useStrategies({ userId, accountId: activeAccount?.id });
  const { isPro } = useSubscription({ userId: userId ?? undefined });
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isArchivedSheetOpen, setIsArchivedSheetOpen] = useState(false);
  const [reactivatingStrategyId, setReactivatingStrategyId] = useState<string | null>(null);
  const [deletingStrategyId, setDeletingStrategyId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortByOption>('default');

  const currencySymbol = useMemo(
    () => getCurrencySymbolFromAccount(activeAccount ?? undefined),
    [activeAccount]
  );

  const accountDescription = DEFAULT_DESCRIPTION;

  // Fetch per-strategy aggregated stats + equity curves via a single RPC call.
  // Replaces the old bulk getFilteredTrades() which paginated N×500-item pages.
  const {
    data: strategiesOverview,
    isFetching: tradesLoading,
    /** First fetch with no cached data yet — prefer this over isPending so skeleton shows until the first result lands. */
    isLoading: strategiesOverviewInitialLoading,
  } = useQuery<StrategiesOverviewResult>({
    queryKey: queryKeys.strategiesOverview(userId, activeAccount?.id, mode),
    queryFn: async () => {
      if (!activeAccount?.id) return {};
      return getStrategiesOverview(activeAccount.id, mode);
    },
    // Removed `strategies.length > 0` — that forced a sequential waterfall where
    // overview could only start after strategies finished. Overview returns {}
    // gracefully for empty strategy sets, so there's no need to gate on it.
    // initialOverview is seeded into the cache via setQueryData above (same as
    // strategies), so this query finds cached data on first mount and isFetching
    // stays false — no skeleton flash on browser refresh.
    enabled: !!userId && !!activeAccount?.id && !!mode,
    ...TRADES_DATA,
  });


  // Sort strategies by selected metric (highest first)
  const sortedStrategies = useMemo(() => {
    if (sortBy === 'default') return [...strategies];
    const metric = sortBy as Exclude<SortByOption, 'default'>;
    return [...strategies].sort((a, b) => {
      const valueA = getStrategySortMetric(strategiesOverview?.[a.id], metric);
      const valueB = getStrategySortMetric(strategiesOverview?.[b.id], metric);
      return valueB - valueA; // descending (highest first)
    });
  }, [strategies, strategiesOverview, sortBy]);

  const accountTotals = useMemo(
    () => computeStrategiesAccountTotals(strategies, strategiesOverview),
    [strategies, strategiesOverview]
  );

  /**
   * Skeleton until session + accounts + strategy list are ready, then (if any boards exist) overview RPC.
   * Avoids flashing "—" / "0" while userId/accountId are still resolving or strategies query is idle with [].
   */
  const showAccountTotalsLoading =
    isPro &&
    (userLoading ||
      accountsLoading ||
      strategiesLoading ||
      (strategies.length > 0 &&
        (strategiesOverviewInitialLoading || strategiesOverview === undefined)));

  // Fetch archived (inactive) strategies
  const {
    data: archivedStrategies,
    isLoading: archivedLoading,
    refetch: refetchArchived,
  } = useQuery<Strategy[]>({
    queryKey: queryKeys.archivedStrategies(userId),
    queryFn: async () => {
      if (!userId) return [];
      return getInactiveStrategies(userId);
    },
    enabled: !!userId && isArchivedSheetOpen,
    staleTime: 2 * 60_000, // 2 min — avoid refetch when reopening archived sheet
  });

  // Archived strategies are automatically deleted by Supabase pg_cron trigger
  // after 30 days. No client-side cleanup needed.

  const invalidateStrategiesOverview = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['strategies-overview'] });
  }, [queryClient]);

  const refreshStrategiesData = useCallback(() => {
    void refetchStrategies();
    void refetchArchived();
    invalidateStrategiesOverview();
  }, [invalidateStrategiesOverview, refetchArchived, refetchStrategies]);

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

  const handleDelete = useCallback(async (strategyId: string): Promise<void> => {
    if (!userId) return;
    const result = await deleteStrategy(strategyId, userId);
    if (!result.error) {
      refreshStrategiesData();
    }
  }, [refreshStrategiesData, userId]);

  const handleReactivate = useCallback(async (strategyId: string): Promise<void> => {
    if (!userId) return;
    setReactivatingStrategyId(strategyId);
    try {
      const result = await reactivateStrategy(strategyId, userId);
      if (!result.error) {
        refreshStrategiesData();
      }
    } finally {
      setReactivatingStrategyId(null);
    }
  }, [refreshStrategiesData, userId]);

  const handlePermanentDelete = useCallback(async (strategyId: string): Promise<void> => {
    if (!userId) return;
    setDeletingStrategyId(strategyId);
    try {
      const result = await permanentlyDeleteStrategy(strategyId, userId);
      if (!result.error) {
        refreshStrategiesData();
      }
    } finally {
      setDeletingStrategyId(null);
    }
  }, [refreshStrategiesData, userId]);


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl shadow-sm themed-header-icon-box">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {!activeAccount ? (
                  <span className="inline-block h-9 w-48 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                ) : (
                  activeAccount.name
                )}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {!activeAccount ? (
                  <span className="inline-block h-4 w-64 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                ) : (
                  accountDescription
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AlertDialog open={isArchivedSheetOpen} onOpenChange={setIsArchivedSheetOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex cursor-pointer items-center gap-2 h-8 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 text-xs sm:text-sm font-medium transition-colors duration-200"
                >
                  <Archive className="h-4 w-4" />
                  <span>Archived</span>
                </Button>
              </AlertDialogTrigger>
            <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl px-6 py-5">
              {/* Gradient orbs background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                <div
                  className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl"
                  style={{ animationDuration: '8s' }}
                />
                <div
                  className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl"
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
              <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

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
                    <div className="p-2 rounded-lg themed-header-icon-box">
                      <Archive className="h-5 w-5" />
                    </div>
                    <span>Archived Stats Boards</span>
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                    View and reactivate your archived Stats Boards. Reactivated Stats Boards will appear in your main Stats Center.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <Alert className="mb-4 rounded-xl border-slate-200/80 bg-slate-100/60 dark:border-slate-700/80 dark:bg-slate-800/40">
                  <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
                    Important: Archived Stats Boards and all related trades are automatically deleted after 30 days.
                  </AlertDescription>
                </Alert>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                  <div className="space-y-3">
                    {archivedLoading ? (
                      // Skeleton loader for archived strategies
                      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/60 dark:border-slate-300/50 bg-transparent">
                        <div className="flex-1 min-w-0">
                          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 mb-2 animate-pulse" />
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse" />
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                        </div>
                      </div>
                    ) : archivedStrategies && archivedStrategies.length > 0 ? (
                      archivedStrategies.map((strategy) => (
                        <div
                          key={strategy.id}
                          className="group flex items-center justify-between p-4 rounded-xl border border-slate-700/60 dark:border-slate-300/50 bg-transparent hover:bg-slate-100/30 dark:hover:bg-slate-800/30 hover:border-slate-600/80 dark:hover:border-slate-400/80 transition-all duration-200 cursor-pointer"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate transition-colors group-hover:[color:var(--tc-text)] dark:group-hover:[color:var(--tc-text-dark)]">
                              {strategy.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Archived on {new Date(strategy.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(strategy.id)}
                              disabled={reactivatingStrategyId === strategy.id || deletingStrategyId === strategy.id}
                              className="cursor-pointer relative h-8 overflow-hidden rounded-xl themed-btn-primary text-white font-semibold group/btn border-0 text-xs disabled:opacity-60 disabled:pointer-events-none [&_svg]:text-white px-3"
                            >
                              <span className="relative z-10 flex items-center justify-center gap-2 group-hover/btn:text-white">
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={reactivatingStrategyId === strategy.id || deletingStrategyId === strategy.id}
                                  className="relative cursor-pointer p-2 px-4.5 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 disabled:pointer-events-none h-8 w-8"
                                >
                                  <span className="relative z-10 flex items-center justify-center">
                                    {deletingStrategyId === strategy.id ? (
                                      <svg
                                        className="h-4 w-4 animate-spin"
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
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </span>
                                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <span className="text-slate-600 dark:text-slate-400">Are you sure you want to permanently delete &quot;{strategy.name}&quot;? This will also delete all trades linked to this strategy. This action cannot be undone.</span>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex gap-3">
                                  <AlertDialogCancel asChild>
                                    <Button
                                      variant="outline"
                                      disabled={deletingStrategyId === strategy.id}
                                      className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                                    >
                                      Cancel
                                    </Button>
                                  </AlertDialogCancel>
                                  <AlertDialogAction asChild>
                                    <Button
                                      variant="destructive"
                                      disabled={deletingStrategyId === strategy.id}
                                      onClick={() => handlePermanentDelete(strategy.id)}
                                      className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 flex items-center gap-2"
                                    >
                                      Yes, Delete
                                    </Button>
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
        </div>
      </div>

      {/* Sort strategies + account totals */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2" aria-label="Sort strategies">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Order by:</span>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortByOption)}>
            <SelectTrigger
              className="h-8 w-[10rem] rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 text-xs font-medium cursor-pointer transition-colors duration-200"
              aria-label="Sort by"
            >
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 cursor-pointer">
              {SORT_BY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isPro ? (
          <div
            className="flex flex-wrap items-center gap-2 sm:justify-end"
            aria-label="Account-wide stats for all Stats Boards (PRO)"
          >
            {showAccountTotalsLoading ? (
              <>
                <div className={cn('h-8 w-[11rem] rounded-xl animate-pulse', STRATEGY_CARD_SURFACE)} />
                <div className={cn('h-8 w-[9rem] rounded-xl animate-pulse', STRATEGY_CARD_SURFACE)} />
              </>
            ) : (
              <>
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 tabular-nums',
                    STRATEGY_CARD_SURFACE
                  )}
                >
                  <span className="text-slate-500 dark:text-slate-400 font-normal">Total Win rate:</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {accountTotals.winRatePct != null
                      ? `${formatPercent(accountTotals.winRatePct)}%`
                      : '—'}
                  </span>
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 tabular-nums',
                    STRATEGY_CARD_SURFACE
                  )}
                >
                  <span className="text-slate-500 dark:text-slate-400 font-normal">Total Trades:</span>
                  <span className="text-slate-900 dark:text-slate-100">{accountTotals.totalTrades}</span>
                </span>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategiesLoading ? (
          // Skeleton loaders — anatomy mirrors StrategyCard exactly so there's no
          // visual jump when real cards swap in.
          Array.from({ length: 3 }).map((_, i) => (
            <Card
              key={i}
              className="relative overflow-hidden border-slate-300/40 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm"
            >
              <div className="relative p-6 flex flex-col h-full">
                {/* Header: name + % badge + share button */}
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 animate-pulse" />
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-5 w-14 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                    <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                  </div>
                </div>

                {/* Chart */}
                <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4 animate-pulse" />

                {/* Metrics: Win rate (left) | Total RR / Avg RR / Profit (right) */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-14 animate-pulse" />
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-10 animate-pulse" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-baseline gap-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-14 animate-pulse" />
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-10 animate-pulse" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-12 animate-pulse" />
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-10 animate-pulse" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-10 animate-pulse" />
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Total trades */}
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4 animate-pulse" />

                {/* Extra stats cards section */}
                <div className="mb-4">
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-1.5 animate-pulse" />
                  <div className="flex flex-wrap gap-1">
                    <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                    <div className="h-5 w-28 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                  </div>
                </div>

                {/* Action buttons: Edit + Analytics | Delete */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                    <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                  </div>
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                </div>
              </div>
            </Card>
          ))
        ) : (
          <>
            {sortedStrategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                overviewStats={strategiesOverview?.[strategy.id]}
                accountId={activeAccount?.id ?? ''}
                mode={mode as 'live' | 'backtesting' | 'demo'}
                userId={userId!}
                currencySymbol={currencySymbol}
                accountBalance={activeAccount?.account_balance}
                onEdit={handleEdit}
                onDelete={handleDelete}
                // Only show loading while actually fetching data. A newly created strategy
                // without trades won't have an overview entry, but that's okay—it will show
                // "No trades yet" once loading completes.
                isLoading={tradesLoading}
              />
            ))}

            <AddStrategyCard onClick={() => setIsCreateModalOpen(true)} />
            <CreateStrategyModal
              accountId={activeAccount?.id}
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
              onCreated={handleCreateSuccess}
            />
          </>
        )}
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
