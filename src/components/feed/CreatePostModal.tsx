'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [content, setContent] = useState('');
  const [trades, setTrades]   = useState<TradeSelectorItem[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<TradeSelectorItem | null>(null);
  const [tradeDropdownOpen, setTradeDropdownOpen] = useState(false);
  const [weeklyCount, setWeeklyCount] = useState<{ used: number; resetDate: Date } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const maxLen   = subscription.definition.limits.maxPostContentLength;
  const canAttach = subscription.definition.features.socialFeedTradeAttach;
  const weeklyMax = subscription.definition.limits.maxPostsPerWeek;

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();

    // Fetch weekly count for starters
    if (weeklyMax !== null) {
      getWeeklyPostCount(userId).then(setWeeklyCount);
    }

    // Fetch trades for PRO
    if (canAttach) {
      getUserTradesForPosting().then(setTrades);
    }
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

  const charLeft = maxLen - content.length;
  const nearLimit = charLeft <= 30;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-700/40">
          <DialogTitle className="text-base font-semibold text-slate-100">
            Create post
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Weekly counter for starter */}
          {weeklyMax !== null && weeklyCount !== null && (
            <p className={`text-xs ${limitReached ? 'text-rose-400' : 'text-slate-500'}`}>
              {limitReached
                ? `All ${weeklyMax} posts used this week. Resets ${weeklyCount.resetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} — upgrade to PRO for unlimited.`
                : `${weeklyCount.used} of ${weeklyMax} posts used this week. Resets ${weeklyCount.resetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.`
              }
            </p>
          )}

          {/* Content textarea */}
          <div className="space-y-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={maxLen}
              rows={4}
              disabled={limitReached || isSubmitting}
              placeholder="Share your trade insight…"
              className="w-full px-4 py-3 rounded-xl border border-slate-700/60 bg-slate-800/50 text-slate-100 text-[15px] leading-[1.65] placeholder:text-slate-500 resize-none focus:outline-none focus:border-slate-500/80 transition-colors duration-200 disabled:opacity-50"
            />
            <p className={`text-right text-xs ${nearLimit ? 'text-amber-400' : 'text-slate-500'}`}>
              {charLeft}
            </p>
          </div>

          {/* Trade attachment (PRO only) */}
          {canAttach && (
            <div className="space-y-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTradeDropdownOpen((v) => !v)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl border border-slate-700/60 bg-slate-800/50 text-sm text-slate-300 hover:border-slate-600/80 transition-colors duration-200"
                >
                  <span>{selectedTrade ? `${selectedTrade.market} · ${selectedTrade.direction} · ${selectedTrade.outcome.toUpperCase()}` : 'Attach a trade (optional)'}</span>
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
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-48 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-800/95 backdrop-blur-xl shadow-xl">
                      {trades.length === 0
                        ? <p className="px-3 py-2 text-sm text-slate-500">No trades found</p>
                        : trades.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors text-left"
                            onClick={() => { setSelectedTrade(t); setTradeDropdownOpen(false); }}
                          >
                            <span className="font-medium">{t.market}</span>
                            <span className="text-slate-500 text-xs capitalize">{t.direction} · {t.outcome} · {t.entryDate}</span>
                          </button>
                        ))
                      }
                    </div>
                  </>
                )}
              </div>

              {/* Trade preview */}
              {selectedTrade && (
                <TradePreviewCard snapshot={tradeToSnapshot(selectedTrade)} />
              )}
            </div>
          )}

          {submitError && (
            <p className="text-sm text-rose-400">{submitError}</p>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl text-slate-400 hover:text-slate-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting || limitReached}
            className="themed-btn-primary relative overflow-hidden rounded-xl text-white font-semibold border-0 disabled:opacity-50 group"
          >
            <span className="relative z-10 flex items-center gap-2 text-sm">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting ? 'Posting…' : 'Post'}
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
