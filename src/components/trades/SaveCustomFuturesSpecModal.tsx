'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

import {
  FUTURES_SPECS,
  validateCustomFuturesSpec,
  normalizeFuturesSymbol,
} from '@/constants/futuresSpecs';
import { upsertCustomFuturesSpec } from '@/lib/server/settings';
import { useUserDetails } from '@/hooks/useUserDetails';
import { queryKeys } from '@/lib/queryKeys';
import type { CustomFuturesSpec } from '@/types/account-settings';

interface SaveCustomFuturesSpecModalProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Setter for `open` (controlled). */
  onOpenChange: (open: boolean) => void;
  /**
   * Initial values to seed the form. For "save symbol from trade form" the caller
   * pre-fills `symbol` and `dollarPerSlUnit` from what the user already typed; the
   * user only fills in `slUnitLabel` and (optionally) `label`. For "edit saved
   * spec" all four are pre-filled.
   */
  initialValues?: Partial<{
    symbol: string;
    label: string;
    dollarPerSlUnit: number;
    slUnitLabel: string;
  }>;
  /** Called after successful save with the persisted spec. */
  onSaved?: (spec: CustomFuturesSpec) => void;
  /** When true, the symbol field is disabled (e.g. editing an existing spec). */
  symbolLocked?: boolean;
}

/**
 * Inline modal for saving a custom futures contract spec to user_settings.custom_futures_specs.
 *
 * Opened from two places:
 *   1. NewTradeModal — when the user enters an unknown market and checks the
 *      "Save {symbol} for future trades" checkbox.
 *   2. CustomFuturesSpecsPanel (settings) — for "Add new" and "Edit" actions.
 *
 * Uses the canonical validators from @/constants/futuresSpecs so the rules stay
 * in sync with the server-side check (regex, hardcoded-collision, NaN guard).
 */
export function SaveCustomFuturesSpecModal({
  open,
  onOpenChange,
  initialValues,
  onSaved,
  symbolLocked = false,
}: SaveCustomFuturesSpecModalProps) {
  const queryClient = useQueryClient();
  const { data: userId } = useUserDetails();

  const [symbol, setSymbol] = useState('');
  const [label, setLabel] = useState('');
  const [dollarPerSlUnit, setDollarPerSlUnit] = useState('');
  const [slUnitLabel, setSlUnitLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form on open. Each open re-derives from props so a stale state from
  // a previous edit doesn't leak into a new "save symbol" flow.
  useEffect(() => {
    if (!open) return;
    setSymbol(initialValues?.symbol ?? '');
    setLabel(initialValues?.label ?? '');
    setDollarPerSlUnit(
      initialValues?.dollarPerSlUnit != null ? String(initialValues.dollarPerSlUnit) : '',
    );
    setSlUnitLabel(initialValues?.slUnitLabel ?? '');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Live client-side validation (mirrors server validateCustomFuturesSpec).
  const symbolNorm = normalizeFuturesSymbol(symbol);
  const parsedDollar = Number(dollarPerSlUnit);
  const liveValidation = (() => {
    if (!symbolNorm) return null; // user hasn't typed yet
    if (FUTURES_SPECS[symbolNorm]) {
      return `${symbolNorm} is already in the catalog — no need to save it. Just type ${symbolNorm} in your trade form and the spec will auto-fill.`;
    }
    return validateCustomFuturesSpec({
      symbol: symbolNorm,
      dollarPerSlUnit: parsedDollar,
      slUnitLabel: slUnitLabel.trim(),
      label: label.trim() || undefined,
    });
  })();

  const canSubmit =
    !submitting &&
    symbolNorm.length > 0 &&
    Number.isFinite(parsedDollar) &&
    parsedDollar > 0 &&
    slUnitLabel.trim().length > 0 &&
    !liveValidation;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const { data, error: saveError } = await upsertCustomFuturesSpec({
      symbol: symbolNorm,
      label: label.trim() || undefined,
      dollarPerSlUnit: parsedDollar,
      slUnitLabel: slUnitLabel.trim(),
    });

    if (saveError || !data) {
      setError(saveError?.message ?? 'Failed to save symbol.');
      setSubmitting(false);
      return;
    }

    // Invalidate settings so the trade form's spec resolver picks up tier-2 immediately.
    if (userId?.user?.id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings(userId.user.id) });
    }

    onSaved?.(data);
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden focus:outline-none focus-visible:outline-none">
        {/* Gradient orbs background — fixed to modal (theme-aware via --orb-1/--orb-2) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl" />
        </div>

        {/* Noise texture overlay — fixed to modal */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Top accent line (theme-aware via --tc-primary) */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Fixed Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg themed-header-icon-box">
                  <Save className="h-5 w-5" />
                </div>
                <span>{symbolLocked ? 'Edit futures symbol' : 'Save futures symbol'}</span>
              </AlertDialogTitle>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer rounded-sm ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              The next time you log a trade on this symbol the form will auto-fill the dollar
              multiplier and unit label.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Scrollable content wrapper */}
        <div className="relative overflow-y-auto overflow-x-hidden flex-1 px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Symbol
              </Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. MES"
                disabled={symbolLocked}
                maxLength={16}
                className="themed-focus h-11 bg-slate-100/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Label <span className="text-slate-400">(optional)</span>
              </Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Micro E-mini S&P 500"
                maxLength={80}
                className="themed-focus h-11 bg-slate-100/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  $ per SL-unit
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={dollarPerSlUnit}
                  onChange={(e) => setDollarPerSlUnit(e.target.value)}
                  placeholder="50"
                  className="themed-focus h-11 bg-slate-100/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Unit label
                </Label>
                <Input
                  value={slUnitLabel}
                  onChange={(e) => setSlUnitLabel(e.target.value)}
                  placeholder="e.g. point, tick (1/32), pip"
                  maxLength={40}
                  className="themed-focus h-11 bg-slate-100/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700"
                  required
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-relaxed">
              Risk per trade = <span className="font-mono">contracts × SL × $/SL-unit</span>.
              Verify against your broker statement on the first trade.
            </p>

            {(liveValidation || error) && (
              <div className="rounded-lg bg-red-500/10 backdrop-blur-sm p-3 border border-red-500/20">
                <p className="text-xs text-red-500 dark:text-red-300 font-medium">
                  {error ?? liveValidation}
                </p>
              </div>
            )}

            <AlertDialogFooter className="mt-4 flex items-center justify-between">
              <AlertDialogCancel
                type="button"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </AlertDialogCancel>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="themed-btn-primary cursor-pointer rounded-xl text-white font-semibold px-4 py-2 border-0 disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-2 text-sm">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Saving' : 'Save symbol'}
                </span>
              </Button>
            </AlertDialogFooter>
          </form>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
