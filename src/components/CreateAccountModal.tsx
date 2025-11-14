'use client';

import * as React from 'react';
import { useState } from 'react';
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

// Optional: use a tailwind alert for success message
function SuccessAlert({ message, onClose }: { message: string; onClose: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed left-1/2 z-50 -translate-x-1/2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-none flex items-center gap-2">
      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
      </svg>
      <span className="text-green-800 font-normal">{message}</span>
    </div>
  );
}

type Mode = 'live' | 'backtesting' | 'demo';
type Currency = 'EUR' | 'USD' | 'GBP';

export function CreateAccountAlertDialog() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: userId } = useUserDetails();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [mode, setMode] = useState<Mode>('live');
  const [description, setDescription] = useState('');

  // New: required fields validation state
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

    // Prevent submit if required fields are not selected/valid
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
      const { error: insertError } = await supabase
        .from('account_settings')
        .insert({
          user_id: userId.user.id,
          name,
          account_balance: parsedBalance,
          currency,
          mode,
          description: description || null,
          // you can tweak defaults here if you want:
          is_active: false,
        } as never);

      if (insertError) {
        setError(insertError.message ?? 'Failed to create account.');
        return;
      }

      queryClient.invalidateQueries();

      resetForm();
      setOpen(false);
      setSuccess('Account created successfully!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {success && <SuccessAlert message={success} onClose={() => setSuccess(null)} />}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button type="button" size="sm" className="cursor-pointer">
            New Account
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Create a new account</AlertDialogTitle>
            <AlertDialogDescription>
              Set up a new trading account. You can change these settings later.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Account name */}
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Account name</Label>
              <Input
                id="account-name"
                placeholder="My account"
                className="shadow-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Balance + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="account-balance">Balance</Label>
                <Input
                  id="account-balance"
                  type="number"
                  className="shadow-none"
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
                  <SelectTrigger className="shadow-none">
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
                <SelectTrigger className="shadow-none">
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
              <Label htmlFor="account-description">Description</Label>
              <Textarea
                className="shadow-none"
                id="account-description"
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
                  resetForm();
                }}
                className="cursor-pointer"
              >
                Cancel
              </AlertDialogCancel>

              {/* Use asChild so we can submit the form */}
              <AlertDialogAction asChild>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="cursor-pointer"
                >
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
                  Create Account
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
