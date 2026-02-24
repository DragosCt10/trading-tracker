'use client';

import * as React from 'react';
import { useState } from 'react';
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
import { useUserDetails } from '@/hooks/useUserDetails';

interface CreateStrategyModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
  trigger?: React.ReactNode;
}

export function CreateStrategyModal({ open: controlledOpen, onOpenChange, onCreated, trigger }: CreateStrategyModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen: (value: boolean) => void = onOpenChange || setInternalOpen;
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: userId } = useUserDetails();

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
      const { data, error: createError } = await createStrategy(userId.user.id, name.trim());

      if (createError) {
        setError(createError.message);
        return;
      }

      if (data) {
        setName('');
        setOpen(false);
        onCreated?.();
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
      setError(null);
    }
    setOpen(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {trigger && !controlledOpen && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-2xl px-6 py-5">
        {/* Gradient orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div
            className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
          />
        </div>

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        <div className="relative">
          <AlertDialogHeader className="space-y-1.5 mb-4">
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

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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

            {error && (
              <div className="rounded-lg bg-red-500/10 backdrop-blur-sm p-4 border border-red-500/20">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <AlertDialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
                className="border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !name.trim()}
                className="relative w-full sm:w-auto overflow-hidden themed-btn-primary text-white font-semibold px-4 py-2 group border-0"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                  {submitting ? 'Creating...' : 'Create Strategy'}
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </AlertDialogFooter>
          </form>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
