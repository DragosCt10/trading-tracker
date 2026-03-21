'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Crown, MoreHorizontal, Pencil, Trash2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TradePreviewCard from './TradePreviewCard';
import type { FeedPost } from '@/types/social';

interface PostCardProps {
  post: FeedPost;
  currentUserId?: string;
  currentProfileId?: string;
  onLike?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: FeedPost) => void;
  onReport?: (postId: string) => void;
  /** Show full content without truncation (used on post detail page) */
  expanded?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days  < 7)  return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PostCard({
  post,
  currentProfileId,
  onLike,
  onDelete,
  onEdit,
  onReport,
  expanded = false,
}: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = currentProfileId === post.author.id;
  const isPro = post.author.tier === 'pro' || post.author.tier === 'elite';

  return (
    <article className="rounded-2xl border border-slate-700/55 bg-slate-800/35 backdrop-blur-xl p-5 transition-all duration-200 hover:border-slate-600/60">
      {/* Author header */}
      <div className="flex items-start gap-3 mb-3">
        <Link href={`/profile/${post.author.username}`} className="shrink-0">
          <div
            className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center text-slate-300 font-semibold text-sm"
            style={isPro ? { boxShadow: '0 0 0 2px rgba(251,191,36,0.45)' } : undefined}
          >
            {post.author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatar_url} alt={post.author.display_name} className="w-full h-full object-cover" />
            ) : (
              post.author.display_name.slice(0, 1).toUpperCase()
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/profile/${post.author.username}`} className="font-semibold text-sm text-slate-100 hover:text-white transition-colors">
              {post.author.display_name}
            </Link>
            {isPro && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Crown className="w-2.5 h-2.5" />
                PRO
              </span>
            )}
            <span className="text-slate-500 text-xs">@{post.author.username}</span>
            <span className="text-slate-600 text-xs">·</span>
            <span className="text-slate-500 text-xs">{timeAgo(post.created_at)}</span>
          </div>
        </div>

        {/* Overflow menu */}
        <div className="relative shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-300 rounded-lg"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Post options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-slate-700/60 bg-slate-800/90 backdrop-blur-xl shadow-xl py-1">
                {isOwn && onEdit && post.author.tier !== 'starter' && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                    onClick={() => { setMenuOpen(false); onEdit(post); }}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {isOwn && onDelete && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                    onClick={() => { setMenuOpen(false); onDelete(post.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
                {!isOwn && onReport && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
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

      {/* Post text */}
      <p
        className={`text-[15px] leading-[1.65] text-slate-200 whitespace-pre-wrap break-words ${!expanded ? 'line-clamp-6' : ''} ${post.trade_snapshot ? 'mb-3' : ''}`}
      >
        {post.content}
      </p>

      {/* Trade card embed */}
      {post.trade_snapshot && <TradePreviewCard snapshot={post.trade_snapshot} />}

      {/* Action bar */}
      <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-700/40">
        {/* Like — read-only for own posts, interactive for others */}
        {isOwn ? (
          <div className="h-8 gap-1.5 flex items-center px-2 rounded-xl text-xs font-medium text-slate-500">
            <Heart className="w-3.5 h-3.5" />
            {post.like_count > 0 && <span>{post.like_count}</span>}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLike?.(post.id)}
            className={`h-8 gap-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
              post.is_liked_by_me
                ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${post.is_liked_by_me ? 'fill-current' : ''}`} />
            {post.like_count > 0 && <span>{post.like_count}</span>}
          </Button>
        )}

        {/* Comment */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 gap-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200"
        >
          <Link href={`/feed/post/${post.id}`}>
            <MessageCircle className="w-3.5 h-3.5" />
            {post.comment_count > 0 && post.comment_count}
          </Link>
        </Button>

        {/* Share */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-all duration-200 ml-auto"
          onClick={() => {
            const url = `${window.location.origin}/feed/post/${post.id}`;
            navigator.clipboard.writeText(url).catch(() => {});
          }}
          aria-label="Copy link"
        >
          <Share2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </article>
  );
}
