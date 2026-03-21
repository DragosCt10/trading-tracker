'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Hash, Lock, Globe, PlusCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFeed } from '@/hooks/useFeed';
import { usePostActions } from '@/hooks/usePostActions';
import PostCard from '@/components/feed/PostCard';
import PostCardSkeleton from '@/components/feed/PostCardSkeleton';
import CreatePostModal from '@/components/feed/CreatePostModal';
import { useSubscription } from '@/hooks/useSubscription';
import type { FeedChannel, FeedPost, PaginatedResult } from '@/types/social';

interface ChannelClientProps {
  channel: FeedChannel;
  initialFeed: PaginatedResult<FeedPost>;
  userId: string;
  currentProfileId?: string;
}

export default function ChannelClient({ channel, initialFeed, userId, currentProfileId }: ChannelClientProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editPost, setEditPost] = useState<FeedPost | null>(null);

  const { subscription } = useSubscription({ userId });

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useFeed(
    userId,
    initialFeed,
    channel.id
  );
  const { like, create, edit, remove, report } = usePostActions(userId, channel.id);

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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-0 py-6 space-y-4">
      {/* Back link */}
      <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Feed
      </Link>

      {/* Channel header */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 backdrop-blur-xl px-5 py-4 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
          <Hash className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">{channel.name}</h1>
            {channel.is_public
              ? <Globe className="w-4 h-4 text-slate-500" />
              : <Lock className="w-4 h-4 text-slate-500" />
            }
          </div>
          {channel.description && <p className="text-sm text-slate-400 mt-1">{channel.description}</p>}
          <p className="text-xs text-slate-600 mt-1">#{channel.slug}</p>
        </div>
        {currentProfileId && subscription && (
          <Button
            onClick={() => { setCreateError(''); setCreateOpen(true); }}
            className="themed-btn-primary relative overflow-hidden rounded-xl text-white font-semibold border-0 group gap-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="relative z-10 text-sm">Post</span>
          </Button>
        )}
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <PostCardSkeleton key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/55 bg-slate-800/35 backdrop-blur-xl p-10 text-center">
          <p className="text-slate-400 font-medium">No posts in this channel yet</p>
          <p className="text-slate-600 text-sm mt-1">Be the first to post here!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={userId}
              currentProfileId={currentProfileId}
              onLike={(id) => like.mutate(id)}
              onDelete={(id) => remove.mutate(id)}
              onEdit={(p) => setEditPost(p)}
              onReport={(id) => report.mutate({ postId: id, reason: 'Reported by user' })}
            />
          ))}
          <div ref={sentinelRef} />
          {isFetchingNextPage && <><PostCardSkeleton /><PostCardSkeleton /></>}
        </div>
      )}

      {/* Modals */}
      {subscription && (
        <CreatePostModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (input) => {
            setCreateError('');
            const result = await create.mutateAsync({ ...input, channelId: channel.id });
            if ('error' in result) { setCreateError(result.error); return; }
            setCreateOpen(false);
          }}
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
    </div>
  );
}
