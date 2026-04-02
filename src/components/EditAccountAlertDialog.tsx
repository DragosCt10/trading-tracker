'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useProgressDialog } from '@/hooks/useProgressDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAccount, updateAccount } from '@/lib/server/accounts';
import { getTradeCountForAccount } from '@/lib/server/trades';
import { useUserDetails } from '@/hooks/useUserDetails';
import { Info, Loader2, Pencil } from 'lucide-react';

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
  AlertDialogAction,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TradingMode } from '@/types/trade';

type Currency = 'EUR' | 'USD' | 'GBP';

export type AccountSettings = {
  id: string;
  name: string;
  account_balance: number;
  currency: string;
  mode: TradingMode;
  description: string | null;
};

interface EditAccountAlertDialogProps {
  account: AccountSettings | null;
  onUpdated?: (updated: AccountSettings) => void;
  onDeleted?: () => void;
  /** When false, the delete button is disabled (e.g. last demo account). Defaults to true. */
  isDeletable?: boolean;
}

export function EditAccountAlertDialog({
  account,
  onUpdated,
  onDeleted,
  isDeletable = true,
}: EditAccountAlertDialogProps) {
  const queryClient = useQueryClient();
  const { data: userId } = useUserDetails();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { error, setError } = useProgressDialog();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [mode, setMode] = useState<TradingMode>('live');
  const [description, setDescription] = useState('');

  // Helper: reset form from the current account
  const resetFormFromAccount = () => {
    if (!account) return;

    setName(account.name ?? '');
    setBalance(
      account.account_balance != null
        ? account.account_balance.toString()
        : ''
    );

    const currencyUpper = (account.currency || 'EUR').toUpperCase() as Currency;
    setCurrency(
      ['EUR', 'USD', 'GBP'].includes(currencyUpper) ? currencyUpper : 'EUR'
    );

    const modeLower = (account.mode || 'live').toLowerCase() as TradingMode;
    setMode(
      ['live', 'backtesting', 'demo'].includes(modeLower)
        ? modeLower
        : 'live'
    );

    setDescription(account.description ?? '');
    setError(null);
  };

  // Seed the form whenever the dialog OPENS with an account
  useEffect(() => {
    if (open && account) {
      const timer = setTimeout(() => resetFormFromAccount(), 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account]);

  // Lock balance when account has trades (Variant B: allow edit only when no trades)
  const { data: tradeCount } = useQuery({
    queryKey: ['accountTradeCount', account?.id, account?.mode],
    queryFn: () =>
      getTradeCountForAccount(account!.id, account!.mode || 'live'),
    enabled: open && !!account?.id && !!account?.mode,
  });
  const hasTrades = (tradeCount ?? 0) > 0;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!userId?.user?.id) {
      setError('User not found. Please log in again.');
      return;
    }

    if (!account) {
      setError('No account selected to edit.');
      return;
    }

    // When account has trades, keep existing balance; otherwise validate and use edited value
    const balanceToSave = hasTrades
      ? (account.account_balance ?? 0)
      : parseFloat(balance);
    if (!hasTrades && Number.isNaN(balanceToSave)) {
      setError('Please enter a valid number for balance.');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: updateError } = await updateAccount(account.id, {
        name: name.trim(),
        account_balance: balanceToSave,
        currency,
        mode,
        description: description.trim() || null,
      });

      if (updateError) {
        setError(updateError.message ?? 'Failed to update account. Please try again.');
        setSubmitting(false);
        return;
      }

      if (!data) {
        setError('Failed to update account. Please try again.');
        setSubmitting(false);
        return;
      }

      onUpdated?.(data as AccountSettings);

      // Invalidate account-related caches so UI updates immediately (no hard refresh)
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;
          const first = key[0] as string;
          return first === 'accounts:list' || first === 'accounts:all';
        },
      });
      // Update actionBar selection if the edited account is the active one (name, balance, mode, etc. show immediately)
      const selectionKey = ['actionBar:selection'] as const;
      const currentSelection = queryClient.getQueryData(selectionKey) as { mode: string; activeAccount: { id: string } | null } | undefined;
      if (currentSelection?.activeAccount?.id === account.id) {
        const updatedMode = (data as any).mode ?? currentSelection.mode;
        queryClient.setQueryData(selectionKey, { ...currentSelection, mode: updatedMode, activeAccount: data });

        // When mode changed, invalidate trade queries so they refetch for the new mode
        if (updatedMode !== currentSelection.mode) {
          const tradeKeys = ['allTrades', 'filteredTrades', 'nonExecutedTrades', 'strategies-overview'];
          queryClient.invalidateQueries({
            predicate: (q) => tradeKeys.includes((q.queryKey?.[0] as string) ?? ''),
          });
        }
      }
      setOpen(false);
      setSubmitting(false);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update account. Please check your data and try again.');
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    setDeleteConfirmOpen(false);
    setError(null);
    setDeleting(true);

    try {
      const { error: deleteError } = await deleteAccount(account.id);

      if (deleteError) {
        setError(deleteError.message ?? 'Failed to delete account. Please try again.');
        setDeleting(false);
        return;
      }

      // Clear ActionBar selection if the deleted account was the active one (so dashboard/AccountOverviewCard stops showing it)
      const selectionKey = ['actionBar:selection'] as const;
      const currentSelection = queryClient.getQueryData(selectionKey) as { mode: string; activeAccount: { id: string } | null } | undefined;
      if (currentSelection?.activeAccount?.id === account.id) {
        queryClient.setQueryData(selectionKey, { ...currentSelection, activeAccount: null });
      }

      onDeleted?.();
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;
          const first = key[0] as string;
          return (
            first === 'accounts:list' ||
            first === 'accounts:all' ||
            first === 'allTrades' ||
            first === 'filteredTrades' ||
            first === 'nonExecutedTrades' ||
            first === 'all-strategy-trades' ||
            first === 'all-strategy-stats' ||
            first === 'strategies-overview'
          );
        },
      });
      setOpen(false);
      setDeleting(false);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        {/* Trigger button (disabled if nothing selected) */}
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="cursor-pointer relative w-auto shrink-0 h-8 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-2.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50 gap-1.5"
            disabled={!account}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
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

          {/* Noise overlay */}
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
                  <Pencil className="h-5 w-5" style={{ color: 'var(--tc-primary)' }} />
                </div>
                <span>Edit account</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                Update the settings for this trading account. You can adjust these details later.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Account name */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-account-name"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Account name
                </Label>
                <Input
                  id="edit-account-name"
                  placeholder="Account name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="themed-focus h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Balance + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild disabled={!hasTrades}>
                        <div className={hasTrades ? 'cursor-help' : undefined}>
                          <Label
                            htmlFor="edit-account-balance"
                            className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              Balance
                              {hasTrades && (
                                <Info className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden />
                              )}
                            </span>
                          </Label>
                          <Input
                            id="edit-account-balance"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={balance}
                            onChange={(e) => setBalance(e.target.value)}
                            required
                            disabled={hasTrades}
                            readOnly={hasTrades}
                            className="themed-focus h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300 text-slate-900 dark:text-slate-100 disabled:opacity-70 disabled:cursor-not-allowed mt-1.5"
                          />
                        </div>
                      </TooltipTrigger>
                      {hasTrades && (
                        <TooltipContent className="w-64 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-3">
                          Balance cannot be changed after trades exist. Create a new account for a different size.
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
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
                    <SelectContent className="border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mode */}
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
                  <SelectContent className="border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="backtesting">Backtesting</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-account-description"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Description
                </Label>
                <Textarea
                  id="edit-account-description"
                  placeholder="Optional notes about this account…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="themed-focus min-h-[80px] bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 backdrop-blur-sm p-3 border border-red-500/20">
                  <p className="text-xs text-red-500 dark:text-red-300 font-medium">
                    {error}
                  </p>
                </div>
              )}

              <AlertDialogFooter className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full sm:w-auto order-2 sm:order-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={!isDeletable ? 'cursor-not-allowed' : undefined}>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={!account || submitting || deleting || !isDeletable}
                            onClick={() => setDeleteConfirmOpen(true)}
                            className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 gap-2"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                              {deleting ? 'Deleting account' : 'Delete account'}
                            </span>
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!isDeletable && (
                        <TooltipContent className="w-64 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-3">
                          You must keep at least one demo account. Create another demo account before deleting this one.
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
                  <AlertDialogCancel
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (account) resetFormFromAccount();
                    }}
                    className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    type="submit"
                    disabled={submitting || deleting || !account}
                    className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 text-sm"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {submitting ? 'Saving changes' : 'Save changes'}
                    </span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  </Button>
                </div>
              </AlertDialogFooter>
            </form>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation - same design as TradeDetailsModal */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) setError(null); }}>
        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-slate-600 dark:text-slate-400">Are you sure you want to delete this account? This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3">
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 flex items-center gap-2"
              >
                Yes, Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
