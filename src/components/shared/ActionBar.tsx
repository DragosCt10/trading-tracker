'use client';

import * as React from 'react';
import clsx from 'clsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setActiveAccount, getAllAccountsForUser } from '@/lib/server/accounts';
import type { AccountRow } from '@/lib/server/accounts';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { STATIC_DATA } from '@/constants/queryConfig';

import { usePathname, useRouter } from 'next/navigation';
import { AccountModePopover } from '@/components/shared/AccountModePopover';
import type { TradingMode } from '@/types/trade';
import { EditAccountAlertDialog } from '../EditAccountAlertDialog';
import { CreateAccountAlertDialog } from '../CreateAccountModal';
import { setLastAccountPreference } from '@/utils/lastAccountCookie';
import { StrategySelectPopover } from '@/components/shared/StrategySelectPopover';
import { CreateStrategyModal } from '@/components/CreateStrategyModal';
import { useStrategies } from '@/hooks/useStrategies';
import { useSubscription } from '@/hooks/useSubscription';
import { queryKeys } from '@/lib/queryKeys';
import type { Strategy } from '@/types/strategy';
import { Plus } from 'lucide-react';

const MODE_LABELS: Record<TradingMode, string> = {
  live: 'Live',
  demo: 'Demo',
  backtesting: 'Backtesting',
};

const MODE_BADGE: Record<TradingMode, string> = {
  live: 'themed-badge-live',
  demo: 'themed-badge-demo',
  backtesting: 'themed-badge-backtesting',
};

/** Optional server-fetched initial data. When provided, hydrates TanStack cache so hooks use it without client fetch. */
export interface ActionBarInitialData {
  userDetails: { user: { id: string } | null; session: unknown } | null;
  mode: TradingMode;
  activeAccount: AccountRow | null;
  accountsForMode: AccountRow[];
  /** All accounts (all modes). When provided, avoids getAllAccountsForUser client fetch (audit 2.6). */
  allAccounts?: AccountRow[];
}

interface ActionBarProps {
  initialData?: ActionBarInitialData | null;
  /** When false, hide the Add account button (e.g. when it is shown in the mobile lateral menu). Default true. */
  showAddButton?: boolean;
}

