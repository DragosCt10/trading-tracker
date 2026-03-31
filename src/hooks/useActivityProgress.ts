'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';
import { getUserActivityCount } from '@/lib/server/feedActivity';

export function useActivityProgress(
  profileId: string | null,
  initialData?: { posts: number; comments: number; total: number },
) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.feed.activityProgress(profileId),
    queryFn: () => getUserActivityCount(profileId!),
    enabled: !!profileId,
    initialData,
    ...TRADES_DATA,
  });

  return {
    total: data?.total ?? 0,
    posts: data?.posts ?? 0,
    comments: data?.comments ?? 0,
    isLoading,
  };
}
