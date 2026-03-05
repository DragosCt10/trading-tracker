'use client';

import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import { CalendarIcon, Link as LinkIcon, Loader2, Share2 } from 'lucide-react';
import { Trade } from '@/types/trade';
import type { Strategy } from '@/types/strategy';
import {
  createStrategyShareAction,
  getStrategySharesAction,
  setStrategyShareActiveAction,
  deleteStrategyShareAction,
  type StrategyShareRow,
} from '@/lib/server/publicShares';
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
import { cn } from '@/lib/utils';
import type { DateRangeValue } from '@/components/dashboard/analytics/TradeFiltersBar';

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
  const initialFrom = trades.length
    ? new Date(trades[trades.length - 1].trade_date)
    : new Date();
  const initialTo = trades.length ? new Date(trades[0].trade_date) : initialFrom;

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: format(initialFrom, 'yyyy-MM-dd'),
    endDate: format(initialTo, 'yyyy-MM-dd'),
  });
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState<'Copy' | 'Copied!'>('Copy');
  const [isPending, startTransition] = useTransition();
  const [showCalendar, setShowCalendar] = useState(false);
  const [existingShares, setExistingShares] = useState<StrategyShareRow[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dateRangeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const hasRange = Boolean(dateRange.startDate && dateRange.endDate);

  const filteredTrades = useMemo(() => {
    if (!hasRange || !dateRange.startDate || !dateRange.endDate) return [];
    const from = new Date(dateRange.startDate);
    const to = new Date(dateRange.endDate);
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
  }, [trades, hasRange, dateRange.startDate, dateRange.endDate]);

  const executedTradesCount = useMemo(
    () => filteredTrades.filter((t) => t.executed !== false).length,
    [filteredTrades]
  );

  const canGenerate = hasRange && executedTradesCount > 0 && !isPending;

  const handleGenerate = () => {
    if (!hasRange) return;
    startTransition(async () => {
      setCopyLabel('Copy');
      const { url, share, error } = await createStrategyShareAction({
        strategyId: strategy.id,
        accountId,
        mode,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        userId,
      });
      if (error || !url) {
        return;
      }
      setShareUrl(url);
      if (share) {
        // Ensure we don't add duplicates if a share for this range already existed
        setExistingShares((prev) => {
          if (prev.some((s) => s.id === share.id)) {
            return prev;
          }
          return [share, ...prev];
        });
      }
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
    return `${executedTradesCount} executed trade${
      executedTradesCount === 1 ? '' : 's'
    } in this period.`;
  })();

  // Click-outside to close date picker (same approach as TradeFiltersBar)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showCalendar) return;

      const target = event.target as Node;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        dateRangeTriggerRef.current &&
        !dateRangeTriggerRef.current.contains(target)
      ) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingShares(true);
      try {
        const shares = await getStrategySharesAction({
          strategyId: strategy.id,
          userId,
          accountId,
          mode,
        });
        if (!cancelled) {
          setExistingShares(shares);
        }
      } finally {
        if (!cancelled) setLoadingShares(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, strategy.id, userId, accountId, mode]);

  const handleClose = (next: boolean) => {
    if (!next) {
      setShareUrl(null);
      setCopyLabel('Copy');
    }
    onOpenChange(next);
  };

  const handleToggleShareActive = async (share: StrategyShareRow) => {
    const nextActive = !share.active;
    setRevokingId(share.id);
    try {
      const { error } = await setStrategyShareActiveAction({
        shareId: share.id,
        userId,
        active: nextActive,
      });
      if (!error) {
        setExistingShares((prev) =>
          prev.map((s) => (s.id === share.id ? { ...s, active: nextActive } : s))
        );
      }
    } finally {
      setRevokingId(null);
    }
  };

  const handleDeleteShare = async (share: StrategyShareRow) => {
    if (deletingId) return;
    setDeletingId(share.id);
    try {
      const { error } = await deleteStrategyShareAction({
        shareId: share.id,
        userId,
      });
      if (!error) {
        setExistingShares((prev) => prev.filter((s) => s.id !== share.id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] flex flex-col fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl px-6 py-5">
        {/* Gradient orbs background (match CreateStrategyModal) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl" />
          <div className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl" />
        </div>

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Body (no internal scroll so dropdown calendar is fully visible) */}
        <div className="relative flex-1 min-h-0">
          <AlertDialogHeader className="mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  <div className="p-2 rounded-lg themed-header-icon-box">
                    <Share2 className="h-5 w-5" />
                  </div>
                  <span>Share strategy stats</span>
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                  Generate a public, read-only link for this strategy&apos;s performance over a
                  specific date range. Viewers can&apos;t edit or see individual trades.
                </AlertDialogDescription>
              </div>
              <Badge
                variant="outline"
                className="text-[11px] border-slate-300/70 dark:border-slate-700 whitespace-nowrap self-start"
              >
                {mode.toUpperCase()} MODE
              </Badge>
            </div>
          </AlertDialogHeader>

          <div className="space-y-6">
            {/* Step 1: Date range selection */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Step 1 · Select date range
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Only trades in this window will be included in the shared analytics.
                </p>
              </div>

              <div className="relative">
                <button
                  ref={dateRangeTriggerRef}
                  type="button"
                  onClick={() => setShowCalendar((v) => !v)}
                  className="w-full rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/40 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {hasRange
                        ? `${dateRange.startDate} ~ ${dateRange.endDate}`
                        : 'Select date range'}
                    </span>
                  </div>
                </button>

                {showCalendar && (
                  <div
                    ref={pickerRef}
                    className="absolute left-0 z-[10000] mt-2 rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50 dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-lg shadow-slate-300/30 dark:shadow-slate-900/30"
                  >
                    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl hidden dark:block">
                      <div className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl" />
                      <div className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl" />
                    </div>
                    <div
                      className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl hidden dark:block"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'repeat',
                      }}
                    />
                    <div className="absolute -top-px left-0 right-0 h-0.5 opacity-60 hidden dark:block" style={{ background: 'linear-gradient(to right, transparent, var(--tc-primary), transparent)' }} />

                    <div className="relative p-2">
                      <DateRange
                        ranges={[
                          {
                            startDate: new Date(dateRange.startDate),
                            endDate: new Date(dateRange.endDate),
                            key: 'selection',
                          },
                        ]}
                        onChange={(ranges) => {
                          const { startDate, endDate } = ranges.selection;
                          const safeStart = startDate ?? initialFrom;
                          const safeEnd = endDate ?? safeStart;
                          setDateRange({
                            startDate: format(safeStart, 'yyyy-MM-dd'),
                            endDate: format(safeEnd, 'yyyy-MM-dd'),
                          });
                        }}
                        moveRangeOnFirstSelection={false}
                        editableDateInputs={false}
                        maxDate={new Date()}
                        showMonthAndYearPickers
                        rangeColors={['var(--tc-primary, #8b5cf6)']}
                        direction="vertical"
                      />
                    </div>
                  </div>
                )}
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
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  size="sm"
                  className="themed-btn-primary cursor-pointer w-full sm:w-auto relative overflow-hidden rounded-xl text-white font-semibold border-0 px-4 py-2 group [&_svg]:text-white disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Generating…</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4" />
                      <span className="text-sm">Generate Link</span>
                    </>
                  )}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
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

        {existingShares.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Active share links
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-1">
              Turn a link off to immediately make it private.
            </p>
            <div className="space-y-2">
              {existingShares.map((share) => {
                const rangeLabel = `${share.start_date} ~ ${share.end_date}`;
                const createdLabel = new Date(share.created_at).toLocaleDateString();
                const isRevoking = revokingId === share.id;
                const isDeleting = deletingId === share.id;
                return (
                  <div
                    key={share.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
                        {rangeLabel}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Created {createdLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleShareActive(share)}
                        disabled={isRevoking || isDeleting}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer border',
                          share.active
                            ? 'bg-emerald-500/90 border-emerald-400/80'
                            : 'bg-slate-500/40 border-slate-400/60',
                          (isRevoking || isDeleting) && 'opacity-60 cursor-wait'
                        )}
                        aria-label={share.active ? 'Disable public link' : 'Enable public link'}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                            share.active ? 'translate-x-[22px]' : 'translate-x-[4px]'
                          )}
                        />
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteShare(share)}
                        disabled={isDeleting || isRevoking}
                        className="h-7 w-7 rounded-full text-[11px] text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-60"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