export default function ActionBar({ initialData, showAddButton = true }: ActionBarProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const hydratedRef = useRef(false);

  // Hydrate TanStack cache from server-fetched initial data (before paint)
  useLayoutEffect(() => {
    if (!initialData || hydratedRef.current) return;
    const { userDetails, mode, activeAccount, accountsForMode, allAccounts: initialAll } = initialData;
    const uid = userDetails?.user?.id;
    if (uid) {
      queryClient.setQueryData(['userDetails'], userDetails);
      queryClient.setQueryData(['actionBar:selection'], { mode, activeAccount });
      queryClient.setQueryData(['accounts:list', uid, mode], accountsForMode);
      if (initialAll != null) {
        queryClient.setQueryData(['accounts:all', uid], initialAll);
      }
      hydratedRef.current = true;
    }
  }, [initialData, queryClient]);

  const { data: userDetails } = useUserDetails();
  const { selection, setSelection } = useActionBarSelection();
  const [applying, setApplying] = React.useState(false);
  const [isCreateStrategyOpen, setIsCreateStrategyOpen] = React.useState(false);
  const autoAppliedRef = useRef(false);

  const userId = userDetails?.user?.id;

  // One query for all accounts across all modes — powers the grouped dropdown.
  // initialData from layout/server avoids getAllAccountsForUser client fetch on first load (audit 2.6).
  const {
    data: allAccounts = [],
    isFetching: accountsLoading,
    refetch: refetchAccounts,
  } = useQuery<AccountRow[]>({
    queryKey: ['accounts:all', userId],
    enabled: !!userId,
    initialData: initialData?.allAccounts,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...STATIC_DATA,
    queryFn: async () => {
      if (!userId) return [];
      return getAllAccountsForUser(userId);
    },
  });

  // Group accounts by mode for the dropdown sections
  const accountsByMode = React.useMemo(() => {
    const map: Record<TradingMode, AccountRow[]> = { live: [], demo: [], backtesting: [] };
    for (const a of allAccounts) {
      if (a.mode in map) map[a.mode as TradingMode].push(a);
    }
    return map;
  }, [allAccounts]);

  const activeMode = selection.mode;
  const activeAccount = selection.activeAccount;

  // Resolve account display name from current user's list; fall back to activeAccount.name so
  // the trigger doesn't show the placeholder when we already know the account object.
  const accountDisplayName =
    activeAccount
      ? allAccounts.find((a) => a.id === activeAccount.id)?.name ?? activeAccount.name
      : null;

  // ---------- Apply helper (persist active account and invalidate trade queries)
  const applyWith = useCallback(
    async (mode: TradingMode, accountId: string | null) => {
      if (!userId) return;
      setApplying(true);
      try {
        const { data: activeAccountObj, error } = await setActiveAccount(mode, accountId);
        if (error) {
          console.error('setActiveAccount failed:', error.message);
          return;
        }
        const resolved =
          activeAccountObj ??
          (accountId ? allAccounts.find((a) => a.id === accountId) ?? null : null);
        setSelection({ mode, activeAccount: resolved });

        // Persist mode + index (no ids) so refresh restores same account
        if (resolved) {
          const listForMode = allAccounts.filter((a) => a.mode === mode);
          const index = listForMode.findIndex((a) => a.id === resolved.id);
          if (index >= 0) setLastAccountPreference(mode, index);
        }

        const keysToInvalidate = ['allTrades', 'filteredTrades', 'nonExecutedTrades', 'strategies-overview'];
        queryClient.invalidateQueries({
          predicate: (q) => keysToInvalidate.includes((q.queryKey?.[0] as string) ?? ''),
        });
        refetchAccounts();
      } finally {
        setApplying(false);
      }
    },
    [userId, allAccounts, queryClient, refetchAccounts, setSelection]
  );

  const handleAccountModeChange = useCallback(
    (sel: { mode: TradingMode; accountId: string | null; account?: AccountRow | null }) => {
      if (!sel.accountId) return;
      if (sel.accountId === activeAccount?.id && sel.mode === activeMode) return;
      applyWith(sel.mode, sel.accountId);
    },
    [activeAccount?.id, activeMode, applyWith]
  );

  // ---------- Auto-apply first available account on mount (live → demo → backtesting)
  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (!userId) return;
    if (selection.activeAccount) return;
    if (accountsLoading) return;

    const fallbackOrder: TradingMode[] = ['live', 'demo', 'backtesting'];
    let pick: AccountRow | undefined;
    let pickedMode: TradingMode = 'live';

    for (const mode of fallbackOrder) {
      const accounts = accountsByMode[mode];
      const found = accounts.find((a) => a.is_active) ?? accounts[0];
      if (found) {
        pick = found;
        pickedMode = mode;
        break;
      }
    }

    if (!pick) return;

    autoAppliedRef.current = true;
    applyWith(pickedMode, pick.id);
  }, [userId, accountsLoading, accountsByMode, applyWith, selection.activeAccount]);

  // Detect strategy page synchronously (no flash — no useEffect needed)
  const pathname = usePathname();
  const strategySlug = pathname?.match(/\/strategy\/([^/]+)/)?.[1] ?? null;
  const isStrategyPage = !!strategySlug;

  // Only fetch strategies when on a strategy page
  const { strategies, strategiesLoading } = useStrategies({
    userId: isStrategyPage ? userId : undefined,
    accountId: isStrategyPage ? (activeAccount?.id ?? undefined) : undefined,
  });

  const strategyOptions = strategies.map((s) => ({ id: s.id, name: s.name, slug: s.slug }));
  const accountId = activeAccount?.id ?? null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 min-w-0">
      {/* Mode badge — left of account/strategy selector */}
      <div
        title={`Current mode: ${activeMode}`}
        className={clsx(
          'flex items-center justify-center h-8 rounded-xl border px-2 sm:px-4 pointer-events-none shrink-0',
          'text-xs sm:text-sm font-medium',
          MODE_BADGE[activeMode]
        )}
      >
        <span className="leading-none">{MODE_LABELS[activeMode]}</span>
      </div>

      {isStrategyPage ? (
        /* Strategy page: show strategy switcher + add strategy button */
        <>
          {strategiesLoading || strategyOptions.length === 0 ? (
            /* Skeleton while strategies are loading */
            <div className="h-8 w-36 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ) : (
            <StrategySelectPopover
              strategies={strategyOptions}
              currentSlug={strategySlug ?? ''}
            />
          )}

          {showAddButton && (
            <>
              {strategiesLoading || strategyOptions.length === 0 ? (
                <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreateStrategyOpen(true)}
                  aria-label="Add strategy"
                  className="flex items-center justify-center h-8 w-8 rounded-xl themed-btn-primary text-white font-semibold border-0 overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 cursor-pointer relative"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                </button>
              )}
              <CreateStrategyModal
                accountId={accountId ?? undefined}
                open={isCreateStrategyOpen}
                onOpenChange={setIsCreateStrategyOpen}
                onCreated={(newStrategy) => {
                  setIsCreateStrategyOpen(false);
                  // Immediately update the cache with the new strategy — no network round-trip,
                  // no race condition between refetch and router.push.
                  const key = queryKeys.strategies(userId, accountId ?? undefined);
                  const cached = queryClient.getQueryData<Strategy[]>(key) ?? [];
                  if (!cached.some((s) => s.id === newStrategy.id)) {
                    queryClient.setQueryData(key, [...cached, newStrategy]);
                  }
                  router.push(`/strategy/${newStrategy.slug}`);
                }}
              />
            </>
          )}
        </>
      ) : (
        /* Normal pages: account selector + edit/add */
        <>
          <AccountModePopover
            userId={userId}
            value={{
              mode: activeMode,
              accountId: activeAccount?.id ?? null,
              account: activeAccount,
            }}
            onChange={handleAccountModeChange}
            placeholder="Select account"
            disabled={applying}
            variant="default"
            loading={applying}
            triggerLabel={applying ? 'Applying…' : (accountDisplayName ?? undefined)}
          />

          <EditAccountAlertDialog
            account={
              activeAccount
                ? {
                    id: activeAccount.id,
                    name: activeAccount.name,
                    account_balance: activeAccount.account_balance,
                    currency: activeAccount.currency,
                    mode: activeAccount.mode,
                    description: activeAccount.description,
                  }
                : null
            }
            isDeletable={activeAccount?.mode !== 'demo' || accountsByMode.demo.length > 1}
            onUpdated={async () => { refetchAccounts(); }}
            onDeleted={async () => { refetchAccounts(); }}
          />

          {showAddButton && (
            <CreateAccountAlertDialog
              onCreated={async () => { refetchAccounts(); }}
            />
          )}
        </>
      )}
    </div>
  );
}
