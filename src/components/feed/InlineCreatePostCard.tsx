'use client';

import { useEffect, useRef, useState } from 'react';
import { Link2, Loader2, X, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TierBadge from './TierBadge';
import TradePreviewCard from './TradePreviewCard';
import AttachTradeModal from './AttachTradeModal';
import { useTheme } from '@/hooks/useTheme';
import { getWeeklyPostCount } from '@/lib/server/feedPosts';
import type { TradeSelectorItem, TradeSnapshot, SocialProfile } from '@/types/social';
import type { ResolvedSubscription } from '@/types/subscription';

interface InlineCreatePostCardProps {
  userId: string;
  profile: SocialProfile;
  subscription: ResolvedSubscription;
  onSubmit: (input: {
    content: string;
    tradeId?: string;
    tradeMode?: 'live' | 'demo' | 'backtesting';
  }) => Promise<void>;
  isSubmitting?: boolean;
  submitError?: string;
  /** When true, show a single-row composer; expand via onExpand (e.g. feed scroll up). */
  collapsed?: boolean;
  onExpand?: () => void;
}

export default function InlineCreatePostCard({
  userId,
  profile,
  subscription,
  onSubmit,
  isSubmitting,
  submitError,
  collapsed = false,
  onExpand,
}: InlineCreatePostCardProps) {
  const [content, setContent] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<TradeSelectorItem | null>(null);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [weeklyCount, setWeeklyCount] = useState<{ used: number; resetDate: Date } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasCollapsedRef = useRef(collapsed);
  const { theme, mounted } = useTheme();
  const isLightMode = mounted && theme === 'light';
  /** Same as PostCard for your own posts: live subscription tier, else denormalized social_profiles.tier */
  const authorTier = subscription.tier ?? profile.tier;
  const isPro = authorTier === 'pro' || authorTier === 'elite';

  useEffect(() => {
    if (wasCollapsedRef.current && !collapsed) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
    wasCollapsedRef.current = collapsed;
  }, [collapsed]);

  const maxLen = subscription.definition.limits.maxPostContentLength;
  const canAttach = subscription.definition.features.socialFeedTradeAttach;
  const weeklyMax = subscription.definition.limits.maxPostsPerWeek;
  const limitReached = weeklyMax !== null && weeklyCount !== null && weeklyCount.used >= weeklyMax;

  useEffect(() => {
    if (weeklyMax !== null) getWeeklyPostCount(userId).then(setWeeklyCount);
  }, [userId, weeklyMax]);

  function tradeToSnapshot(t: TradeSelectorItem): TradeSnapshot {
    return {
      id: t.id,
      market: t.market,
      direction: t.direction as 'long' | 'short',
      outcome: t.outcome as 'win' | 'loss' | 'be',
      rr: t.rr,
      riskPct: t.riskPct,
      pnl: t.pnl,
      currency: t.currency,
      entryDate: t.entryDate,
      mode: t.mode,
      screens: t.screens,
    };
  }

  async function handleSubmit() {
    if (!content.trim() || isSubmitting || limitReached) return;
    await onSubmit({
      content: content.trim(),
      tradeId: selectedTrade?.id,
      tradeMode: selectedTrade?.mode,
    });
    setContent('');
    setSelectedTrade(null);
    textareaRef.current?.focus();
  }

  const avatarRing =
    mounted && isPro
      ? 'ring-2 ring-amber-400/75 ring-offset-1 ring-offset-white dark:ring-offset-slate-800'
      : '';

  const avatar = (
    <div
      className={`w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm shrink-0 ${avatarRing}`}
    >
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
      ) : (
        profile.display_name.slice(0, 1).toUpperCase()
      )}
    </div>
  );

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onExpand?.()}
        className="w-full rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm px-4 py-2.5 text-left transition-all duration-300 ease-in-out flex items-center gap-2 sm:gap-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 min-w-0"
      >
        {avatar}
        <span className="flex-1 min-w-0 text-[15px] text-slate-400 dark:text-slate-500 truncate">
          What&apos;s your trade thesis today?
        </span>
        {!mounted && (
          <span
            className="h-5 w-14 shrink-0 rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-pulse"
            aria-hidden
          />
        )}
        {mounted && (
          <span className="shrink-0">
            <TierBadge tier={authorTier} isLightMode={isLightMode} />
          </span>
        )}
        <PlusCircle className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm px-4 py-3 transition-all duration-300 ease-in-out">
      <div className="flex items-start gap-3">
        {avatar}

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-none">
              {profile.display_name}
            </span>
            {!mounted && (
              <span
                className="h-5 w-14 rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-pulse"
                aria-hidden
              />
            )}
            {mounted && <TierBadge tier={authorTier} isLightMode={isLightMode} />}
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={maxLen}
            rows={2}
            disabled={limitReached || isSubmitting}
            placeholder="What's your trade thesis today?"
            className="w-full resize-none bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-[15px] leading-[1.6] focus:outline-none disabled:opacity-50"
          />

          {selectedTrade && <TradePreviewCard snapshot={tradeToSnapshot(selectedTrade)} />}

          {submitError && (
            <p className="text-xs text-rose-400">{submitError}</p>
          )}

          {limitReached && weeklyMax !== null && weeklyCount && (
            <p className="text-xs text-rose-400">
              All {weeklyMax} posts used this week. Resets{' '}
              {weeklyCount.resetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/50 flex items-center justify-end gap-3">
        {canAttach && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAttachModalOpen(true)}
              className="h-9 px-4 rounded-xl border border-slate-300/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-100/80 dark:bg-slate-900/30 transition-colors inline-flex items-center gap-2 text-sm"
            >
              <Link2 className="w-4 h-4" />
              <span className="font-semibold">
                {selectedTrade ? `${selectedTrade.market} (${selectedTrade.outcome.toUpperCase()})` : 'Attach Trade'}
              </span>
            </button>
            {selectedTrade && (
              <button
                type="button"
                onClick={() => setSelectedTrade(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                aria-label="Remove trade"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting || limitReached}
          className="themed-btn-primary h-9 px-5 cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold group border-0 disabled:opacity-60"
        >
          <span className="relative z-10 flex items-center gap-2 text-sm">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isSubmitting && <PlusCircle className="w-4 h-4" />}
            {isSubmitting ? 'Posting…' : 'Post'}
          </span>
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
        </Button>
      </div>

      <AttachTradeModal
        open={attachModalOpen}
        onClose={() => setAttachModalOpen(false)}
        onSelect={(trade) => { setSelectedTrade(trade); setAttachModalOpen(false); }}
      />
    </div>
  );
}
