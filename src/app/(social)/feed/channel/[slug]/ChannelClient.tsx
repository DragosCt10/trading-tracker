'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Hash, Lock, Globe, ArrowLeft, Users } from 'lucide-react';
import { useFeed } from '@/hooks/useFeed';
import { usePostActions } from '@/hooks/usePostActions';
import { useChannelActions, useChannelMembershipFlags } from '@/hooks/useChannels';
import FeedPostList from '@/components/feed/FeedPostList';
import EditPostModal from '@/components/feed/EditPostModal';
import InlineCreatePostCard from '@/components/feed/InlineCreatePostCard';
import ChannelPublicRemovedCard from '@/components/feed/ChannelPublicRemovedCard';
import ChannelMembersModal from '@/components/feed/ChannelMembersModal';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import type { FeedChannel, FeedPost, PaginatedResult, SocialProfile } from '@/types/social';
import type { ChannelMembershipFlags } from '@/lib/server/feedChannels';
import type { ResolvedSubscription } from '@/types/subscription';

interface ChannelClientProps {
  channel: FeedChannel;
  initialFeed: PaginatedResult<FeedPost>;
  initialMembership?: ChannelMembershipFlags;
  initialSubscription?: ResolvedSubscription;
  userId: string;
  currentProfile: SocialProfile | null;
}

export default function ChannelClient({ channel, initialFeed, initialMembership, initialSubscription, userId, currentProfile }: ChannelClientProps) {
  const [createError, setCreateError] = useState('');
  const [editPost, setEditPost] = useState<FeedPost | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);

  const { subscription } = useSubscription({ userId, initialData: initialSubscription });
  const { data: membership, isLoading: isMemberIsLoading } = useChannelMembershipFlags(channel.id, initialMembership);
  const isMember = membership?.isMember ?? false;
  const removedByOwner = membership?.removedByOwner ?? false;
  const isMemberLoading = isMemberIsLoading;
  const { join, leave } = useChannelActions(userId);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useFeed(
    userId,
    initialFeed,
    channel.id
  );
  const { like, create, edit, remove, report } = usePostActions(userId, channel.id);

  const posts = data?.pages.flatMap((p) => p.items) ?? [];
  const currentProfileId = currentProfile?.id;

  const handleLike = useCallback((id: string) => like.mutate(id), [like]);
  const handleDelete = useCallback((id: string) => remove.mutate(id), [remove]);
  const handleEdit = useCallback((p: FeedPost) => setEditPost(p), []);
  const handleReport = useCallback(
    (id: string, reason: string) => report.mutate({ postId: id, reason: reason.trim() }),
    [report]
  );

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
            <div className="w-11 h-11 rounded-xl shadow-sm themed-header-icon-box shrink-0 flex items-center justify-center overflow-hidden">
              {channel.logo_url ? (
                <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" width="44" height="44" />
              ) : (
                <Hash className="w-6 h-6" />
              )}
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
          {/* Right side: member count + buttons */}
          <div className="flex flex-col items-end gap-4 shrink-0 ml-4">
            {/* Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex cursor-pointer items-center gap-2 h-8 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 text-xs sm:text-sm font-medium transition-colors duration-200"
                onClick={() => setMembersOpen(true)}
              >
                See all members
              </Button>
              {channel.is_public && channel.owner_id !== currentProfile?.id && !removedByOwner && (
                isMemberLoading ? (
                  <div className="h-7 w-7 rounded-xl bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                ) : isMember ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl px-3 border border-slate-300/80 dark:border-slate-600/70 bg-slate-100/90 dark:bg-slate-800/40 text-slate-600 dark:text-rose-300 hover:text-rose-500 dark:hover:text-rose-200 hover:border-rose-300 dark:hover:border-rose-400/60 hover:bg-rose-50 dark:hover:bg-rose-500/12 transition-all duration-200 disabled:opacity-50 cursor-pointer text-xs font-medium"
                    disabled={leave.isPending}
                    onClick={() => leave.mutate(channel.id)}
                    aria-label="Leave channel"
                    title="Leave"
                  >
                    Leave
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl px-4 text-xs border-slate-300 dark:border-slate-600 cursor-pointer"
                    disabled={join.isPending}
                    onClick={() => join.mutate(channel.id)}
                  >
                    Join
                  </Button>
                )
              )}
            </div>
            {/* Member count */}
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden />
              <span className="text-2xl font-bold tabular-nums leading-none text-slate-900 dark:text-slate-100">
                {channel.member_count ?? 0}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {(channel.member_count ?? 0) === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
      {isMemberLoading ? (
        <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-4 space-y-3">
          <div className="h-4 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-4 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="flex justify-end gap-2 pt-1">
            <div className="h-8 w-24 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-8 w-16 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        </div>
      ) : removedByOwner && currentProfile ? (
        <ChannelPublicRemovedCard />
      ) : isMember && subscription && currentProfile && (
        <div className="mb-6">
          <InlineCreatePostCard
            userId={userId}
            profile={currentProfile}
            subscription={subscription}
            onSubmit={handleCreate}
            isSubmitting={create.isPending}
            submitError={createError}
          />
        </div> 
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
        onLike={handleLike}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onReport={handleReport}
        emptyMessage="No posts in this channel yet"
        emptySubtext="Be the first to post here!"
      />
      </div>

      <ChannelMembersModal
        channelId={channel.id}
        channelName={channel.name}
        memberCount={channel.member_count ?? 0}
        currentUserId={userId}
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
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
