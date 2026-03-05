'use client';

import { useState, useMemo, useTransition } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Link as LinkIcon, Loader2, Share2 } from 'lucide-react';
import { Trade } from '@/types/trade';
import type { Strategy } from '@/types/strategy';
import { createStrategyShareAction } from '@/lib/server/publicShares';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type ShareStrategyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: Strategy;
  trades: Trade[];
  currencySymbol: string;
  accountId: string;
  mode: 'live' | 'backtesting' | 'demo';
  userId: string;
};

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export function ShareStrategyModal({
  open,
  onOpenChange,
  strategy,
  trades,
  currencySymbol,
  accountId,
  mode,
  userId,
}: ShareStrategyModalProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: trades.length ? new Date(trades[trades.length - 1].trade_date) : undefined,
    to: trades.length ? new Date(trades[0].trade_date) : undefined,
  });
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState<'Copy' | 'Copied!'>('Copy');
  const [isPending, startTransition] = useTransition();

  const hasRange = Boolean(dateRange.from && dateRange.to);

  const filteredTrades = useMemo(() => {
    if (!hasRange || !dateRange.from || !dateRange.to) return [];
    const from = dateRange.from;
    const to = dateRange.to;
    const fromTime = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate(),
      0,
      0,
      0,
      0
    ).getTime();
    const toTime = new Date(
      to.getFullYear(),
      to.getMonth(),
      to.getDate(),
      23,
      59,
      59,
      999
    ).getTime();
    return trades.filter((t) => {
      const d = new Date(t.trade_date).getTime();
      return d >= fromTime && d <= toTime;
    });
  }, [trades, hasRange, dateRange.from, dateRange.to]);

  const executedTradesCount = useMemo(
    () => filteredTrades.filter((t) => t.executed !== false).length,
    [filteredTrades]
  );

  const canGenerate = hasRange && executedTradesCount > 0 && !isPending;

  const handleGenerate = () => {
    if (!hasRange || !dateRange.from || !dateRange.to) return;
    startTransition(async () => {
      setCopyLabel('Copy');
      const { url, error } = await createStrategyShareAction({
        strategyId: strategy.id,
        accountId,
        mode,
        startDate: format(dateRange.from!, 'yyyy-MM-dd'),
        endDate: format(dateRange.to!, 'yyyy-MM-dd'),
        userId,
      });
      if (error || !url) {
        return;
      }
      setShareUrl(url);
    });
  };

  const handleCopy = async () => {
    if (!shareUrl || typeof window === 'undefined') return;
    const origin = window.location.origin;
    const fullUrl = shareUrl.startsWith('http') ? shareUrl : `${origin}${shareUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 2000);
    } catch {
      // ignore
    }
  };

  const tradeSummary = (() => {
    if (!hasRange) return 'Select a date range to preview trade count.';
    if (executedTradesCount === 0) {
      return 'No executed trades in this period. Select a different range to enable sharing.';
    }
    const totalProfit = filteredTrades.reduce(
      (sum, t) => sum + (t.calculated_profit ?? 0),
      0
    );
    return `${executedTradesCount} executed trade${
      executedTradesCount === 1 ? '' : 's'
    } in this period, total P&L ${currencySymbol}${totalProfit.toFixed(2)}.`;
  })();

  const handleClose = (next: boolean) => {
    if (!next) {
      setShareUrl(null);
      setCopyLabel('Copy');
    }
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] flex flex-col fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl px-6 py-5 overflow-hidden">
        {/* Gradient orbs background (match CreateStrategyModal) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl" />
          <div className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl" />
        </div>

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Scrollable body */}
        <div className="relative flex-1 min-h-0 overflow-y-auto">
          <AlertDialogHeader className="space-y-1.5 mb-4">
            <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              <div className="p-2 rounded-lg themed-header-icon-box">
                <Share2 className="h-5 w-5" />
              </div>
              <span>Share strategy stats</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Generate a public, read-only link for this strategy&apos;s performance over a specific
              date range. Viewers can&apos;t edit or see individual trades.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-6">
            {/* Step 1: Date range selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Step 1 · Select date range
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Only trades in this window will be included in the shared analytics.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[11px] border-slate-300/70 dark:border-slate-700"
                >
                  {mode.toUpperCase()} MODE
                </Badge>
              </div>

              <button
                type="button"
                onClick={() => undefined}
                className="w-full rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {hasRange && dateRange.from && dateRange.to
                      ? `${format(dateRange.from, 'MMM d, yyyy')} – ${format(
                          dateRange.to,
                          'MMM d, yyyy'
                        )}`
                      : 'Choose a date range'}
                  </span>
                </div>
              </button>

              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-900/30 p-2">
                <Calendar
                  mode="range"
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) =>
                    setDateRange({
                      from: range?.from,
                      to: range?.to ?? range?.from,
                    })
                  }
                  numberOfMonths={2}
                  className="rounded-xl bg-transparent"
                  classNames={{
                    day_selected:
                      'bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white',
                    day_range_middle:
                      'bg-emerald-500/10 text-slate-900 dark:text-slate-50',
                  }}
                />
              </div>

              <p
                className={cn(
                  'text-xs',
                  executedTradesCount === 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {tradeSummary}
              </p>
            </div>

            {/* Step 2: Generate link */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Step 2 · Generate share link
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium h-9"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating…</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span>Generate Link</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    readOnly
                    value={
                      shareUrl
                        ? shareUrl.startsWith('http')
                          ? shareUrl
                          : `${
                              typeof window !== 'undefined' ? window.location.origin : ''
                            }${shareUrl}`
                        : 'Link will appear here after generation'
                    }
                    className="text-xs rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!shareUrl}
                    className="rounded-xl text-xs h-9"
                  >
                    {copyLabel}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-500">
                  Anyone with this link can view a read-only analytics dashboard for this strategy
                  and date range. They won&apos;t be able to modify your data.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer pinned at bottom */}
        <AlertDialogFooter className="relative flex-shrink-0 flex items-center justify-end pt-4 mt-2 border-t border-slate-200/50 dark:border-slate-700/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
          >
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
