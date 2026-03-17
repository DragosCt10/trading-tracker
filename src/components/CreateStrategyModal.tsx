'use client';

import * as React from 'react';
import { useState } from 'react';
import { useProgressDialog } from '@/hooks/useProgressDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Target } from 'lucide-react';
import { createStrategy } from '@/lib/server/strategies';
import type { Strategy } from '@/types/strategy';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useSubscription } from '@/hooks/useSubscription';
import { ExtraCardsSelector } from '@/components/ExtraCardsSelector';
import type { ExtraCardKey } from '@/constants/extraCards';

interface CreateStrategyModalProps {
  accountId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (strategy: Strategy) => void;
  trigger?: React.ReactNode;
}

export function CreateStrategyModal({ accountId, open: controlledOpen, onOpenChange, onCreated, trigger }: CreateStrategyModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen: (value: boolean) => void = onOpenChange || setInternalOpen;
  const [name, setName] = useState('');
  const [extraCards, setExtraCards] = useState<ExtraCardKey[]>([]);
  const { error, setError } = useProgressDialog();
  const [submitting, setSubmitting] = useState(false);
  const { data: userId } = useUserDetails();
  const { isPro } = useSubscription({ userId: userId?.user?.id });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a strategy name.');
      return;
    }

    if (!userId?.user?.id) {
      setError('User not found. Please log in again.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: createError } = await createStrategy(userId.user.id, name.trim(), extraCards, accountId);

      if (createError) {
        setError(createError.message);
        return;
      }

      if (data) {
        setName('');
        setExtraCards([]);
        setOpen(false);
        onCreated?.(data);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !submitting) {
      setName('');
      setExtraCards([]);
      setError(null);
    }
    setOpen(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {trigger && !controlledOpen && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className="max-w-lg max-h-[90vh] flex flex-col fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 overflow-hidden">
        {/* Gradient orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div
            className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl"
          />
          <div
            className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl"
          />
        </div>

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Fixed Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              <div className="p-2 rounded-lg themed-header-icon-box">
                <Target className="h-5 w-5" />
              </div>
              <span>Create new strategy</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Add a new trading strategy to track your performance separately.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="relative flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <form id="create-strategy-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="strategy-name"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Strategy name
              </Label>
              <Input
                id="strategy-name"
                placeholder="e.g., Bos + FVG"
                className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <ExtraCardsSelector
              selected={extraCards}
              onChange={setExtraCards}
              disabled={submitting}
              isPro={isPro}
            />

            {error && (
              <div className="rounded-lg bg-red-500/10 backdrop-blur-sm p-4 border border-red-500/20">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer outside scroll area so it stays pinned */}
        <AlertDialogFooter className="relative flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-5 border-t border-slate-200/50 dark:border-slate-700/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-strategy-form"
            disabled={submitting || !name.trim()}
            className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 text-sm"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? 'Creating...' : 'Create Strategy'}
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
