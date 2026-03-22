'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Hash, Lock, Globe, ArrowLeft } from 'lucide-react';
import { useFeed } from '@/hooks/useFeed';
import { usePostActions } from '@/hooks/usePostActions';
import FeedPostList from '@/components/feed/FeedPostList';
import EditPostModal from '@/components/feed/EditPostModal';
import InlineCreatePostCard from '@/components/feed/InlineCreatePostCard';
import { useSubscription } from '@/hooks/useSubscription';
import type { FeedChannel, FeedPost, PaginatedResult, SocialProfile } from '@/types/social';

interface ChannelClientProps {
  channel: FeedChannel;
  initialFeed: PaginatedResult<FeedPost>;
  userId: string;
  currentProfile: SocialProfile | null;
}

export default function ChannelClient({ channel, initialFeed, userId, currentProfile }: ChannelClientProps) {
  const [createError, setCreateError] = useState('');
  const [editPost, setEditPost] = useState<FeedPost | null>(null);

  const { subscription } = useSubscription({ userId });

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useFeed(
    userId,
    initialFeed,
    channel.id
  );
  const { like, create, edit, remove, report } = usePostActions(userId, channel.id);

  const posts = data?.pages.flatMap((p) => p.items) ?? [];
  const currentProfileId = currentProfile?.id;

  async function handleCreate(input: { content: string; tradeId?: string; tradeMode?: 'live' | 'demo' | 'backtesting' }) {
    setCreateError('');
    const result = await create.mutateAsync({
      ...input,
      channelId: channel.id,
    });
    if ('error' in result) {
      setCreateError(result.error);
      return;
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-0 py-6 space-y-4">
      {/* Back link */}
      <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Feed
      </Link>

      {/* Channel header */}
      <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-xl px-5 py-4 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-200/90 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-300/60 dark:border-slate-700/60">
          <Hash className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{channel.name}</h1>
            {channel.is_public
              ? <Globe className="w-4 h-4 text-slate-500" />
              : <Lock className="w-4 h-4 text-slate-500" />
            }
          </div>
          {channel.description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{channel.description}</p>}
          <p className="text-xs text-slate-500 dark:text-slate-600 mt-1">#{channel.slug}</p>
        </div>
      </div>

      {subscription && currentProfile && (
        <InlineCreatePostCard
          userId={userId}
          profile={currentProfile}
          subscription={subscription}
          onSubmit={handleCreate}
          isSubmitting={create.isPending}
          submitError={createError}
        />
      )}

      {/* Posts */}
      <FeedPostList
        posts={posts}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={!!hasNextPage}
        fetchNextPage={fetchNextPage}
        currentUserId={userId}
        currentProfileId={currentProfileId}
        currentUserTier={subscription?.tier}
        onLike={(id) => like.mutate(id)}
        onDelete={(id) => remove.mutate(id)}
        onEdit={(p) => setEditPost(p)}
        onReport={(id) => report.mutate({ postId: id, reason: 'Reported by user' })}
        emptyMessage="No posts in this channel yet"
        emptySubtext="Be the first to post here!"
      />

      {editPost && subscription && (
        <EditPostModal
          open={!!editPost}
          onClose={() => setEditPost(null)}
          onSubmit={async (content) => {
            const result = await edit.mutateAsync({ postId: editPost.id, content });
            if ('error' in result) { setCreateError(result.error); return; }
            setEditPost(null);
          }}
          initialContent={editPost.content}
          maxLen={subscription.definition.limits.maxPostContentLength}
          isSubmitting={edit.isPending}
          submitError={createError}
        />
      )}
    </div>
  );
}
