'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useProgressDialog } from '@/hooks/useProgressDialog';
import { useQueryClient } from '@tanstack/react-query';
import { createAccount } from '@/lib/server/accounts';
import type { AccountRow } from '@/lib/server/accounts';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useSubscription } from '@/hooks/useSubscription';
import { useAllAccounts, patchAllAccounts } from '@/hooks/useAllAccounts';
import { setSelectionFor } from '@/hooks/useActionBarSelection';
import { queryKeys } from '@/lib/queryKeys';
import { Loader2, UserPlus } from 'lucide-react';

// shadcn/ui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { TradingMode } from '@/types/trade';

type Currency = 'EUR' | 'USD' | 'GBP';

export type AccountSettings = {
  id: string;
  user_id: string;
  name: string;
  account_balance: number;
  currency: string;
  mode: TradingMode;
  description: string | null;
  is_active: boolean;
};

interface CreateAccountAlertDialogProps {
  onCreated?: (created: AccountSettings) => void;
  /** Optional extra class for the trigger button (e.g. w-full justify-start for lateral menu). */
  triggerClassName?: string;
}

export function CreateAccountAlertDialog({ onCreated, triggerClassName }: CreateAccountAlertDialogProps) {
  const queryClient = useQueryClient();
  const { data: userId } = useUserDetails();
  const { isPro, subscription } = useSubscription({ userId: userId?.user?.id });

  // Shares the same cache entry as ActionBar / AccountModePopover — reads the
  // canonical `['accounts:all', userId]` key instead of the old accounts:list
  // key (pre-existing cache-miss bug fixed as part of the useAllAccounts
  // migration).
  const { data: allAccounts } = useAllAccounts(userId?.user?.id);

  const maxAccounts = subscription?.definition.limits.maxAccounts ?? null;
  const isAtAccountLimit = !isPro && maxAccounts !== null && (allAccounts?.length ?? 0) >= maxAccounts;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { error, setError } = useProgressDialog();

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [mode, setMode] = useState<TradingMode>('live');
  const [description, setDescription] = useState('');

  // Prevent hydration mismatch
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const isNameValid = name.trim().length > 0;
  const isBalanceValid =
    balance.trim().length > 0 && !Number.isNaN(Number(balance)) && Number(balance) > 0;
  const isCurrencyValid = ['EUR', 'USD', 'GBP'].includes(currency);
  const isModeValid = ['live', 'backtesting', 'demo'].includes(mode);
  const canSubmit = isNameValid && isBalanceValid && isCurrencyValid && isModeValid && !submitting;

  const resetForm = () => {
    setName('');
    setBalance('');
    setCurrency('EUR');
    setMode('live');
    setDescription('');
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!isNameValid || !isBalanceValid || !isCurrencyValid || !isModeValid) {
      setError('Please fill out all required fields with valid values.');
      return;
    }

    if (!userId?.user?.id) {
      setError('User not found. Please log in again.');
      return;
    }

    const parsedBalance = parseFloat(balance);
    if (Number.isNaN(parsedBalance)) {
      setError('Please enter a valid number for balance.');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: insertError } = await createAccount({
        name: name.trim(),
        account_balance: parsedBalance,
        currency,
        mode,
        description: description.trim() || null,
      });

      if (insertError) {
        setError(insertError.message ?? 'Failed to create account. Please try again.');
        setSubmitting(false);
        return;
      }

      if (!data) {
        setError('Failed to create account. Please try again.');
        setSubmitting(false);
        return;
      }

      const createdAccount = data as AccountSettings;

      // Mark the new row active. Use the RETURN VALUE as the canonical row —
      // `data` from createAccount has is_active=false (the insert default),
      // whereas set-active's return is the row after the UPDATE + the
      // BEFORE UPDATE trigger fired, so is_active=true and any sibling in the
      // same mode has been cleared. Using the stale createAccount row here
      // would leak is_active=false into the selection store and break the
      // PERF-1 short-circuit in ActionBar's applyWith on the next switch.
      //
      // Uses the dedicated /api/accounts/set-active route rather than a Server
      // Action so creating an account doesn't trigger an RSC re-render of the
      // current heavy page on top of the DB write.
      const activationResponse = await fetch('/api/accounts/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: createdAccount.mode, accountId: createdAccount.id }),
      });
      const activationPayload = (await activationResponse.json().catch(() => null)) as
        | { data: AccountRow | null; error: { message: string } | null }
        | null;
      const activatedRow = activationPayload?.data ?? null;
      const activationError =
        activationPayload?.error ??
        (activationResponse.ok ? null : { message: activationResponse.statusText });
      if (!activationResponse.ok || activationError || !activatedRow) {
        setError(activationError?.message ?? 'Failed to activate new account. Please try again.');
        setSubmitting(false);
        return;
      }

      const uid = userId?.user?.id;

      // Patch the shared accounts:all cache SYNCHRONOUSLY so every consumer
      // (ActionBar, AccountModePopover, modals) sees the new account + its
      // is_active flag immediately, without waiting on the async refetch.
      // The BEFORE UPDATE trigger already cleared is_active on any sibling in
      // the same mode in the DB — mirror that here so the cache stays in sync.
      patchAllAccounts(queryClient, uid, (rows) => {
        const withoutDup = rows.filter((a) => a.id !== activatedRow.id);
        const reconciled = withoutDup.map((a) =>
          a.mode === activatedRow.mode ? { ...a, is_active: false } : a
        );
        return [...reconciled, activatedRow];
      });

      // Sync ActionBar's in-memory selection to the newly created (and now
      // canonically active) account.
      setSelectionFor(uid, {
        mode: activatedRow.mode,
        activeAccount: activatedRow,
      });

      onCreated?.(createdAccount);

      // Close immediately — don't block on background refetches
      resetForm();
      setOpen(false);
      setSubmitting(false);

      // Refresh account-list queries in the background (new account must appear in dropdowns).
      // The cache patch above means this is a no-op for steady-state UI; the
      // invalidation is a safety net in case the server returns richer data.
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey?.[0] as string;
          return key === 'accounts' || key === 'accounts:all' || key === 'accounts:list';
        },
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create account. Please check your data and try again.');
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            className={cn(
              'themed-btn-primary cursor-pointer w-auto shrink-0 h-8 relative overflow-hidden rounded-xl text-white font-semibold border-0 px-2.5 group [&_svg]:text-white',
              triggerClassName
            )}
          >
            <span className="relative z-10 flex items-center justify-center gap-1.5 text-xs">
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add</span>
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl px-6 py-5">
          {/* Gradient orbs background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
            <div
              className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl"
            />
            <div
              className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl"
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
          <div className="absolute -top-px left-0 right-0 h-0.5 opacity-60" style={{ background: 'linear-gradient(to right, transparent, var(--tc-primary), transparent)' }} />

          <div className="relative">
            <AlertDialogHeader className="space-y-1.5 mb-4">
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg" style={{ background: 'var(--tc-subtle)', border: '1px solid var(--tc-border)' }}>
                  <UserPlus className="h-5 w-5" style={{ color: 'var(--tc-primary)' }} />
                </div>
                <span>Create a new account</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                Configure a trading account used to track your performance. You can adjust these
                settings at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="account-name"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Account name
                </Label>
                <Input
                  id="account-name"
                  placeholder="My account"
                  className="themed-focus h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300 text-slate-900 dark:text-slate-100"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="account-balance"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Balance
                  </Label>
                  <Input
                    id="account-balance"
                    type="number"
                    className="themed-focus h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300 text-slate-900 dark:text-slate-100"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Currency
                  </Label>
                  <Select
                    value={currency}
                    onValueChange={(val: Currency) => setCurrency(val)}
                  >
                    <SelectTrigger className="themed-focus h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 transition-all duration-300">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Mode
                </Label>
                <Select
                  value={mode}
                  onValueChange={(val: TradingMode) => setMode(val)}
                >
                  <SelectTrigger className="themed-focus h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 transition-all duration-300">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="backtesting">Backtesting</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="account-description"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Description
                </Label>
                <Textarea
                  className="themed-focus min-h-[80px] bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300"
                  id="account-description"
                  placeholder="Optional notes about this account…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-500">
                  For example: broker, strategy name, leverage details, or timeframe.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 backdrop-blur-sm p-3 border border-red-500/20">
                  <p className="text-xs text-red-500 dark:text-red-300 font-medium">
                    {error}
                  </p>
                </div>
              )}

              {isAtAccountLimit && (
                <div className="rounded-lg bg-amber-500/10 backdrop-blur-sm p-3 border border-amber-500/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Account limit reached</p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                    Starter plan includes 1 account.{' '}
                    <a href="/settings?tab=billing" className="underline font-medium hover:text-amber-700 dark:hover:text-amber-300">Upgrade to PRO</a>{' '}
                    for unlimited accounts.
                  </p>
                </div>
              )}

              <AlertDialogFooter className="mt-4 flex items-center justify-between">
                <AlertDialogCancel
                  type="button"
                  onClick={resetForm}
                  className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
                >
                  Cancel
                </AlertDialogCancel>

                {/* Just a submit button – form + handleSubmit control closing */}
                <Button
                  type="submit"
                  disabled={!canSubmit || isAtAccountLimit}
                  className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? 'Creating account' : 'Create Account'}
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                </Button>
              </AlertDialogFooter>
            </form>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
