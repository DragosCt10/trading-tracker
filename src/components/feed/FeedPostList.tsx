'use client';

import { Virtuoso } from 'react-virtuoso';
import PostCard from './PostCard';
import PostCardSkeleton from './PostCardSkeleton';
import { useTheme } from '@/hooks/useTheme';
import type { FeedPost } from '@/types/social';
import type { TierId } from '@/types/subscription';

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
  onReport: (id: string) => void;
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
  emptyMessage = 'No posts yet',
  emptySubtext,
  skeletonCount = 3,
}: FeedPostListProps) {
  const { theme, mounted } = useTheme();
  const isLightMode = mounted && theme === 'light';
  const hasCustomScrollParent = !!customScrollParent;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: skeletonCount }).map((_, i) => <PostCardSkeleton key={i} />)}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-10 text-center">
        <p className="text-slate-600 dark:text-slate-400 font-medium">{emptyMessage}</p>
        {emptySubtext && (
          <p className="text-slate-500 dark:text-slate-600 text-sm mt-1">{emptySubtext}</p>
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
        <div className="mb-3">
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
