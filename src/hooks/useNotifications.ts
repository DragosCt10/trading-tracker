import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUnreadCount,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '@/lib/server/feedNotifications';
import { queryKeys } from '@/lib/queryKeys';
import { FEED_DATA } from '@/constants/queryConfig';

export function useNotificationUnreadCount(userId?: string) {
  return useQuery({
    queryKey: queryKeys.feed.unreadCount(userId),
    queryFn: getUnreadCount,
    enabled: !!userId,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    ...FEED_DATA,
  });
}

export function useNotificationList(userId?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.feed.notifications(userId),
    queryFn: ({ pageParam }) => getNotifications(pageParam as string | undefined, 20),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!userId,
    refetchOnMount: 'always',
    ...FEED_DATA,
  });
}

export function useMarkNotifications(userId?: string) {
  const qc = useQueryClient();
  const unreadKey = queryKeys.feed.unreadCount(userId);
  const listKey   = queryKeys.feed.notifications(userId);

  const markOne = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: unreadKey });
      qc.invalidateQueries({ queryKey: listKey });
    },
  });

  const markAll = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: unreadKey });
      qc.invalidateQueries({ queryKey: listKey });
    },
  });

  return { markOne, markAll };
}
