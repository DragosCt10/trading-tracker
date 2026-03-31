import { useQuery } from '@tanstack/react-query';
import { searchPosts, searchProfiles } from '@/lib/server/feedSearch';
import { queryKeys } from '@/lib/queryKeys';
import type { FeedPost, SocialProfile } from '@/types/social';

export function useFeedSearch(query: string, type: 'posts' | 'traders') {
  return useQuery<(FeedPost | SocialProfile)[]>({
    queryKey: queryKeys.feed.search(query, type),
    queryFn: async () => {
      if (type === 'posts') {
        const r = await searchPosts(query);
        return r.items;
      }
      return searchProfiles(query);
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
