import { useInfiniteQuery } from '@tanstack/react-query';
import { getPublicFeed, getChannelFeed, getTimeline } from '@/lib/server/feedPosts';
import { queryKeys } from '@/lib/queryKeys';
import { FEED_DATA } from '@/constants/queryConfig';
import type { PaginatedResult, FeedPost } from '@/types/social';

type FeedView = 'public' | 'following';

export function useFeed(
  userId?: string,
  initialData?: PaginatedResult<FeedPost>,
  channelId?: string,
  view: FeedView = 'public'
) {
  const isFollowingView = view === 'following' && !!userId;

  return useInfiniteQuery({
    queryKey: channelId
      ? queryKeys.feed.channelPosts(channelId)
      : isFollowingView
        ? queryKeys.feed.timeline(userId)
        : queryKeys.feed.public(),
    queryFn: ({ pageParam }) =>
      channelId
        ? getChannelFeed(channelId, pageParam as string | undefined, 20)
        : isFollowingView
          ? getTimeline(pageParam as string | undefined, 20)
          : getPublicFeed(pageParam as string | undefined, 20),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: initialData
      ? {
          pages: [initialData],
          pageParams: [undefined],
        }
      : undefined,
    // eslint-disable-next-line react-hooks/purity
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    maxPages: 10,
    ...FEED_DATA,
  });
}
