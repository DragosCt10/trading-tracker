'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useUserDetails } from '@/hooks/useUserDetails';
import { Pencil } from 'lucide-react';

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

type Mode = 'live' | 'backtesting' | 'demo';
type Currency = 'EUR' | 'USD' | 'GBP';

export type AccountSettings = {
  id: string;
  name: string;
  account_balance: number;
  currency: string;
  mode: string;
  description: string | null;
};

interface EditAccountAlertDialogProps {
  account: AccountSettings | null;
  // called after a successful update so parent can refetch / update UI
  onUpdated?: (updated: AccountSettings) => void;
}

/* ---------------- Success toast ---------------- */

function SuccessAlert({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 shadow flex items-center gap-2">
      <svg
        className="w-5 h-5 text-purple-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-purple-800 font-normal">{message}</span>
    </div>
  );
}

/* ---------------- Edit dialog ---------------- */

export function EditAccountAlertDialog({
  account,
  onUpdated,
}: EditAccountAlertDialogProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: userId } = useUserDetails();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [mode, setMode] = useState<Mode>('live');
  const [description, setDescription] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);

  // Helper: reset form from the current account
  const resetFormFromAccount = React.useCallback(() => {
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

    const modeLower = (account.mode || 'live').toLowerCase() as Mode;
    setMode(
      ['live', 'backtesting', 'demo'].includes(modeLower)
        ? modeLower
        : 'live'
    );

    setDescription(account.description ?? '');
    setError(null);
  }, [account]);

  // Seed the form whenever the dialog OPENS with an account
  useEffect(() => {
    if (open && account) {
      resetFormFromAccount();
    }
  }, [open, account, resetFormFromAccount]);

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

    const parsedBalance = parseFloat(balance);
    if (Number.isNaN(parsedBalance)) {
      setError('Please enter a valid number for balance.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: updateError } = await supabase
        .from('account_settings')
        .update({
          name,
          account_balance: parsedBalance,
          currency,
          mode,
          description: description || null,
        } as never)
        .eq('id', account.id)
        .eq('user_id', userId.user.id)
        .select('*');

      if (updateError) {
        setError(updateError.message ?? 'Failed to update account.');
        return;
      }

      if (!data || data.length === 0) {
        setError('No rows were updated (check id/user_id / RLS).');
        return;
      }

      const updatedAccount = data[0] as AccountSettings;

      // Let parent know so it can refetch/update its list
      onUpdated?.(updatedAccount);

      // Also mark queries stale just in case
      await queryClient.invalidateQueries();

      setOpen(false);
      setShowSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {showSuccess && (
        <SuccessAlert
          message="Account settings saved!"
          onClose={() => setShowSuccess(false)}
        />
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        {/* Trigger button (disabled if nothing selected) */}
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="relative w-full sm:w-auto h-8 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 text-xs sm:text-sm font-medium transition-colors duration-200 disabled:opacity-50 gap-2"
            disabled={!account}
          >
            <Pencil className="h-4 w-4" />
            <span>Edit</span>
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-white via-purple-100/80 to-violet-100/70 dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-2xl px-6 py-5">
          {/* Gradient orbs background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
            <div
              className="absolute -top-40 -left-32 w-[420px] h-[420px] bg-purple-500/8 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse"
              style={{ animationDuration: '8s' }}
            />
            <div
              className="absolute -bottom-40 -right-32 w-[420px] h-[420px] bg-violet-500/8 dark:bg-violet-500/10 rounded-full blur-3xl animate-pulse"
              style={{ animationDuration: '10s', animationDelay: '2s' }}
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
          <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60" />

          <div className="relative">
            <AlertDialogHeader className="space-y-1.5 mb-4">
              <AlertDialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Edit account
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
                  className="h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Balance + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-account-balance"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Balance
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
                    className="h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300 text-slate-900 dark:text-slate-100"
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
                    <SelectTrigger className="h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 text-slate-900 dark:text-slate-100 transition-all duration-300">
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
                  onValueChange={(val: Mode) => setMode(val)}
                >
                  <SelectTrigger className="h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 text-slate-900 dark:text-slate-100 transition-all duration-300">
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
                  className="min-h-[80px] bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 backdrop-blur-sm p-3 border border-red-500/20">
                  <p className="text-xs text-red-500 dark:text-red-300 font-medium">
                    {error}
                  </p>
                </div>
              )}

              <AlertDialogFooter className="mt-4 flex items-center justify-between gap-2">
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

                {/* Plain submit button, NOT wrapped in AlertDialogAction */}
                <Button
                  type="submit"
                  disabled={submitting || !account}
                  className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0 disabled:opacity-60 text-sm"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {submitting && (
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
                    )}
                    Save changes
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
