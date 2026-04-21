'use client';

import * as React from 'react';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import type { AccountRow } from '@/lib/server/accounts';
import { useCallback, useEffect, useRef } from 'react';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useAllAccounts, patchAllAccounts, invalidateAllAccounts } from '@/hooks/useAllAccounts';
import { useProgressDialog } from '@/hooks/useProgressDialog';

import { usePathname } from 'next/navigation';
import { AccountModePopover } from '@/components/shared/AccountModePopover';
import type { TradingMode } from '@/types/trade';
import { EditAccountAlertDialog } from '../EditAccountAlertDialog';
import { CreateAccountAlertDialog } from '../CreateAccountModal';
import { setLastAccountPreference } from '@/utils/lastAccountCookie';
import { StrategySelectPopover } from '@/components/shared/StrategySelectPopover';
import { EmptyAccountsCTA } from '@/components/shared/EmptyAccountsCTA';
import { useStrategies } from '@/hooks/useStrategies';
import { TRADE_QUERY_PREFIXES } from '@/lib/queryKeys';
import { Plus } from 'lucide-react';
import { MODE_BADGE } from '@/constants/modeBadge';

const MODE_LABELS: Record<TradingMode, string> = {
  live: 'Live',
  demo: 'Demo',
  backtesting: 'Backtesting',
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

  // Note: no hydration useLayoutEffect — AppLayout.tsx already seeds every
  // cache key we depend on (userDetails, accounts:list, accounts:all,
  // actionBar:selection) with identical `getQueryData === undefined` guards.
  // See the ARCH-1 decision in ~/.claude/plans/compressed-twirling-melody.md.

  const { data: userDetails } = useUserDetails();
  const { selection, setSelection } = useActionBarSelection();
  const [applying, setApplying] = React.useState(false);
  const applyingRef = useRef(false);
  const { error: switchError, setError: setSwitchError } = useProgressDialog(3000);

  const userId = userDetails?.user?.id;

  // One query for all accounts across all modes — powers the grouped dropdown.
  // initialData from layout/server avoids getAllAccountsForUser client fetch on first load (audit 2.6).
  const {
    data: allAccounts = [],
    isFetching: accountsLoading,
  } = useAllAccounts(userId, { initialData: initialData?.allAccounts });

  // Ref so applyWith can read the latest allAccounts without putting it in the
  // dep array. Without this, applyWith is recreated on every list change and
  // the auto-apply effect churns its dep array needlessly.
  const allAccountsRef = useRef(allAccounts);
  useEffect(() => {
    allAccountsRef.current = allAccounts;
  }, [allAccounts]);

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
  //
  // Accepts a pre-resolved AccountRow so the callback doesn't depend on the
  // mutable `allAccounts` query result. Behaviour:
  //   1. PERF-1 short-circuit: if the target is already the active account
  //      in the DB AND the store, do nothing (avoids wasted writes on first
  //      mount when the server-side hydration already matches).
  //   2. CWV1 optimistic: update the selection store IMMEDIATELY so the UI
  //      lights up without waiting on the server round trip.
  //   3. POST /api/accounts/set-active. On error, roll back the store and
  //      show an inline banner via useProgressDialog (auto-dismisses after 3s).
  //      Using a dedicated API route instead of a Server Action avoids the
  //      implicit RSC refresh of the current page, which was adding 3-5s of
  //      latency on top of the DB UPDATE on heavy routes.
  //   4. On success, patch the shared `accounts:all` cache in place using
  //      the row the server returned — no refetchAccounts, no extra RTT.
  //   5. Invalidate trade query caches so dashboards refetch under the new
  //      account context.
  const applyWith = useCallback(
    async (mode: TradingMode, resolvedAccount: AccountRow) => {
      if (!userId || applyingRef.current) return;

      // PERF-1 short-circuit: DB + store both already match
      if (
        resolvedAccount.is_active &&
        resolvedAccount.mode === mode &&
        selection.mode === mode &&
        selection.activeAccount?.id === resolvedAccount.id
      ) {
        return;
      }

      applyingRef.current = true;
      setApplying(true);
      const previous = selection;

      // CWV1 optimistic update — UI reflects the target instantly
      setSelection({ mode, activeAccount: resolvedAccount });

      // Persist the cookie preference so refresh restores the same selection.
      // Phase 7.10 rewrites this to be userId-scoped.
      const listForMode = allAccountsRef.current.filter((a) => a.mode === mode);
      const index = listForMode.findIndex((a) => a.id === resolvedAccount.id);
      if (index >= 0) setLastAccountPreference(userId, mode, index);

      try {
        const response = await fetch('/api/accounts/set-active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, accountId: resolvedAccount.id }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { data: AccountRow | null; error: { message: string } | null }
          | null;
        const data = payload?.data ?? null;
        const error = payload?.error ?? (response.ok ? null : { message: response.statusText });

        if (!response.ok || error || !data) {
          // CQ-2: rollback + user-visible error
          setSelection(previous);
          setSwitchError('Could not switch account. Try again.');
          console.error('setActiveAccount failed:', error?.message);
          return;
        }

        // Patch the shared accounts:all cache in place so every consumer
        // (ActionBar, AccountModePopover, modals) sees the new is_active
        // flag without a refetch.
        patchAllAccounts(queryClient, userId, (rows) =>
          rows.map((a) => ({
            ...a,
            is_active: a.id === data.id && a.mode === data.mode,
          }))
        );

        queryClient.invalidateQueries({
          predicate: (q) => TRADE_QUERY_PREFIXES.has((q.queryKey?.[0] as string) ?? ''),
        });
      } finally {
        applyingRef.current = false;
        setApplying(false);
      }
    },
    [userId, queryClient, selection, setSelection, setSwitchError]
  );

  const handleAccountModeChange = useCallback(
    (sel: { mode: TradingMode; accountId: string | null; account?: AccountRow | null }) => {
      if (!sel.accountId || !sel.account) return;
      if (sel.accountId === activeAccount?.id && sel.mode === activeMode) return;
      applyWith(sel.mode, sel.account);
    },
    [activeAccount?.id, activeMode, applyWith]
  );

  // ---------- Auto-apply first available account when none is selected
  // Runs on mount AND after account deletion (when activeAccount becomes null).
  useEffect(() => {
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

    applyWith(pickedMode, pick);
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

  // True when we've finished loading and the user genuinely has zero accounts
  // across every mode. Without this branch the auto-apply effect bails and the
  // skeleton pulses forever (T7).
  const hasZeroAccounts =
    !!userId && !accountsLoading && allAccounts.length === 0;
  const isInitializing = !activeAccount && !hasZeroAccounts;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 min-w-0 relative">
      {/* Switch-error banner — auto-dismisses after 3s via useProgressDialog */}
      {switchError && (
        <div
          role="alert"
          aria-live="polite"
          className="absolute -top-9 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-lg border border-rose-300/60 bg-rose-50/90 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-md dark:border-rose-700/40 dark:bg-rose-950/80 dark:text-rose-200"
        >
          {switchError}
        </div>
      )}

      {/* Empty-accounts state — takes precedence over the mode badge so users
          with zero accounts see a prompt instead of an infinite skeleton (T7). */}
      {hasZeroAccounts ? (
        <EmptyAccountsCTA />
      ) : isInitializing ? (
        /* Mode badge skeleton — still loading */
        <div aria-hidden="true" className="h-8 w-16 sm:w-20 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
      ) : (
        /* Mode badge — normal state */
        <div
          className={clsx(
            'flex items-center justify-center h-8 rounded-xl border px-2 sm:px-4 pointer-events-none shrink-0',
            'text-xs sm:text-sm font-medium',
            MODE_BADGE[activeMode]
          )}
        >
          <span className="leading-none">{MODE_LABELS[activeMode]}</span>
        </div>
      )}

      {hasZeroAccounts ? null : isStrategyPage ? (
        /* Strategy page: show strategy switcher + add strategy button */
        <>
          {strategiesLoading || strategyOptions.length === 0 ? (
            /* Skeleton while strategies are loading */
            <div aria-hidden="true" className="h-8 w-36 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ) : (
            <StrategySelectPopover
              strategies={strategyOptions}
              currentSlug={strategySlug ?? ''}
            />
          )}

          {showAddButton && (
            strategiesLoading || strategyOptions.length === 0 ? (
              <div aria-hidden="true" className="h-8 w-8 sm:w-28 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            ) : (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('new-trade-modal:open'))}
                aria-label="New trade"
                className="flex items-center justify-center h-8 w-8 sm:w-auto rounded-xl themed-btn-primary text-white font-semibold border-0 overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 cursor-pointer relative sm:px-4 text-xs sm:text-sm shrink-0"
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline whitespace-nowrap">New Trade</span>
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </button>
            )
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
            triggerLabel={accountDisplayName ?? undefined}
          />

          {isInitializing ? (
            <div aria-hidden="true" className="h-8 w-16 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
          ) : (
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
              isDeletable={allAccounts.length > 1}
              onUpdated={async () => { invalidateAllAccounts(queryClient, userId); }}
              onDeleted={async () => { invalidateAllAccounts(queryClient, userId); }}
            />
          )}

          {showAddButton && (
            <CreateAccountAlertDialog
              onCreated={async () => { invalidateAllAccounts(queryClient, userId); }}
            />
          )}
        </>
      )}
    </div>
  );
}
