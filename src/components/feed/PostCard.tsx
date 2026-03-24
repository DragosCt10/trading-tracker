'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, MoreHorizontal, Pencil, Trash2, Flag } from 'lucide-react';
import TierBadge from './TierBadge';
import FollowButton from './FollowButton';
import { Button } from '@/components/ui/button';
import TradePreviewCard from './TradePreviewCard';
import type { FeedPost } from '@/types/social';
import type { TierId } from '@/types/subscription';
import { useTheme } from '@/hooks/useTheme';
import { formatCompactCount } from '@/lib/utils';
import { formatFeedDateTime } from '@/utils/feedDateFormat';
import { getPublicDisplayName } from '@/utils/displayName';

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
  onReport?: (postId: string) => void;
  /** Show full content without truncation (used on post detail page) */
  expanded?: boolean;
  /** Override the author display name (e.g. masked Trader#### for private profiles). */
  authorDisplayName?: string;
  onAuthorClick?: (username: string) => void;
  showAuthorFollowButton?: boolean;
  initialFollowing?: boolean;
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
}: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  const handleAuthorClick = (e: React.MouseEvent) => {
    if (!onAuthorClick) return;
    e.preventDefault();
    onAuthorClick(post.author.username);
  };

  return (
    <article data-post-id={post.id} className="rounded-2xl mb-6 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-5">
      {/* Author header */}
      <div className="flex items-start gap-3 mb-7">
        <Link href={`/profile/${post.author.username}`} onClick={handleAuthorClick} className="shrink-0">
          <div
            className={`w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm ${mounted && isPro ? 'ring-2 ring-amber-400/75 ring-offset-1 ring-offset-white dark:ring-offset-slate-800' : ''}`}
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
            <Link href={`/profile/${post.author.username}`} onClick={handleAuthorClick} className="font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-white transition-colors leading-none">
              {displayedAuthorName}
            </Link>
            {!mounted && isPro && (
              <span className="h-5 w-14 rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
            )}
            {mounted && isPro && (
              <TierBadge tier={authorTier} isLightMode={isLightMode} />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-slate-500 text-xs">@{post.author.is_public ? post.author.username : displayedAuthorName.toLowerCase()}</span>
          </div>
        </div>
        <div className="ml-auto pl-2 flex items-center gap-2 shrink-0">
          <span className="text-slate-500 text-xs shrink-0" suppressHydrationWarning>
            {formatFeedDateTime(post.created_at)}
          </span>
          {showAuthorFollowButton && currentUserId && !isOwn && (
            <>
              <span className="text-slate-400 dark:text-slate-600 text-xs" aria-hidden>•</span>
              <FollowButton targetProfileId={post.author.id} initialFollowing={initialFollowing} />
            </>
          )}
        </div>

      </div>

      {/* Post text */}
      <p
        suppressHydrationWarning
        className={`text-[15px] leading-[1.65] text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words ${!expanded ? 'line-clamp-6' : ''} ${post.trade_snapshot ? 'mb-3' : ''}`}
      >
        {post.content}
      </p>

      {/* Trade card embed */}
      {post.trade_snapshot && <TradePreviewCard snapshot={post.trade_snapshot} />}

      {/* Action bar */}
      <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/40">
        {/* Like — read-only for own posts, interactive for others */}
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

        {/* Comment */}
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/50 rounded-xl"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Post options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute p-1 right-0 bottom-9 z-20 w-40 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40">
                {isOwn && onEdit && authorTier !== 'starter' && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    onClick={() => { setMenuOpen(false); onEdit(post); }}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {isOwn && onDelete && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                    onClick={() => { setMenuOpen(false); onDelete(post.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
                {!isOwn && onReport && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    onClick={() => { setMenuOpen(false); onReport(post.id); }}
                  >
                    <Flag className="w-3.5 h-3.5" /> Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

const PostCard = memo(PostCardComponent);
export default PostCard;
