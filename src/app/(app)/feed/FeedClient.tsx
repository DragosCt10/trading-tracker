'use client';

import { useState, useRef, useCallback } from 'react';
import { PlusCircle, Hash, Plus, Globe } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeed } from '@/hooks/useFeed';
import { usePostActions } from '@/hooks/usePostActions';
import { useMyChannels } from '@/hooks/useChannels';
import PostCard from '@/components/feed/PostCard';
import PostCardSkeleton from '@/components/feed/PostCardSkeleton';
import CreatePostModal from '@/components/feed/CreatePostModal';
import CreateChannelModal from '@/components/feed/CreateChannelModal';
import SearchBar from '@/components/feed/SearchBar';
import type { SocialProfile, FeedPost, PaginatedResult } from '@/types/social';

interface FeedClientProps {
  userId: string;
  initialProfile: SocialProfile | null;
  initialFeed: PaginatedResult<FeedPost>;
}

export default function FeedClient({ userId, initialProfile, initialFeed }: FeedClientProps) {
  const { subscription } = useSubscription({ userId });
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editPost, setEditPost] = useState<FeedPost | null>(null);
  const [channelModalOpen, setChannelModalOpen] = useState(false);

  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'elite';

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useFeed(userId, initialFeed);
  const { like, create, edit, remove, report } = usePostActions(userId);
  const { data: myChannels = [] } = useMyChannels(userId);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasNextPage || isFetchingNextPage) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      });
      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  async function handleCreate(input: { content: string; tradeId?: string; tradeMode?: 'live' | 'demo' | 'backtesting' }) {
    setCreateError('');
    const result = await create.mutateAsync(input);
    if ('error' in result) {
      setCreateError(result.error);
      return;
    }
    setCreateOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-0 py-6">
      <div className="flex gap-6">
        {/* Main feed */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Alpha Level</h1>
              <p className="text-sm text-slate-500 mt-0.5">What are traders thinking right now</p>
            </div>
            {initialProfile && subscription && (
              <Button
                onClick={() => { setCreateError(''); setCreateOpen(true); }}
                className="themed-btn-primary relative overflow-hidden rounded-xl text-white font-semibold border-0 group gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="relative z-10 text-sm">Post</span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
              </Button>
            )}
          </div>

          {/* Feed */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <PostCardSkeleton key={i} />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-700/55 bg-slate-800/35 backdrop-blur-xl p-10 text-center">
              <p className="text-slate-400 font-medium">No posts yet</p>
              <p className="text-slate-600 text-sm mt-1">Follow some traders or be the first to post!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={userId}
                  currentProfileId={initialProfile?.id}
                  currentUserTier={subscription?.tier}
                  onLike={(id) => like.mutate(id)}
                  onDelete={(id) => remove.mutate(id)}
                  onEdit={(p) => setEditPost(p)}
                  onReport={(id) => report.mutate({ postId: id, reason: 'Reported by user' })}
                />
              ))}
              <div ref={sentinelRef} />
              {isFetchingNextPage && (
                <div className="space-y-3">
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
          {/* Search */}
          <div>
            <SearchBar />
          </div>

          {/* Channels */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 backdrop-blur-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
              <h3 className="text-sm font-semibold text-slate-100">Channels</h3>
              {isPro && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200"
                  onClick={() => setChannelModalOpen(true)}
                  aria-label="Create channel"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="divide-y divide-slate-800/60">
              {myChannels.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <p className="text-xs text-slate-500">No channels yet</p>
                  {isPro ? (
                    <button
                      onClick={() => setChannelModalOpen(true)}
                      className="text-xs text-slate-400 hover:text-slate-200 mt-1 underline underline-offset-2"
                    >
                      Create one
                    </button>
                  ) : (
                    <Link href="/settings?tab=billing" className="text-xs text-slate-400 hover:text-slate-200 mt-1 underline underline-offset-2">
                      Upgrade to PRO
                    </Link>
                  )}
                </div>
              ) : (
                myChannels.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/feed/channel/${channel.slug}`}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
                      <Hash className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{channel.name}</p>
                      <p className="text-[10px] text-slate-600 truncate">#{channel.slug}</p>
                    </div>
                    {channel.is_public
                      ? <Globe className="w-3 h-3 text-slate-600 shrink-0" />
                      : null
                    }
                  </Link>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      {subscription && (
        <CreatePostModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          subscription={subscription}
          userId={userId}
          isSubmitting={create.isPending}
          submitError={createError}
        />
      )}
      {editPost && subscription && (
        <CreatePostModal
          open={!!editPost}
          onClose={() => setEditPost(null)}
          onSubmit={async ({ content }) => {
            const result = await edit.mutateAsync({ postId: editPost.id, content });
            if ('error' in result) { setCreateError(result.error); return; }
            setEditPost(null);
          }}
          subscription={subscription}
          userId={userId}
          isSubmitting={edit.isPending}
          submitError={createError}
        />
      )}
      <CreateChannelModal
        open={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        userId={userId}
      />
    </div>
  );
}
