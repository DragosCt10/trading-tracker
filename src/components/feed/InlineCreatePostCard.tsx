'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link2, Loader2, X, PlusCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import TierBadge from './TierBadge';
import RewardsBadge from './RewardsBadge';
import TradePreviewCard from './TradePreviewCard';
import AttachTradeModal from './AttachTradeModal';
import { useTheme } from '@/hooks/useTheme';
import { getWeeklyPostCount } from '@/lib/server/feedPosts';
import { queryKeys } from '@/lib/queryKeys';
import { USER_DATA } from '@/constants/queryConfig';
import type { TradeSelectorItem, TradeSnapshot, SocialProfile } from '@/types/social';
import { getPublicDisplayName } from '@/utils/displayName';
import type { ResolvedSubscription } from '@/types/subscription';
import { FEED_CARD_SURFACE_CLASS } from './feedCardStyles';

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

  const manuallyResizedRef = useRef(false);

  const autoResize = useCallback(() => {
    if (manuallyResizedRef.current) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => { autoResize(); }, [content, autoResize]);

  // Detect manual resize via ResizeObserver
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    let prevHeight = el.offsetHeight;
    const ro = new ResizeObserver(() => {
      const newHeight = el.offsetHeight;
      // If height changed but content didn't trigger it, user dragged the handle
      if (newHeight !== prevHeight) {
        manuallyResizedRef.current = true;
      }
      prevHeight = newHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const displayedName = getPublicDisplayName(profile);
  const maxLen = subscription.definition.limits.maxPostContentLength;
  const canAttach = subscription.definition.features.socialFeedTradeAttach;
  const weeklyMax = subscription.definition.limits.maxPostsPerWeek;

  const { data: weeklyCount = null } = useQuery({
    queryKey: queryKeys.feed.weeklyPostCount(),
    queryFn: () => getWeeklyPostCount(),
    enabled: weeklyMax !== null,
    ...USER_DATA,
  });

  const limitReached = weeklyMax !== null && weeklyCount !== null && weeklyCount.used >= weeklyMax;

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
      ? 'ring-2 ring-[#b45309]/45 dark:ring-[rgba(251,191,36,0.45)] ring-offset-1 ring-offset-white dark:ring-offset-slate-800'
      : '';

  const avatarContent = profile.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.avatar_url} alt={displayedName} className="w-full h-full object-cover" />
  ) : (
    String(displayedName ?? '?').slice(0, 1).toUpperCase()
  );

  const avatar = (
    <div className={`w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm shrink-0 ${avatarRing}`}>
      {avatarContent}
    </div>
  );

  const avatarSm = (
    <div className={`w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-xs shrink-0 ${avatarRing}`}>
      {avatarContent}
    </div>
  );

  /** Match PostCard surface; blur on outer, clip on inner for collapse animation. */
  const shellOuterClass =
    `${FEED_CARD_SURFACE_CLASS} motion-reduce:transition-none`;
  const shellInnerClass = 'overflow-hidden rounded-2xl motion-reduce:transition-none';

  const rowTransition =
    'grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none';

  return (
    <div className={shellOuterClass}>
      <div className={shellInnerClass}>
      {/* Collapsed row — compact bar with avatar + textarea + action buttons */}
      <div
        className={`${rowTransition} ${collapsed ? '[grid-template-rows:1fr]' : '[grid-template-rows:0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden" inert={!collapsed ? true : undefined}>
          <div className="px-4 py-2.5 flex items-center gap-3">
            {avatarSm}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={maxLen}
              rows={1}
              disabled={limitReached || isSubmitting}
              placeholder="What's your trade thesis today?"
              className="flex-1 min-w-0 resize-none bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm leading-tight focus:outline-none disabled:opacity-50"
            />
            {canAttach && (
              <button
                type="button"
                onClick={() => setAttachModalOpen(true)}
                className="shrink-0 p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors"
                title="Attach Trade"
              >
                <Link2 className="w-4 h-4" />
              </button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting || limitReached}
              className="themed-btn-primary h-8 px-4 cursor-pointer shrink-0 rounded-xl text-white font-semibold text-sm border-0 disabled:opacity-60 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                Post
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded composer — animates from 0fr when collapsed */}
      <div
        className={`${rowTransition} ${collapsed ? '[grid-template-rows:0fr]' : '[grid-template-rows:1fr]'}`}
      >
        {/* inert while collapsed so the textarea/actions stay out of tab order when height is 0 */}
        <div className="min-h-0 min-w-0 overflow-hidden" inert={collapsed ? true : undefined}>
          <div className="p-5">
            <div className="flex items-start gap-3">
              {avatar}

              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-none">
                    {displayedName}
                  </span>
                  {!mounted && (
                    <span
                      className="h-5 w-14 rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-pulse"
                      aria-hidden
                    />
                  )}
                  {mounted && <TierBadge tier={authorTier} isLightMode={isLightMode} />}
                  {mounted && profile.trade_badge && <RewardsBadge milestoneId={profile.trade_badge} />}
                  <span className="ml-auto text-[11px] tabular-nums text-slate-400 dark:text-slate-500 select-none">
                    {content.length}/{maxLen}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  data-feed-composer="true"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={maxLen}
                  rows={2}
                  disabled={limitReached || isSubmitting}
                  placeholder="What's your trade thesis today?"
                  className="w-full resize-vertical bg-transparent text-[15px] leading-[1.65] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
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

            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-700/40">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 sm:mr-auto">
                TradingView links are auto-embedded
              </span>
              <div className="flex items-center justify-end gap-2 ml-auto sm:ml-0">
                {canAttach && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAttachModalOpen(true)}
                      className="h-9 px-4 rounded-xl border border-slate-300/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-100/80 dark:bg-slate-900/30 transition-colors inline-flex items-center gap-2 text-sm"
                    >
                      <Link2 className="w-4 h-4 shrink-0" />
                      <span className="font-semibold whitespace-nowrap">
                        {selectedTrade ? `${selectedTrade.market} (${selectedTrade.outcome.toUpperCase()})` : 'Attach Trade'}
                      </span>
                    </button>
                    {selectedTrade && (
                      <button
                        type="button"
                        onClick={() => setSelectedTrade(null)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
            </div>
          </div>
        </div>
      </div>
      </div>

      <AttachTradeModal
        open={attachModalOpen}
        onClose={() => setAttachModalOpen(false)}
        onSelect={(trade) => { setSelectedTrade(trade); setAttachModalOpen(false); }}
      />
    </div>
  );
}
