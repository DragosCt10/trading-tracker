'use client';

import * as React from 'react';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useAccounts } from '@/hooks/useAccounts';
import { useCallback } from 'react';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';

type Mode = 'live' | 'backtesting' | 'demo';

function chipClasses(mode: Mode) {
  switch (mode) {
    case 'live': return 'bg-emerald-600 text-white border-emerald-700';
    case 'backtesting': return 'bg-violet-600 text-white border-violet-700';
    case 'demo': return 'bg-sky-600 text-white border-sky-700';
  }
}

export default function BottomActionBar() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Committed/active mode: this is what the mode chip shows!
  const [activeMode, setActiveMode] = React.useState<Mode>('live');
  // Pending mode: what's selected in the select, before applied
  const [pendingMode, setPendingMode] = React.useState<Mode>('live');
  const [pendingAccountId, setPendingAccountId] = React.useState<string | null>(null);
  const [applying, setApplying] = React.useState(false);
  const { data: userId } = useUserDetails();

  // Use accounts for the pending mode and user (so you see what would hypothetically be available if you apply)
  const {
    accounts,
    accountsLoading,
    refetchAccounts
  } = useAccounts({ userId: userId?.user?.id, pendingMode });

  // If current pendingAccountId isn’t in the fresh list, reset it
  React.useEffect(() => {
    if (pendingAccountId && !accounts.find(a => a.id === pendingAccountId)) {
      setPendingAccountId(null);
    }
  }, [accounts, pendingAccountId]);

  // Apply: updates mode/account settings in DB, refreshes queries
  const { setSelection } = useActionBarSelection();

  const onApply = useCallback(async () => {
    if (!userId) return;
    setApplying(true);
    try {
      // 1) update DB (deactivate all, activate chosen)
      await supabase
        .from('account_settings')
        .update({ is_active: false } as never)
        .eq('user_id', userId)
        .eq('mode', pendingMode);

      let activeAccountObj: any = null;

      if (pendingAccountId) {
        await supabase
          .from('account_settings')
          .update({ is_active: true } as never)
          .eq('id', pendingAccountId)
          .eq('user_id', userId);

        // get the full account object from the already-loaded list
        activeAccountObj = accounts.find(a => a.id === pendingAccountId) ?? null;
      }

      // 2) publish the committed selection globally (cache-as-store)
      setSelection({
        mode: pendingMode,                 // the committed mode (pendingMode on apply)
        activeAccount: activeAccountObj,   // full object or null
      });

      // Set committed mode to pendingMode after apply
      setActiveMode(pendingMode);

      // 3) clear + optionally refetch dashboard queries
      const keysToNukeStartsWith = [
        'allTrades',
        'filteredTrades',
        'nonExecutedTrades',
        'nonExecutedTotalTradesCount',
      ];

      queryClient.removeQueries({
        predicate: q => keysToNukeStartsWith.includes((q.queryKey?.[0] as string) ?? ''),
      });

      queryClient.refetchQueries({
        predicate: q => keysToNukeStartsWith.includes((q.queryKey?.[0] as string) ?? ''),
        type: 'active',
      });

      // (optional) refresh accounts list
      refetchAccounts?.();
    } finally {
      setApplying(false);
    }
  }, [userId, supabase, pendingMode, pendingAccountId, accounts, setSelection, queryClient, refetchAccounts]);

  const noAccounts = accounts.length === 0;

  return (
    <div
      className={clsx(
        'fixed left-1/2 bottom-6 z-50 -translate-x-1/2',
        'rounded-lg bg-white border border-stone-300',
        'backdrop-blur supports-[backdrop-filter]:backdrop-blur',
        'px-3 py-2 max-w-[95vw]'
      )}
      role="region"
      aria-label="Trading quick actions"
    >
      <div className="flex items-center gap-2 md:gap-3">
        {/* Current mode chip - reflects only the current committed/active mode */}
        <div
          className={clsx(
            'relative inline-flex w-max items-center border font-sans font-medium rounded-md text-xs p-0.5 shadow-sm',
            activeMode === 'live' && 'bg-emerald-600 border-emerald-700 text-emerald-50',
            activeMode === 'backtesting' && 'bg-violet-600 border-violet-700 text-violet-50',
            activeMode === 'demo' && 'bg-sky-600 border-sky-700 text-sky-50',
            !activeMode && 'bg-stone-600 text-white border-stone-800'
          )}
          title={`Current mode: ${activeMode ?? '—'}`}
        >
          <span className="font-sans text-current leading-none my-0.5 mx-1.5">
            {activeMode ? activeMode[0].toUpperCase() + activeMode.slice(1) : '—'}
          </span>
        </div>

        

        {/* Mode select */}
        <div className="relative">
          <label className="sr-only" htmlFor="mode-select">Select mode</label>
          <select
            id="mode-select"
            value={pendingMode}
            onChange={(e) => setPendingMode(e.target.value as Mode)}
            className={clsx(
              'appearance-none rounded-lg border border-stone-300',
              'pl-4 pr-8 py-2 text-sm'
            )}
          >
            <option value="live">Live</option>
            <option value="backtesting">Backtesting</option>
            <option value="demo">Demo</option>
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center" aria-hidden="true">
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-stone-500">
              <path d="M5.5 7.5l4.5 4 4.5-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        {/* Divider */}
        <div className="hidden md:block h-6 w-px bg-stone-300/80 dark:bg-stone-700/80" />

        {/* Subaccount select */}
        <div className={clsx('relative', (noAccounts || accountsLoading) && 'opacity-60')}>
          <label className="sr-only" htmlFor="account-select">Select subaccount</label>
          <select
            id="account-select"
            value={pendingAccountId ?? ''}
            onChange={(e) => setPendingAccountId(e.target.value || null)}
            disabled={accountsLoading || noAccounts}
            className={clsx(
              'appearance-none rounded-lg border border-stone-300',
              'pl-4 pr-8 py-2 text-sm'
            )}
          >
            <option value="">Choose subaccount…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center" aria-hidden="true">
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-stone-500">
              <path d="M5.5 7.5l4.5 4 4.5-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        {/* Edit */}
        <button
          type="button"
          onClick={() => {
            // open your accounts/settings UI here if you want
          }}
          className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm rounded-md py-2 px-4 bg-transparent border-transparent text-stone-800 hover:bg-stone-800/5 hover:border-stone-800/5 shadow-none hover:shadow-none"
        >
          Edit
        </button>

        {/* Apply */}
        <button
          type="button"
          onClick={onApply}
          disabled={applying || (!pendingAccountId && !noAccounts)}
          className={'inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md bg-stone-800 hover:bg-stone-700 relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition-all antialiased'}
        >
          {applying && (
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 004 12z" />
            </svg>
          )}
          Apply
        </button>
      </div>
    </div>
  );
}
