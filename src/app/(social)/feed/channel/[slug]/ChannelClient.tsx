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
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-0 py-6 space-y-4">
      {/* Back link */}
      <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Feed
      </Link>

      {/* Channel header — matches SettingsClient page title + description */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl shadow-sm themed-header-icon-box shrink-0">
              <Hash className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  {channel.name}
                </h1>
                {channel.is_public ? (
                  <Globe className="w-5 h-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                ) : (
                  <Lock className="w-5 h-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {channel.description?.trim() || `Channel · #${channel.slug}`}
              </p>
              {channel.description?.trim() ? (
                <p className="text-xs text-slate-500 dark:text-slate-600 mt-1">#{channel.slug}</p>
              ) : null}
            </div>
          </div>
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
