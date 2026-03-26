import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { FeedNotification } from '@/types/social';
import {
  getUnreadCount,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllReadNotifications,
  deleteAllNotifications,
} from '@/lib/server/feedNotifications';
import { queryKeys } from '@/lib/queryKeys';
import { FEED_DATA } from '@/constants/queryConfig';

export function useNotificationUnreadCount(userId?: string, initialData?: number) {
  return useQuery({
    queryKey: queryKeys.feed.unreadCount(userId),
    queryFn: getUnreadCount,
    enabled: !!userId,
    refetchInterval: 60_000,
    refetchOnMount: initialData !== undefined ? true : 'always',
    refetchOnWindowFocus: false,
    initialData,
    // eslint-disable-next-line react-hooks/purity
    initialDataUpdatedAt: initialData !== undefined ? Date.now() : undefined,
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
    refetchOnMount: true,
    ...FEED_DATA,
  });
}

export function useNotificationActions(userId?: string) {
  const qc = useQueryClient();
  const unreadKey = queryKeys.feed.unreadCount(userId);
  const listKey   = queryKeys.feed.notifications(userId);

  const markOne = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: unreadKey });
      await qc.cancelQueries({ queryKey: listKey });
      const prevCount = qc.getQueryData<number>(unreadKey);
      const prevList  = qc.getQueryData(listKey);

      qc.setQueryData<number>(unreadKey, (old = 0) => Math.max(0, old - 1));
      qc.setQueryData<InfiniteData<{ items: FeedNotification[]; nextCursor: string | null }>>(
        listKey,
        (old) => old ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((n) => n.id === id ? { ...n, is_read: true } : n),
          })),
        } : old
      );
      return { prevCount, prevList };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevCount !== undefined) qc.setQueryData(unreadKey, ctx.prevCount);
      if (ctx?.prevList !== undefined) qc.setQueryData(listKey, ctx.prevList);
    },
  });

  const markAll = useMutation({
    mutationFn: markAllAsRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: unreadKey });
      await qc.cancelQueries({ queryKey: listKey });
      const prevCount = qc.getQueryData<number>(unreadKey);
      const prevList  = qc.getQueryData(listKey);

      qc.setQueryData<number>(unreadKey, 0);
      qc.setQueryData<InfiniteData<{ items: FeedNotification[]; nextCursor: string | null }>>(
        listKey,
        (old) => old ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((n) => ({ ...n, is_read: true })),
          })),
        } : old
      );
      return { prevCount, prevList };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevCount !== undefined) qc.setQueryData(unreadKey, ctx.prevCount);
      if (ctx?.prevList !== undefined) qc.setQueryData(listKey, ctx.prevList);
    },
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: unreadKey });
      await qc.cancelQueries({ queryKey: listKey });
      const prevCount = qc.getQueryData<number>(unreadKey);
      const prevList  = qc.getQueryData(listKey);

      // Determine if the item being deleted is unread (to adjust count)
      const listData = qc.getQueryData<InfiniteData<{ items: FeedNotification[]; nextCursor: string | null }>>(listKey);
      const wasUnread = listData?.pages.some((p) => p.items.some((n) => n.id === id && !n.is_read)) ?? false;

      if (wasUnread) qc.setQueryData<number>(unreadKey, (old = 0) => Math.max(0, old - 1));
      qc.setQueryData<InfiniteData<{ items: FeedNotification[]; nextCursor: string | null }>>(
        listKey,
        (old) => old ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((n) => n.id !== id),
          })),
        } : old
      );
      return { prevCount, prevList };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevCount !== undefined) qc.setQueryData(unreadKey, ctx.prevCount);
      if (ctx?.prevList !== undefined) qc.setQueryData(listKey, ctx.prevList);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: unreadKey });
      qc.invalidateQueries({ queryKey: listKey });
    },
  });

  const deleteAllRead = useMutation({
    mutationFn: deleteAllReadNotifications,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: listKey });
      const prevList = qc.getQueryData(listKey);

      qc.setQueryData<InfiniteData<{ items: FeedNotification[]; nextCursor: string | null }>>(
        listKey,
        (old) => old ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((n) => !n.is_read),
          })),
        } : old
      );
      return { prevList };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevList !== undefined) qc.setQueryData(listKey, ctx.prevList);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: unreadKey });
      qc.invalidateQueries({ queryKey: listKey });
    },
  });

  const deleteAll = useMutation({
    mutationFn: deleteAllNotifications,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: unreadKey });
      await qc.cancelQueries({ queryKey: listKey });
      const prevCount = qc.getQueryData<number>(unreadKey);
      const prevList  = qc.getQueryData(listKey);

      qc.setQueryData<number>(unreadKey, 0);
      qc.setQueryData<InfiniteData<{ items: FeedNotification[]; nextCursor: string | null }>>(
        listKey,
        (old) => old ? {
          ...old,
          pages: [{ items: [], nextCursor: null }],
        } : old
      );
      return { prevCount, prevList };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevCount !== undefined) qc.setQueryData(unreadKey, ctx.prevCount);
      if (ctx?.prevList !== undefined) qc.setQueryData(listKey, ctx.prevList);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: unreadKey });
      qc.invalidateQueries({ queryKey: listKey });
    },
  });

  return { markOne, markAll, deleteOne, deleteAllRead, deleteAll };
}

/** @deprecated Use useNotificationActions instead */
export const useMarkNotifications = useNotificationActions;
