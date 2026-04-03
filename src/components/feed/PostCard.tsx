'use client';

import { memo, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, MoreHorizontal, Pencil, Trash2, Flag, X } from 'lucide-react';
import TierBadge from './TierBadge';
import RewardsBadge from './RewardsBadge';
import FollowButton from './FollowButton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import TradePreviewCard from './TradePreviewCard';
import TradingViewEmbed from './TradingViewEmbed';
import { stripTradingViewUrls } from '@/utils/tradingViewUrl';
import type { FeedPost } from '@/types/social';
import type { TierId } from '@/types/subscription';
import { useTheme } from '@/hooks/useTheme';
import { formatCompactCount } from '@/lib/utils';
import { formatFeedDateTime } from '@/utils/feedDateFormat';
import { getPublicDisplayName } from '@/utils/displayName';
import { FEED_CARD_SURFACE_CLASS } from './feedCardStyles';

/** Matches `CreateChannelModal` field styling; textarea variant. */
const REPORT_TEXTAREA_CLASS =
  'min-h-[120px] rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-sm text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 themed-focus resize-y';

interface PostCardProps {
  post: FeedPost;
  currentUserId?: string;
  currentProfileId?: string;
  currentUserTier?: TierId;
  /** Passed from FeedPostList to share a single useTheme() call across all cards. */
  isLightMode?: boolean;
  /** Passed from FeedPostList to share a single useTheme() call across all cards. */
  mounted?: boolean;
  onLike?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: FeedPost) => void;
  onReport?: (postId: string, reason: string) => void;
  /** Show full content without truncation (used on post detail page) */
  expanded?: boolean;
  /** Override the author display name (e.g. masked Trader#### for private profiles). */
  authorDisplayName?: string;
  onAuthorClick?: (username: string) => void;
  showAuthorFollowButton?: boolean;
  initialFollowing?: boolean;
  isFollowStateLoading?: boolean;
}

