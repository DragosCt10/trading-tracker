'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-date-range';
import { Search, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TradePreviewCard from './TradePreviewCard';
import { getUserTradesForPosting } from '@/lib/server/feedPosts';
import type { TradeSelectorItem, TradeSnapshot } from '@/types/social';

interface AttachTradeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (trade: TradeSelectorItem) => void;
}

function tradeToSnapshot(t: TradeSelectorItem): TradeSnapshot {
  return {
    id: t.id, market: t.market,
    direction: t.direction as 'long' | 'short',
    outcome: t.outcome as 'win' | 'loss' | 'be',
    rr: t.rr, riskPct: t.riskPct, pnl: t.pnl,
    currency: t.currency, entryDate: t.entryDate,
    mode: t.mode, screens: t.screens,
  };
}

const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);

export default function AttachTradeModal({ open, onClose, onSelect }: AttachTradeModalProps) {
  const [dateRange, setDateRange] = useState({
    startDate: format(thirtyDaysAgo, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  });
  const [trades, setTrades] = useState<TradeSelectorItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<TradeSelectorItem | null>(null);

  async function handleFind() {
    setLoading(true);
    setSearched(false);
    setPreview(null);
    try {
      const results = await getUserTradesForPosting(dateRange.startDate, dateRange.endDate);
      setTrades(results);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setTrades([]);
    setSearched(false);
    setPreview(null);
    onClose();
  }

  function handleSelect(trade: TradeSelectorItem) {
    onSelect(trade);
    handleClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">

        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl" />
        </div>

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Attach a Trade
              </AlertDialogTitle>
              <button
                onClick={handleClose}
                className="cursor-pointer rounded-sm h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </AlertDialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Step 1 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
              Step 1 · Select date range
            </p>
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-100 dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] shadow-sm [&_.rdrCalendarWrapper]:!w-full [&_.rdrCalendarWrapper]:bg-slate-100 [&_.rdrCalendarWrapper]:dark:bg-transparent [&_.rdrMonth]:!w-full [&_.rdrMonthAndYearWrapper]:!w-full">
              <div className="relative w-full py-2">
                <DateRange
                  ranges={[{
                    startDate: new Date(dateRange.startDate),
                    endDate: new Date(dateRange.endDate),
                    key: 'selection',
                  }]}
                  onChange={(ranges) => {
                    const { startDate, endDate } = ranges.selection;
                    setDateRange({
                      startDate: format(startDate ?? thirtyDaysAgo, 'yyyy-MM-dd'),
                      endDate: format(endDate ?? today, 'yyyy-MM-dd'),
                    });
                    setSearched(false);
                    setTrades([]);
                    setPreview(null);
                  }}
                  moveRangeOnFirstSelection={false}
                  editableDateInputs={false}
                  maxDate={today}
                  showMonthAndYearPickers
                  rangeColors={['var(--tc-primary, #8b5cf6)']}
                  direction="vertical"
                />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
              Step 2 · Find trades
            </p>
            <Button
              type="button"
              onClick={handleFind}
              disabled={loading}
              size="sm"
              className="themed-btn-primary cursor-pointer w-full sm:w-auto relative overflow-hidden rounded-xl text-white font-semibold border-0 px-4 py-2 group [&_svg]:text-white disabled:opacity-60"
            >
              <Search className="h-3.5 w-3.5" />
              {loading ? 'Searching…' : 'Find trades'}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>

            {searched && (
              trades.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No executed trades found in this period.
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {trades.length} trade{trades.length !== 1 ? 's' : ''} found — select one below.
                </p>
              )
            )}
          </div>

          {/* Step 3 */}
          {searched && trades.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
                Step 3 · Select a trade
              </p>
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-700/40">
                {trades.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPreview((prev) => prev?.id === t.id ? null : t)}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors text-left ${
                      preview?.id === t.id
                        ? 'bg-slate-100 dark:bg-slate-800/60'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{t.market}</span>
                      <span className="ml-2 text-xs text-slate-400 capitalize">{t.direction} · {t.outcome} · {t.entryDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/50 px-1.5 py-0.5 rounded">{t.mode}</span>
                      {preview?.id === t.id && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>

              {preview && (
                <div className="space-y-3 pt-1">
                  <TradePreviewCard snapshot={tradeToSnapshot(preview)} />
                  <Button
                    type="button"
                    onClick={() => handleSelect(preview)}
                    className="themed-btn-primary cursor-pointer w-full relative overflow-hidden rounded-xl text-white font-semibold border-0 group"
                  >
                    <Check className="w-4 h-4" />
                    <span className="relative z-10 text-sm">Attach this trade</span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
