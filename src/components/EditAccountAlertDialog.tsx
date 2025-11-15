'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useUserDetails } from '@/hooks/useUserDetails';

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
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 shadow flex items-center gap-2">
      <svg
        className="w-5 h-5 text-green-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-green-800 font-normal">{message}</span>
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
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={!account}
          >
            Edit
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit account</AlertDialogTitle>
            <AlertDialogDescription>
              Update the settings for this account.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Account name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-account-name">Account name</Label>
              <Input
                id="edit-account-name"
                placeholder="Account name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Balance + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-account-balance">Balance</Label>
                <Input
                  id="edit-account-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select
                  value={currency}
                  onValueChange={(val: Currency) => setCurrency(val)}
                >
                  <SelectTrigger>
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

            {/* Mode */}
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select
                value={mode}
                onValueChange={(val: Mode) => setMode(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="backtesting">Backtesting</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-account-description">Description</Label>
              <Textarea
                id="edit-account-description"
                placeholder="Optional notes about this account…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive mt-1">
                {error}
              </p>
            )}

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (account) resetFormFromAccount();
                }}
              >
                Cancel
              </AlertDialogCancel>

              {/* Use asChild so the button submits the form */}
              <AlertDialogAction asChild>
                <Button type="submit" disabled={submitting || !account}>
                  {submitting && (
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
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
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
