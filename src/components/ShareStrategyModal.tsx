'use client';

import { useState, useMemo, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import { Copy, Link as LinkIcon, Loader2, Search, Share2 } from 'lucide-react';
import { Trade } from '@/types/trade';
import type { Strategy } from '@/types/strategy';
import {
  createStrategyShareAction,
  getStrategySharesAction,
  setStrategyShareActiveAction,
  deleteStrategyShareAction,
  type StrategyShareRow,
} from '@/lib/server/publicShares';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalShell } from '@/components/ui/ModalShell';
import { cn } from '@/lib/utils';
import type { DateRangeValue } from '@/components/dashboard/analytics/TradeFiltersBar';
import { useColorTheme } from '@/hooks/useColorTheme';

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
  const [appliedDateRange, setAppliedDateRange] = useState<DateRangeValue>({
    startDate: format(initialFrom, 'yyyy-MM-dd'),
    endDate: format(initialTo, 'yyyy-MM-dd'),
  });
  const [hasSearchedTrades, setHasSearchedTrades] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState<'Copy' | 'Copied!'>('Copy');
  const [isPending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const sharesQueryKey = queryKeys.strategyShares(strategy.id, userId, accountId, mode);
  const { colorTheme } = useColorTheme();

  const {
    data: existingShares = [],
    isLoading: loadingShares,
  } = useQuery({
    queryKey: sharesQueryKey,
    queryFn: () =>
      getStrategySharesAction({ strategyId: strategy.id, userId, accountId, mode }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasAppliedRange = hasSearchedTrades && Boolean(appliedDateRange.startDate && appliedDateRange.endDate);

  const filteredTrades = useMemo(() => {
    if (!hasAppliedRange || !appliedDateRange.startDate || !appliedDateRange.endDate) return [];
    const from = new Date(appliedDateRange.startDate);
    const to = new Date(appliedDateRange.endDate);
    const fromTime = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate(),
      0, 0, 0, 0
    ).getTime();
    const toTime = new Date(
      to.getFullYear(),
      to.getMonth(),
      to.getDate(),
      23, 59, 59, 999
    ).getTime();
    return trades.filter((t) => {
      const d = new Date(t.trade_date).getTime();
      return d >= fromTime && d <= toTime;
    });
  }, [trades, hasAppliedRange, appliedDateRange.startDate, appliedDateRange.endDate]);

  const executedTradesCount = useMemo(
    () => filteredTrades.filter((t) => t.executed !== false).length,
    [filteredTrades]
  );

  const canGenerate = hasAppliedRange && executedTradesCount > 0 && !isPending;

  const handleSearchTrades = () => {
    setAppliedDateRange(dateRange);
    setHasSearchedTrades(true);
    setShareUrl(null);
    setCopyLabel('Copy');
  };

  const handleGenerate = () => {
    if (!hasAppliedRange) return;
    startTransition(async () => {
      setCopyLabel('Copy');
      const { url, share, error } = await createStrategyShareAction({
        strategyId: strategy.id,
        accountId,
        mode,
        startDate: appliedDateRange.startDate,
        endDate: appliedDateRange.endDate,
        userId,
      });
      if (error || !url) return;
      const finalUrl =
        colorTheme != null
          ? `${url}${url.includes('?') ? '&' : '?'}theme=${encodeURIComponent(colorTheme)}`
          : url;
      setShareUrl(finalUrl);
      if (share) {
        queryClient.setQueryData<StrategyShareRow[]>(sharesQueryKey, (prev) => {
          if (!prev) return [share];
          if (prev.some((s) => s.id === share.id)) return prev;
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
    if (!hasAppliedRange) return '';
    if (executedTradesCount === 0) {
      return 'No executed trades in this period. Select a different range and search again.';
    }
    return `${executedTradesCount} executed trade${executedTradesCount === 1 ? '' : 's'} in this period.`;
  })();

  const handleClose = (next: boolean) => {
    if (!next) {
      setShareUrl(null);
      setCopyLabel('Copy');
      setHasSearchedTrades(false);
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
        queryClient.setQueryData<StrategyShareRow[]>(sharesQueryKey, (prev) =>
          prev?.map((s) => (s.id === share.id ? { ...s, active: nextActive } : s)) ?? []
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
      const { error } = await deleteStrategyShareAction({ shareId: share.id, userId });
      if (!error) {
        queryClient.setQueryData<StrategyShareRow[]>(sharesQueryKey, (prev) =>
          prev?.filter((s) => s.id !== share.id) ?? []
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyShareLink = async (share: StrategyShareRow) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = `/share/strategy/${share.share_token}`;
    let fullUrl = path.startsWith('http') ? path : `${origin}${path}`;
    if (colorTheme != null) {
      fullUrl += `${fullUrl.includes('?') ? '&' : '?'}theme=${encodeURIComponent(colorTheme)}`;
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedShareId(share.id);
      setTimeout(() => setCopiedShareId(null), 2000);
    } catch {
      // ignore
    }
  };

  const activeSharesSection = existingShares.length > 0 ? (
    <div className="space-y-2 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
        Active share links
      </p>
      <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyShareLink(share)}
                  className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 h-7 px-2.5 text-xs font-medium gap-1.5"
                  title="Copy share link"
                >
                  {copiedShareId === share.id ? (
                    'Copied!'
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy link
                    </>
                  )}
                </Button>
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
                  className="h-7 w-7 cursor-pointer rounded-full text-[11px] text-slate-500 hover:text-slate-600 hover:bg-slate-500/10 disabled:opacity-60"
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
  ) : null;

  return (
    <ModalShell
      open={open}
      onOpenChange={handleClose}
      icon={<Share2 className="h-5 w-5" />}
      title="Share strategy stats"
      description="Generate a public, read-only link for this strategy's performance over a specific date range. Viewers can't edit or see individual trades."
      mode={mode}
      belowScrollContent={activeSharesSection}
    >
      <div className="space-y-12">
        {/* Step 1: Date range selection */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
              Step 1 · Select date range
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Only trades in this window will be included in the shared analytics.
            </p>
          </div>

          <div className="w-full rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-100 dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-sm [&_.rdrCalendarWrapper]:!w-full [&_.rdrCalendarWrapper]:bg-slate-100 [&_.rdrCalendarWrapper]:dark:bg-transparent [&_.rdrMonth]:!w-full [&_.rdrMonthAndYearWrapper]:!w-full">
            <div className="relative w-full py-2">
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
                  setHasSearchedTrades(false);
                  setShareUrl(null);
                  setCopyLabel('Copy');
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

          <div className="flex flex-col items-start gap-2 w-full">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
              Step 2 · Look for the trades
            </p>
            <Button
              type="button"
              onClick={handleSearchTrades}
              size="sm"
              className="themed-btn-primary cursor-pointer w-full sm:w-auto relative overflow-hidden rounded-xl text-white font-semibold border-0 px-4 py-2 group [&_svg]:text-white"
            >
              <Search className="h-3.5 w-3.5" />
              Find trades
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </div>

          {hasAppliedRange && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selected: {format(new Date(appliedDateRange.startDate), 'MMM d, yyyy')}
                {appliedDateRange.startDate !== appliedDateRange.endDate &&
                  ` – ${format(new Date(appliedDateRange.endDate), 'MMM d, yyyy')}`}
              </p>
              <p className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {tradeSummary}
              </p>
            </>
          )}
        </div>

        {/* Step 3: Generate link */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
            Step 3 · Generate share link
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
                      : `${typeof window !== 'undefined' ? window.location.origin : ''}${shareUrl}`
                    : 'Link will appear here after generation'
                }
                className={cn(
                  'rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-900/40',
                  shareUrl
                    ? 'text-xs text-slate-700 dark:text-slate-200'
                    : 'text-[11px] text-slate-400 dark:text-slate-500 italic'
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!shareUrl}
                className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200 h-9 disabled:opacity-60"
              >
                {copyLabel}
              </Button>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Anyone with this link can view a read-only analytics dashboard for this strategy
              and date range. They won&apos;t be able to modify your data.
            </p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
