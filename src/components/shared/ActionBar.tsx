'use client';

import * as React from 'react';
import clsx from 'clsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setActiveAccount, getAllAccountsForUser } from '@/lib/server/accounts';
import type { AccountRow } from '@/lib/server/accounts';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { STATIC_DATA } from '@/constants/queryConfig';

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { EditAccountAlertDialog } from '../EditAccountAlertDialog';

type Mode = 'live' | 'backtesting' | 'demo';

const MODES: Mode[] = ['live', 'demo', 'backtesting'];

const MODE_LABELS: Record<Mode, string> = {
  live: 'Live',
  demo: 'Demo',
  backtesting: 'Backtesting',
};

const MODE_DOT: Record<Mode, string> = {
  live: 'bg-emerald-500',
  demo: 'bg-sky-500',
  backtesting: 'bg-violet-500',
};

const MODE_BADGE: Record<Mode, string> = {
  live: 'themed-badge-live',
  demo: 'bg-sky-50/90 text-sky-700 border border-sky-200/80 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25',
  backtesting: 'bg-violet-50/90 text-violet-700 border border-violet-200/80 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25',
};

const MODE_SECTION_COLOR: Record<Mode, string> = {
  live: 'text-emerald-600 dark:text-emerald-400',
  demo: 'text-sky-600 dark:text-sky-400',
  backtesting: 'text-violet-600 dark:text-violet-400',
};

/** Optional server-fetched initial data. When provided, hydrates TanStack cache so hooks use it without client fetch. */
export interface ActionBarInitialData {
  userDetails: { user: { id: string }; session: unknown } | null;
  mode: Mode;
  activeAccount: AccountRow | null;
  accountsForMode: AccountRow[];
}

interface ActionBarProps {
  initialData?: ActionBarInitialData | null;
}

export default function ActionBar({ initialData }: ActionBarProps) {
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);

  // Hydrate TanStack cache from server-fetched initial data (before paint)
  useLayoutEffect(() => {
    if (!initialData || hydratedRef.current) return;
    const { userDetails, mode, activeAccount, accountsForMode } = initialData;
    const uid = userDetails?.user?.id;
    if (uid) {
      queryClient.setQueryData(['userDetails'], userDetails);
      queryClient.setQueryData(['actionBar:selection'], { mode, activeAccount });
      queryClient.setQueryData(['accounts:list', uid, mode], accountsForMode);
      hydratedRef.current = true;
    }
  }, [initialData, queryClient]);

  const { data: userDetails } = useUserDetails();
  const { selection, setSelection } = useActionBarSelection();
  const [open, setOpen] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const autoAppliedRef = useRef(false);

  const userId = userDetails?.user?.id;

  // One query for all accounts across all modes — powers the grouped dropdown
  const {
    data: allAccounts = [],
    isFetching: accountsLoading,
    refetch: refetchAccounts,
  } = useQuery<AccountRow[]>({
    queryKey: ['accounts:all', userId],
    enabled: !!userId,
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

  // ---------- Apply helper
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

        const keysToNuke = ['allTrades', 'filteredTrades', 'nonExecutedTrades'];
        queryClient.removeQueries({
          predicate: (q) => keysToNuke.includes((q.queryKey?.[0] as string) ?? ''),
        });
        queryClient.refetchQueries({
          predicate: (q) => keysToNuke.includes((q.queryKey?.[0] as string) ?? ''),
          type: 'active',
        });
        refetchAccounts();
      } finally {
        setApplying(false);
      }
    },
    [userId, allAccounts, queryClient, refetchAccounts, setSelection]
  );

  // ---------- Auto-apply Live + active/first account on first mount
  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (!userId) return;
    if (selection.activeAccount) return;
    if (accountsLoading) return;

    const liveAccounts = accountsByMode.live;
    const pick = liveAccounts.find((a) => a.is_active) ?? liveAccounts[0];
    if (!pick) return;

    autoAppliedRef.current = true;
    applyWith('live', pick.id);
  }, [userId, accountsLoading, accountsByMode, applyWith, selection.activeAccount]);

  // Only render dynamic content after mount to avoid SSR/client hydration mismatch.
  // Server and AppLayout-seeded client cache diverge on first paint — same pattern the old Select used.
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);

  const triggerLabel = !mounted
    ? 'Select account'
    : applying
    ? 'Applying…'
    : activeAccount?.name ?? 'Select account';

  return (
    <div className="flex items-center gap-2">
      {/* Mode badge (mirrors the old behaviour — shows the committed active mode) */}
      <Badge
        title={`Current mode: ${activeMode}`}
        className={clsx(
          'px-2.5 py-1 text-[11px] rounded-full font-medium shadow-none pointer-events-none',
          MODE_BADGE[activeMode]
        )}
      >
        <span className="leading-none">{MODE_LABELS[activeMode]}</span>
      </Badge>

      {/* ── Single grouped account selector ── */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label="Select trading account"
            disabled={applying}
            className={clsx(
              'group flex items-center gap-2 h-9 pl-3 pr-3 rounded-xl',
              'border border-slate-200/80 dark:border-slate-700/60',
              'bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm',
              'text-sm text-slate-800 dark:text-slate-100',
              'shadow-sm hover:shadow-md',
              'hover:border-slate-300 dark:hover:border-slate-600',
              'transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
              'disabled:opacity-60 disabled:pointer-events-none'
            )}
          >
            {/* Account name only */}
            <span className="font-medium max-w-[150px] sm:max-w-[200px] truncate text-sm">
              {triggerLabel}
            </span>

            {/* Spinner or chevron */}
            {applying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronDown
                className={clsx(
                  'h-3.5 w-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200',
                  open && 'rotate-180'
                )}
              />
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-auto min-w-[220px] p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
        >
          {MODES.map((mode, i) => {
            const modeAccounts = accountsByMode[mode];
            return (
              <React.Fragment key={mode}>
                {/* Separator between sections */}
                {i > 0 && (
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                )}

                {/* Mode section header */}
                <div
                  className={clsx(
                    'flex items-center gap-1.5 px-2 pt-1.5 pb-0.5',
                    'text-[10px] font-bold uppercase tracking-widest select-none',
                    MODE_SECTION_COLOR[mode]
                  )}
                >
                  <span className={clsx('w-1.5 h-1.5 rounded-full', MODE_DOT[mode])} />
                  {MODE_LABELS[mode]}
                </div>

                {/* Account items */}
                {modeAccounts.length === 0 ? (
                  <p className="px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500 italic">
                    No accounts
                  </p>
                ) : (
                  modeAccounts.map((account) => {
                    const isActive =
                      mode === activeMode && account.id === activeAccount?.id;
                    return (
                      <button
                        key={account.id}
                        className={clsx(
                          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left',
                          'transition-colors duration-150',
                          isActive
                            ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                        )}
                        onClick={() => {
                          if (!isActive) applyWith(mode, account.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={clsx(
                            'h-3.5 w-3.5 flex-shrink-0 transition-opacity',
                            isActive
                              ? 'opacity-100 text-violet-500'
                              : 'opacity-0'
                          )}
                        />
                        <span className="truncate">{account.name}</span>
                      </button>
                    );
                  })
                )}
              </React.Fragment>
            );
          })}
        </PopoverContent>
      </Popover>

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
    </div>
  );
}
