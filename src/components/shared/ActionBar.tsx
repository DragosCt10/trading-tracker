'use client';

import * as React from 'react';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useAccounts } from '@/hooks/useAccounts';
import { useCallback, useEffect, useRef } from 'react';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { Check } from 'lucide-react';

// shadcn/ui
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { EditAccountAlertDialog } from '../EditAccountAlertDialog';

type Mode = 'live' | 'backtesting' | 'demo';

export default function ActionBar() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { data: userId } = useUserDetails();
  const { selection, setSelection } = useActionBarSelection();

  // seed local UI from the cached value
  const [activeMode, setActiveMode] = React.useState<Mode>(selection.mode);
  const [pendingMode, setPendingMode] = React.useState<Mode>(selection.mode);
  const [pendingAccountId, setPendingAccountId] = React.useState<string | null>(
    selection.activeAccount?.id ?? null
  );
  const [applying, setApplying] = React.useState(false);

  // Use accounts for the pending mode and user (so you see what would hypothetically be available if you apply)
  const {
    accounts,
    accountsLoading,
    refetchAccounts
  } = useAccounts({ userId: userId?.user?.id, pendingMode });

  const pendingAccount = accounts.find(a => a.id === pendingAccountId) ?? null;

  // keep in sync if another part of the app changes the selection
  React.useEffect(() => {
    setActiveMode(selection.mode);
    setPendingMode(selection.mode);
    setPendingAccountId(selection.activeAccount?.id ?? null);
  }, [selection.mode, selection.activeAccount?.id]);

  // ensure the account select stays valid & preselects cached active
  React.useEffect(() => {
    if (pendingAccountId && !accounts.some(a => a.id === pendingAccountId)) {
      setPendingAccountId(null);
      return;
    }
    if (!pendingAccountId) {
      const cachedActive = accounts.find(a => a.is_active);
      if (cachedActive) setPendingAccountId(cachedActive.id);
    }
  }, [accounts, pendingAccountId]);

  // ---------- 1) param-based apply helper (used by button + auto init)
  const applyWith = React.useCallback(
    async (mode: Mode, accountId: string | null) => {
      if (!userId?.user?.id) return;
      setApplying(true);
      try {
        await supabase
          .from('account_settings')
          .update({ is_active: false } as never)
          .eq('user_id', userId.user.id)
          .eq('mode', mode);

        let activeAccountObj: any = null;

        if (accountId) {
          await supabase
            .from('account_settings')
            .update({ is_active: true } as never)
            .eq('id', accountId)
            .eq('user_id', userId.user.id);

          activeAccountObj = accounts.find(a => a.id === accountId) ?? null;
        }

        // publish committed selection into the cache
        setSelection({ mode, activeAccount: activeAccountObj });
        setActiveMode(mode);

        // refresh queries
        const keysToNukeStartsWith = [
          'allTrades', 'filteredTrades',
          'nonExecutedTrades', 'nonExecutedTotalTradesCount',
        ];
        queryClient.removeQueries({
          predicate: q => keysToNukeStartsWith.includes((q.queryKey?.[0] as string) ?? ''),
        });
        queryClient.refetchQueries({
          predicate: q => keysToNukeStartsWith.includes((q.queryKey?.[0] as string) ?? ''),
          type: 'active',
        });

        refetchAccounts?.();
      } finally {
        setApplying(false);
      }
    },
    [userId, supabase, accounts, queryClient, refetchAccounts, setSelection]
  );

  // existing button handler just delegates to helper
  const onApply = useCallback(
    () => applyWith(pendingMode, pendingAccountId),
    [applyWith, pendingMode, pendingAccountId]
  );

  // ---------- 2) AUTO-APPLY ON FIRST MOUNT (Live + active-or-first subaccount)
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (!userId?.user?.id) return;

    // only auto-apply if nothing chosen yet
    if (selection.activeAccount) return;

    // we only auto-apply Live on first mount
    if (pendingMode !== 'live') return;

    if (accountsLoading) return;

    // prefer an already-active one in DB; otherwise first (sorted by created_at in your hook)
    const pick = accounts.find(a => a.is_active) ?? accounts[0];
    if (!pick) return;

    autoAppliedRef.current = true;

    // ensure local pending state reflects what we’re applying
    setPendingAccountId(pick.id);
    applyWith('live', pick.id);
  }, [
    userId, accountsLoading, accounts,
    applyWith, selection.activeAccount, pendingMode,
  ]);

  const noAccounts = accounts.length === 0;

  // Determine if apply button should be disabled due to already-active selection
  const isAlreadyActive =
    activeMode === pendingMode &&
    (selection.activeAccount?.id ?? null) === (pendingAccountId ?? null);

  // badge color mapping (shadcn Badge + utility classes)
  const badgeClass =
    activeMode === 'live'
      ? 'bg-purple-50/90 text-purple-700 border border-purple-200/80 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/25'
      : activeMode === 'backtesting'
      ? 'bg-violet-50/90 text-violet-700 border border-violet-200/80 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25'
      : activeMode === 'demo'
      ? 'bg-sky-50/90 text-sky-700 border border-sky-200/80 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25'
      : '';

  return (
    <div className="flex items-center justify-end w-full">
      <div className="flex flex-col gap-2 w-full items-stretch sm:flex-row sm:items-center sm:justify-end sm:gap-2 text-xs sm:text-sm">
        {/* Current mode badge */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <Badge
            title={`Current mode: ${activeMode ?? '—'}`}
            className={clsx(
              'px-2.5 py-1 text-[11px] rounded-full font-medium shadow-none pointer-events-none',
              badgeClass
            )}
          >
            <span className="leading-none">
              {activeMode ? activeMode[0].toUpperCase() + activeMode.slice(1) : '—'}
            </span>
          </Badge>
        </div>

        {/* Mode select (pending) */}
        <div className="flex-1 sm:flex-initial">
          <Select
            value={pendingMode}
            onValueChange={(val: Mode) => setPendingMode(val)}
          >
            <SelectTrigger className="h-8 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/70 backdrop-blur-sm text-xs sm:text-sm text-slate-800 dark:text-slate-100 shadow-none min-w-[130px] w-full sm:w-[130px] md:w-[160px] focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-200">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent className="text-xs sm:text-sm min-w-[140px] md:min-w-[160px] border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
              <SelectItem value="live" className="text-xs sm:text-sm">Live</SelectItem>
              <SelectItem value="backtesting" className="text-xs sm:text-sm">Backtesting</SelectItem>
              <SelectItem value="demo" className="text-xs sm:text-sm">Demo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Divider (hidden on mobile) */}
        <div className="hidden md:flex">
          <Separator orientation="vertical" className="mx-1 h-5" />
        </div>

        {/* Subaccount select */}
        <div className="flex-1 sm:flex-initial">
          <Select
            value={pendingAccountId ?? undefined}
            onValueChange={(val) => setPendingAccountId(val ?? null)}
            disabled={accountsLoading || noAccounts}
          >
            <SelectTrigger className="h-8 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/70 backdrop-blur-sm text-xs sm:text-sm text-slate-800 dark:text-slate-100 shadow-none min-w-[170px] w-full sm:w-[170px] md:w-[200px] focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-200">
              <SelectValue placeholder={noAccounts ? 'No subaccounts' : 'Choose subaccount…'} />
            </SelectTrigger>
            <SelectContent className="text-xs sm:text-sm min-w-[170px] md:min-w-[200px] border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
              {!noAccounts ? (
                accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs sm:text-sm">
                    {a.name}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No subaccounts</div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Edit and Apply buttons (stack on mobile, inline on sm+) */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <EditAccountAlertDialog
            account={
              pendingAccount
                ? {
                    id: pendingAccount.id,
                    name: pendingAccount.name,
                    account_balance: pendingAccount.account_balance,
                    currency: pendingAccount.currency,
                    mode: pendingAccount.mode,
                    description: pendingAccount.description,
                  }
                : null
            }
            onUpdated={async () => {
              // force the accounts list to refresh so the Select shows the new name
              await refetchAccounts?.();
            }}
          />
          <Button
            type="button"
            size="sm"
            className="relative w-full sm:w-auto h-8 overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 group border-0 text-xs sm:text-sm transition-all duration-300 disabled:opacity-60"
            onClick={onApply}
            disabled={
              applying ||
              (!pendingAccountId && !noAccounts) ||
              isAlreadyActive
            }
            >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {applying ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 004 12z" />
                </svg>
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>Apply</span>
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Button>
        </div>
      </div>
    </div>
  );
}
