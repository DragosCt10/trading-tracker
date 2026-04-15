'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
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
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Target } from 'lucide-react';
import { updateStrategy } from '@/lib/server/strategies';
import { Strategy } from '@/types/strategy';
import { ExtraCardsSelector } from '@/components/ExtraCardsSelector';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useSubscription } from '@/hooks/useSubscription';
import type { ExtraCardKey } from '@/constants/extraCards';

interface EditStrategyModalProps {
  strategy: Strategy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function EditStrategyModal({
  strategy,
  open,
  onOpenChange,
  onUpdated,
}: EditStrategyModalProps) {
  const [name, setName] = useState('');
  const [extraCards, setExtraCards] = useState<ExtraCardKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: userDetails } = useUserDetails();
  const { hasFeature } = useSubscription({ userId: userDetails?.user?.id });
  const canAccessAllCards = hasFeature('allExtraCards');

  useEffect(() => {
    if (strategy) {
      setName(strategy.name);
      setExtraCards(strategy.extra_cards ?? []);
      setError(null);
    }
  }, [strategy, open]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!strategy) return;

    if (!name.trim()) {
      setError('Please enter a Stats Board name.');
      return;
    }

    const extraCardsChanged =
      JSON.stringify([...extraCards].sort()) !==
      JSON.stringify([...(strategy.extra_cards ?? [])].sort());
    if (name.trim() === strategy.name && !extraCardsChanged) {
      onOpenChange(false);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: updateError } = await updateStrategy(
        strategy.id,
        strategy.user_id,
        name.trim(),
        extraCards
      );

      if (updateError) {
        setError(updateError.message);
        return;
      }

      if (data) {
        onOpenChange(false);
        onUpdated?.();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !submitting) {
      setName(strategy?.name || '');
      setExtraCards(strategy?.extra_cards ?? []);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  if (!strategy) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
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

        {/* Fixed Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              <div className="p-2 rounded-lg" style={{ background: 'var(--tc-subtle)', border: '1px solid var(--tc-border)' }}>
                <Target className="h-5 w-5" style={{ color: 'var(--tc-primary)' }} />
              </div>
              <span>Edit Stats Board</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Update your Stats Board name. The URL slug will be updated automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="relative flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <form id="edit-strategy-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-strategy-name"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Stats Board name
              </Label>
              <Input
                id="edit-strategy-name"
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
              canAccessAllCards={canAccessAllCards}
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
          <AlertDialogCancel
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            type="submit"
            form="edit-strategy-form"
            disabled={submitting || !name.trim() || (name.trim() === strategy.name && JSON.stringify([...extraCards].sort()) === JSON.stringify([...(strategy.extra_cards ?? [])].sort()))}
            className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 text-sm"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? 'Updating...' : 'Update Stats Board'}
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
