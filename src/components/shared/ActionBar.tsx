'use client';

import * as React from 'react';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useAccounts } from '@/hooks/useAccounts';
import { useCallback, useEffect, useRef } from 'react';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';

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
      ? 'bg-emerald-100 hover:bg-emerald-100 text-emerald-500'
      : activeMode === 'backtesting'
      ? 'bg-violet-100 hover:bg-violet-100 text-violet-500'
      : activeMode === 'demo'
      ? 'bg-sky-100 hover:bg-sky-100 text-sky-500'
      : '';

  return (
    <div className="flex items-center justify-end w-full">
      <div className="flex flex-col gap-2 w-full items-stretch sm:flex-row sm:items-center sm:justify-end sm:gap-2">
        {/* Current mode badge */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <Badge
            title={`Current mode: ${activeMode ?? '—'}`}
            className={clsx(
              'px-2.5 py-1 text-xs shadow-none',
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
            <SelectTrigger className="text-sm h-8 shadow-none min-w-[130px] w-full sm:w-[130px] md:w-[160px]">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent className="text-sm min-w-[140px] md:min-w-[160px]">
              <SelectItem value="live" className="text-sm">Live</SelectItem>
              <SelectItem value="backtesting" className="text-sm">Backtesting</SelectItem>
              <SelectItem value="demo" className="text-sm">Demo</SelectItem>
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
            <SelectTrigger className="text-sm h-8 shadow-none min-w-[170px] w-full sm:w-[170px] md:w-[200px]">
              <SelectValue placeholder={noAccounts ? 'No subaccounts' : 'Choose subaccount…'} />
            </SelectTrigger>
            <SelectContent className="text-sm min-w-[170px] md:min-w-[200px]">
              {!noAccounts ? (
                accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-sm">
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
        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
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
            className="w-full sm:w-auto"
            onClick={onApply}
            disabled={
              applying ||
              (!pendingAccountId && !noAccounts) ||
              isAlreadyActive
            }
          >
            {applying && (
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 004 12z" />
              </svg>
            )}
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
