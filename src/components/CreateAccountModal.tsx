'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createAccount } from '@/lib/server/accounts';
import { useUserDetails } from '@/hooks/useUserDetails';
import { AlertCircle, Loader2, UserPlus } from 'lucide-react';

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
  user_id: string;
  name: string;
  account_balance: number;
  currency: string;
  mode: string;
  description: string | null;
  is_active: boolean;
};

interface CreateAccountAlertDialogProps {
  onCreated?: (created: AccountSettings) => void;
}

export function CreateAccountAlertDialog({ onCreated }: CreateAccountAlertDialogProps) {
  const queryClient = useQueryClient();
  const { data: userId } = useUserDetails();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressDialog, setProgressDialog] = useState<{
    open: boolean;
    status: 'loading' | 'success' | 'error';
    message: string;
  }>({ open: false, status: 'loading', message: '' });

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [mode, setMode] = useState<Mode>('live');
  const [description, setDescription] = useState('');

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
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
    setProgressDialog({ open: true, status: 'loading', message: 'Please wait while we save your account...' });

    try {
      const { data, error: insertError } = await createAccount({
        name: name.trim(),
        account_balance: parsedBalance,
        currency,
        mode,
        description: description.trim() || null,
      });

      if (insertError) {
        setProgressDialog({
          open: true,
          status: 'error',
          message: insertError.message ?? 'Failed to create account. Please try again.',
        });
        setSubmitting(false);
        return;
      }

      if (!data) {
        setProgressDialog({
          open: true,
          status: 'error',
          message: 'Failed to create account. Please try again.',
        });
        setSubmitting(false);
        return;
      }

      const createdAccount = data as AccountSettings;

      setProgressDialog({
        open: true,
        status: 'success',
        message: 'Account created successfully. You can now select it in the action bar.',
      });

      onCreated?.(createdAccount);
      await queryClient.invalidateQueries();
      resetForm();
      setOpen(false);

      setTimeout(() => {
        setProgressDialog({ open: false, status: 'loading', message: '' });
        setSubmitting(false);
      }, 5000);
    } catch {
      setProgressDialog({
        open: true,
        status: 'error',
        message: 'Failed to create account. Please check your data and try again.',
      });
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
            className="cursor-pointer w-full lg:w-auto relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0"
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
              <UserPlus className="h-4 w-4" />
              <span>New Account</span>
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
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

          {/* Noise texture overlay */}
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
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-700/50">
                  <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
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
                  className="h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300 text-slate-900 dark:text-slate-100"
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
                    className="h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300 text-slate-900 dark:text-slate-100"
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

              <div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Mode
                </Label>
                <Select
                  value={mode}
                  onValueChange={(val: Mode) => setMode(val)}
                >
                  <SelectTrigger className="h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 text-slate-900 dark:text-slate-100 transition-all duration-300">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
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
                  className="min-h-[80px] bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300"
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
                  disabled={!canSubmit}
                  className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0 disabled:opacity-60"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
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
                    Create Account
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                </Button>
              </AlertDialogFooter>
            </form>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Dialog - same pattern as NewTradeModal */}
      <AlertDialog
        open={progressDialog.open}
        onOpenChange={() => {
          if (progressDialog.status !== 'loading') {
            setProgressDialog({ open: false, status: 'loading', message: '' });
          }
        }}
      >
        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-white via-purple-100/80 to-violet-100/70 dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {progressDialog.status === 'loading' && (
                <span className="text-purple-600 dark:text-purple-400 font-semibold text-lg flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating Account
                </span>
              )}
              {progressDialog.status === 'success' && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-lg flex items-center gap-2">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Account Created Successfully
                </span>
              )}
              {progressDialog.status === 'error' && (
                <span className="text-red-500 dark:text-red-400 font-semibold text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Error Creating Account
                </span>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-slate-600 dark:text-slate-400">
                {progressDialog.message}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {progressDialog.status === 'error' && (
            <AlertDialogFooter className="flex gap-3">
              <Button
                onClick={() => setProgressDialog({ open: false, status: 'loading', message: '' })}
                className="cursor-pointer rounded-xl border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
              >
                Close
              </Button>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
