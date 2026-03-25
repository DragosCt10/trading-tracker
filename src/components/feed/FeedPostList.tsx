'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Virtuoso } from 'react-virtuoso';
import PostCard from './PostCard';
import PostCardSkeleton from './PostCardSkeleton';
import { useTheme } from '@/hooks/useTheme';
import { getAllFollowedProfileIds } from '@/lib/server/socialProfile';
import type { FeedPost } from '@/types/social';
import type { TierId } from '@/types/subscription';
import { FEED_CARD_SURFACE_CLASS } from './feedCardStyles';

const FEED_SURFACE_CLASS = FEED_CARD_SURFACE_CLASS;

interface FeedPostListProps {
  posts: FeedPost[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  currentUserId?: string;
  currentProfileId?: string;
  currentUserTier?: TierId;
  /**
   * When provided, `Virtuoso` will use this element as the scroll container.
   * This prevents "window scroll" vs "inner div scroll" mismatches (huge blank gaps).
   */
  customScrollParent?: HTMLElement | null;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (post: FeedPost) => void;
  onReport: (id: string, reason: string) => void;
  onAuthorClick?: (username: string) => void;
  emptyMessage?: string;
  emptySubtext?: string;
  skeletonCount?: number;
}

export default function FeedPostList({
  posts,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  currentUserId,
  currentProfileId,
  currentUserTier,
  customScrollParent,
  onLike,
  onDelete,
  onEdit,
  onReport,
  onAuthorClick,
  emptyMessage = 'No posts yet',
  emptySubtext,
  skeletonCount = 3,
}: FeedPostListProps) {
  const { theme, mounted } = useTheme();
  const isLightMode = mounted && theme === 'light';
  const hasCustomScrollParent = !!customScrollParent;
  const { data: followedProfileIds = [], isLoading: isFollowingIdsLoading } = useQuery({
    queryKey: ['followed-profile-ids-all', currentUserId],
    queryFn: getAllFollowedProfileIds,
    enabled: !!currentUserId,
    staleTime: 5 * 60_000,
  });
  const followedProfileIdSet = useMemo(() => new Set(followedProfileIds), [followedProfileIds]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: skeletonCount }).map((_, i) => <PostCardSkeleton key={i} />)}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`${FEED_SURFACE_CLASS} p-10 text-center`}>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{emptyMessage}</p>
        {emptySubtext && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">{emptySubtext}</p>
        )}
      </div>
    );
  }

  return (
    <Virtuoso
      useWindowScroll={!hasCustomScrollParent}
      customScrollParent={customScrollParent ?? undefined}
      data={posts}
      endReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
      style={hasCustomScrollParent ? { height: '100%' } : undefined}
      itemContent={(_, post) => (
        <div className="mb-4">
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            currentProfileId={currentProfileId}
            currentUserTier={currentUserTier}
            isLightMode={isLightMode}
            mounted={mounted}
            onLike={onLike}
            onDelete={onDelete}
            onEdit={onEdit}
            onReport={onReport}
            onAuthorClick={onAuthorClick}
            showAuthorFollowButton
            initialFollowing={followedProfileIdSet.has(post.author.id)}
            isFollowStateLoading={isFollowingIdsLoading}
          />
        </div>
      )}
      components={{
        Footer: () =>
          isFetchingNextPage ? (
            <div className="space-y-3 mt-3">
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          ) : null,
      }}
    />
  );
}
