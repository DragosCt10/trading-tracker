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

import { AccountModePopover, type Mode } from '@/components/shared/AccountModePopover';
import { EditAccountAlertDialog } from '../EditAccountAlertDialog';
import { CreateAccountAlertDialog } from '../CreateAccountModal';

const MODE_LABELS: Record<Mode, string> = {
  live: 'Live',
  demo: 'Demo',
  backtesting: 'Backtesting',
};

const MODE_BADGE: Record<Mode, string> = {
  live: 'themed-badge-live',
  demo: 'bg-sky-50/90 text-sky-700 border border-sky-200/80 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25',
  backtesting: 'bg-violet-50/90 text-violet-700 border border-violet-200/80 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25',
};

/** Optional server-fetched initial data. When provided, hydrates TanStack cache so hooks use it without client fetch. */
export interface ActionBarInitialData {
  userDetails: { user: { id: string } | null; session: unknown } | null;
  mode: Mode;
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
    const map: Record<Mode, AccountRow[]> = { live: [], demo: [], backtesting: [] };
    for (const a of allAccounts) {
      if (a.mode in map) map[a.mode as Mode].push(a);
    }
    return map;
  }, [allAccounts]);

  const activeMode = selection.mode;
  const activeAccount = selection.activeAccount;

  // Resolve account display name from current user's list (not from cached selection) so the
  // popover trigger shows the correct name even before its own query has synced; avoids "Select account" placeholder.
  const accountDisplayName =
    activeAccount && allAccounts.length > 0
      ? (allAccounts.find((a) => a.id === activeAccount.id)?.name ?? null)
      : null;

  // ---------- Apply helper (persist active account and invalidate trade queries)
  const applyWith = useCallback(
    async (mode: Mode, accountId: string | null) => {
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

        const keysToInvalidate = ['allTrades', 'filteredTrades', 'nonExecutedTrades'];
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
    (sel: { mode: Mode; accountId: string | null; account?: AccountRow | null }) => {
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

    const fallbackOrder: Mode[] = ['live', 'demo', 'backtesting'];
    let pick: AccountRow | undefined;
    let pickedMode: Mode = 'live';

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

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 min-w-0">
      {/* Mode badge — left of account selector */}
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

      {/* Edit the currently active account */}
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
        onUpdated={async () => {
          refetchAccounts();
        }}
        onDeleted={async () => {
          refetchAccounts();
        }}
      />

      {/* Add Account — hidden when shown in mobile lateral menu */}
      {showAddButton && (
        <CreateAccountAlertDialog
          onCreated={async () => {
            refetchAccounts();
          }}
        />
      )}
    </div>
  );
}