function PostCardComponent({
  post,
  currentUserId,
  currentProfileId,
  currentUserTier,
  isLightMode: isLightModeProp,
  mounted: mountedProp,
  onLike,
  onDelete,
  onEdit,
  onReport,
  expanded = false,
  authorDisplayName,
  onAuthorClick,
  showAuthorFollowButton = false,
  initialFollowing = false,
  isFollowStateLoading = false,
}: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const { theme: _theme, mounted: _mounted } = useTheme();
  const mounted = mountedProp !== undefined ? mountedProp : _mounted;
  const isLightMode = isLightModeProp !== undefined ? isLightModeProp : (_mounted && _theme === 'light');
  const isOwn = currentProfileId === post.author.id;
  const displayedAuthorName = authorDisplayName ?? getPublicDisplayName(post.author);
  const authorTier =
    currentUserId && post.author.user_id === currentUserId && currentUserTier
      ? currentUserTier
      : post.author.tier;
  const isPro = authorTier === 'pro' || authorTier === 'elite';
  const displayedContent = useMemo(() => stripTradingViewUrls(post.content), [post.content]);

  const handleAuthorClick = (e: React.MouseEvent) => {
    if (!onAuthorClick) return;
    e.preventDefault();
    onAuthorClick(post.author.username);
  };

  const REPORT_REASON_MAX = 100;
  const REPORT_REASON_MIN = 3;

  function openReportDialog() {
    setMenuOpen(false);
    setReportReason('');
    setReportError(null);
    setReportOpen(true);
  }

  function closeReportDialog() {
    setReportOpen(false);
    setReportReason('');
    setReportError(null);
  }

  function submitReport() {
    const trimmed = reportReason.trim();
    if (trimmed.length < REPORT_REASON_MIN) {
      setReportError(`Please enter at least ${REPORT_REASON_MIN} characters.`);
      return;
    }
    onReport?.(post.id, trimmed.slice(0, REPORT_REASON_MAX));
    closeReportDialog();
  }

  return (
    <article data-post-id={post.id} className={`${FEED_CARD_SURFACE_CLASS} p-5 mb-6`}>
      {/* Author header */}
      <div className="mb-5 flex items-start gap-3">
        <Link href={`/profile/${post.author.username}`} onClick={handleAuthorClick} className="shrink-0">
          <div
            className={`w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm ${mounted && isPro ? 'ring-2 ring-[#b45309]/45 dark:ring-[rgba(251,191,36,0.45)] ring-offset-1 ring-offset-white dark:ring-offset-slate-800' : ''}`}
          >
            {post.author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatar_url} alt={displayedAuthorName} className="w-full h-full object-cover" width="36" height="36" loading="lazy" />
            ) : (
              // Guard against missing author fields from DB joins (deleted profiles).
              String(displayedAuthorName ?? '?').slice(0, 1).toUpperCase()
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profile/${post.author.username}`} onClick={handleAuthorClick} className="text-sm font-semibold leading-none text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-white">
              {displayedAuthorName}
            </Link>
            {!mounted && isPro && (
              <span className="h-5 w-14 rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
            )}
            {mounted && isPro && (
              <TierBadge tier={authorTier} isLightMode={isLightMode} />
            )}
            {mounted && post.author.trade_badge && (
              <RewardsBadge milestoneId={post.author.trade_badge} />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">@{post.author.is_public ? post.author.username : displayedAuthorName.toLowerCase()}</span>
          </div>
        </div>
        <div className="ml-auto pl-2 flex items-center gap-2 shrink-0">
          <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400" suppressHydrationWarning>
            {formatFeedDateTime(post.created_at)}
          </span>
          {showAuthorFollowButton && currentUserId && !isOwn && (
            <>
              <span className="text-slate-400 dark:text-slate-600 text-xs" aria-hidden>•</span>
              <FollowButton
                targetProfileId={post.author.id}
                initialFollowing={initialFollowing}
                isLoading={isFollowStateLoading}
              />
            </>
          )}
        </div>

      </div>

      {/* Post text (TradingView URLs stripped — shown as embeds below) */}
      {displayedContent && (
        <p
          suppressHydrationWarning
          className={`text-[15px] leading-[1.65] text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words ${!expanded ? 'line-clamp-6' : ''} ${post.trade_snapshot ? 'mb-4' : ''}`}
        >
          {displayedContent}
        </p>
      )}

      {/* TradingView chart embeds (auto-detected from post text) */}
      <TradingViewEmbed content={post.content} />

      {/* Trade card embed */}
      {post.trade_snapshot && <TradePreviewCard snapshot={post.trade_snapshot} />}

      {/* Action bar */}
      <div className="mt-4 flex items-center gap-1 border-t border-slate-200/80 pt-3 dark:border-slate-700/40">
        {/* Like — read-only for own posts; removed channel members may still like others' posts. */}
        {isOwn ? (
          <Button
            variant="ghost"
            size="sm"
            disabled
            className={`h-8 gap-1.5 rounded-xl text-xs font-medium cursor-default ${
              post.like_count > 0 ? 'text-rose-400' : 'text-slate-500'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            {post.like_count > 0 && <span>{formatCompactCount(post.like_count)}</span>}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            data-action="like"
            onClick={() => onLike?.(post.id)}
            className={`h-8 gap-1.5 rounded-xl text-xs font-medium ${
              post.is_liked_by_me || post.like_count > 0
                ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                : 'text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${post.is_liked_by_me ? 'fill-current' : ''}`} />
            {post.like_count > 0 && <span data-like-count>{formatCompactCount(post.like_count)}</span>}
          </Button>
        )}

        {/* Comment — link opens thread (composer hidden server-side + in UI when locked) */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className={`h-8 gap-1.5 rounded-xl text-xs font-medium ${
            post.comment_count > 0
              ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/10'
              : 'text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10'
          }`}
        >
          <Link href={`/feed/post/${post.id}`}>
            <MessageCircle className="w-3.5 h-3.5" />
            {post.comment_count > 0 && formatCompactCount(post.comment_count)}
          </Link>
        </Button>

        {/* Options menu — far right */}
        <div className="relative ml-auto shrink-0">
          {(isOwn || (!isOwn && onReport)) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:hover:bg-slate-700/50 dark:hover:text-slate-300"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Post options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          )}

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 bottom-9 z-20 w-40 rounded-2xl border border-slate-300/60 bg-slate-50/95 p-1 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80 dark:shadow-black/40">
                {isOwn && onEdit && authorTier !== 'starter' && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    onClick={() => { setMenuOpen(false); onEdit(post); }}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {isOwn && onDelete && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-500/10"
                    onClick={() => { setMenuOpen(false); onDelete(post.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
                {!isOwn && onReport && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    onClick={openReportDialog}
                  >
                    <Flag className="w-3.5 h-3.5" /> Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {onReport && (
        <AlertDialog open={reportOpen} onOpenChange={(v) => { if (!v) closeReportDialog(); }}>
          <AlertDialogContent className="max-w-lg max-h-[90vh] fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">

            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
              <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl" />
              <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl" />
            </div>

            <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

            <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
              <AlertDialogHeader className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    <div className="p-2 rounded-lg themed-header-icon-box">
                      <Flag className="h-5 w-5" />
                    </div>
                    <span>Report post</span>
                  </AlertDialogTitle>
                  <button
                    type="button"
                    onClick={closeReportDialog}
                    className="cursor-pointer rounded-sm h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white transition-all"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
                <AlertDialogDescription className="sr-only">
                  Report this post to moderators
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>

            <div className="relative overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Reason
                  </Label>
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                    {reportReason.length}/{REPORT_REASON_MAX}
                  </span>
                </div>
                <Textarea
                  value={reportReason}
                  onChange={(e) => {
                    setReportReason(e.target.value);
                    setReportError(null);
                  }}
                  placeholder="Describe what violates our guidelines…"
                  maxLength={REPORT_REASON_MAX}
                  rows={5}
                  className={REPORT_TEXTAREA_CLASS}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Moderators will review your report. Reports are limited to five per 24 hours.
                </p>
              </div>

              {reportError && <p className="text-sm text-rose-500">{reportError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeReportDialog}
                  className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={submitReport}
                  disabled={reportReason.trim().length < REPORT_REASON_MIN}
                  className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60"
                >
                  <span className="relative z-10 flex items-center gap-2 text-sm">
                    Submit report
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                </Button>
              </div>
            </div>

          </AlertDialogContent>
        </AlertDialog>
      )}
    </article>
  );
}

const PostCard = memo(PostCardComponent);
export default PostCard;
