'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, ChevronDown, X, MessageSquarePlus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import TradePreviewCard from './TradePreviewCard';
import { getUserTradesForPosting, getWeeklyPostCount } from '@/lib/server/feedPosts';
import type { TradeSelectorItem, TradeSnapshot } from '@/types/social';
import type { ResolvedSubscription } from '@/types/subscription';

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    content: string;
    tradeId?: string;
    tradeMode?: 'live' | 'demo' | 'backtesting';
  }) => Promise<void>;
  subscription: ResolvedSubscription;
  userId: string;
  isSubmitting?: boolean;
  submitError?: string;
}

export default function CreatePostModal({
  open,
  onClose,
  onSubmit,
  subscription,
  userId,
  isSubmitting,
  submitError,
}: CreatePostModalProps) {
  const [content, setContent]           = useState('');
  const [trades, setTrades]             = useState<TradeSelectorItem[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<TradeSelectorItem | null>(null);
  const [tradeDropdownOpen, setTradeDropdownOpen] = useState(false);
  const [weeklyCount, setWeeklyCount]   = useState<{ used: number; resetDate: Date } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const maxLen    = subscription.definition.limits.maxPostContentLength;
  const canAttach = subscription.definition.features.socialFeedTradeAttach;
  const weeklyMax = subscription.definition.limits.maxPostsPerWeek;

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
    if (weeklyMax !== null) getWeeklyPostCount(userId).then(setWeeklyCount);
    if (canAttach) getUserTradesForPosting().then(setTrades);
  }, [open, userId, weeklyMax, canAttach]);

  const limitReached = weeklyMax !== null && weeklyCount !== null && weeklyCount.used >= weeklyMax;

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

  async function handleSubmit() {
    if (!content.trim() || isSubmitting || limitReached) return;
    await onSubmit({
      content: content.trim(),
      tradeId:   selectedTrade?.id,
      tradeMode: selectedTrade?.mode,
    });
    setContent('');
    setSelectedTrade(null);
  }

  const charLeft  = maxLen - content.length;
  const nearLimit = charLeft <= 30;

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">

        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl" />
        </div>

        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg themed-header-icon-box">
                  <MessageSquarePlus className="h-5 w-5" />
                </div>
                <span>Create Post</span>
              </AlertDialogTitle>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-sm ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            {weeklyMax !== null && weeklyCount !== null && (
              <AlertDialogDescription className={`text-xs ${limitReached ? 'text-rose-500 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {limitReached
                  ? `All ${weeklyMax} posts used this week. Resets ${weeklyCount.resetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} — upgrade to PRO for unlimited.`
                  : `${weeklyCount.used} of ${weeklyMax} posts used this week. Resets ${weeklyCount.resetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.`
                }
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Content textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                What's on your mind?
              </Label>
              <span className={`text-xs ${nearLimit ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {charLeft}
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={maxLen}
              rows={5}
              disabled={limitReached || isSubmitting}
              placeholder="Share your trade insight…"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/20 text-slate-900 dark:text-slate-100 text-[15px] leading-[1.65] placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 disabled:opacity-50"
            />
          </div>

          {/* Trade attachment — PRO only */}
          {canAttach && (
            <div className="space-y-2">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Attach a trade
              </Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTradeDropdownOpen((v) => !v)}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/20 text-sm text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                >
                  <span className={selectedTrade ? 'font-medium' : 'text-slate-400 dark:text-slate-500'}>
                    {selectedTrade
                      ? `${selectedTrade.market} · ${selectedTrade.direction} · ${selectedTrade.outcome.toUpperCase()}`
                      : 'Optional — select a trade'}
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedTrade && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="p-0.5 hover:text-rose-400 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSelectedTrade(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setSelectedTrade(null); } }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${tradeDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {tradeDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setTradeDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-48 overflow-y-auto rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-slate-900/10 dark:shadow-black/60">
                      {trades.length === 0
                        ? <p className="px-4 py-3 text-sm text-slate-400">No trades found</p>
                        : trades.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
                            onClick={() => { setSelectedTrade(t); setTradeDropdownOpen(false); }}
                          >
                            <span className="font-medium">{t.market}</span>
                            <span className="text-slate-400 text-xs capitalize">{t.direction} · {t.outcome} · {t.entryDate}</span>
                          </button>
                        ))
                      }
                    </div>
                  </>
                )}
              </div>

              {selectedTrade && (
                <TradePreviewCard snapshot={tradeToSnapshot(selectedTrade)} />
              )}
            </div>
          )}

          {/* Error */}
          {submitError && (
            <Alert variant="destructive" className="bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 backdrop-blur-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting || limitReached}
              className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60"
            >
              <span className="relative z-10 flex items-center gap-2 text-sm">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Posting…' : 'Post'}
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
