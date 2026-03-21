import { useInfiniteQuery } from '@tanstack/react-query';
import { getPublicFeed, getChannelFeed, getTimeline } from '@/lib/server/feedPosts';
import { queryKeys } from '@/lib/queryKeys';
import { FEED_DATA } from '@/constants/queryConfig';
import type { PaginatedResult, FeedPost } from '@/types/social';

export function useFeed(userId?: string, initialData?: PaginatedResult<FeedPost>, channelId?: string) {
  return useInfiniteQuery({
    queryKey: channelId ? queryKeys.feed.channelPosts(channelId) : queryKeys.feed.timeline(userId),
    queryFn: ({ pageParam }) =>
      channelId
        ? getChannelFeed(channelId, pageParam as string | undefined, 20)
        : userId
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
    ...FEED_DATA,
  });
}
