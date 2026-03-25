import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComments, getReplies, addComment, editComment, deleteComment } from '@/lib/server/feedInteractions';
import { queryKeys } from '@/lib/queryKeys';
import { FEED_DATA } from '@/constants/queryConfig';

import type { PaginatedResult, FeedComment } from '@/types/social';
import type { FeedPost } from '@/types/social';

type InfiniteCommentsData = {
  pages: PaginatedResult<FeedComment>[];
  pageParams: unknown[];
};

type InfiniteFeedData = {
  pages: PaginatedResult<FeedPost>[];
  pageParams: unknown[];
};

function bumpPostCommentCountInFeedCache(
  data: InfiniteFeedData | undefined,
  postId: string,
  delta: number
): InfiniteFeedData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((post) =>
        post.id === postId
          ? { ...post, comment_count: Math.max(0, (post.comment_count ?? 0) + delta) }
          : post
      ),
    })),
  };
}

export function useReplies(commentId: string, enabled: boolean) {
  const key = queryKeys.feed.replies(commentId);
  return useQuery({
    queryKey: key,
    queryFn: () => getReplies(commentId),
    enabled,
    ...FEED_DATA,
  });
}

export function useComments(postId: string, initialData?: PaginatedResult<FeedComment>) {
  const qc = useQueryClient();
  const key = queryKeys.feed.comments(postId);

  function bumpCommentCountAcrossFeedCaches(delta: number) {
    const prefixes = [
      queryKeys.feed.public(),
      queryKeys.feed.timelineAll(),      // bare prefix — matches all timelines
      queryKeys.feed.channelPostsAll(),  // bare prefix — matches all channel feeds
    ] as unknown as unknown[][];

    for (const prefix of prefixes) {
      const entries = qc.getQueriesData<InfiniteFeedData>({ queryKey: prefix });
      for (const [queryKey, data] of entries) {
        const next = bumpPostCommentCountInFeedCache(data, postId, delta);
        if (next) qc.setQueryData(queryKey, next);
      }
    }
  }

  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => getComments(postId, pageParam as string | undefined, 20),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: initialData
      ? { pages: [initialData], pageParams: [undefined] }
      : undefined,
    // Skip refetch on mount when the server pre-fetched fresh data — avoid a redundant
    // network round-trip immediately after hydration.
    refetchOnMount: !initialData,
    ...FEED_DATA,
  });

  const add = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      addComment(postId, content, parentId),
    onSuccess: (result) => {
      if ('error' in result) return;
      const newComment = result.data;
      if (newComment.parent_id) {
        // Append to the replies cache for the parent comment
        const repliesKey = queryKeys.feed.replies(newComment.parent_id);
        qc.setQueryData<FeedComment[]>(repliesKey, (prev) => [...(prev ?? []), newComment]);
      } else {
        // Prepend to the top-level comments list
        qc.setQueryData<InfiniteCommentsData>(key, (prev) => {
          if (!prev || prev.pages.length === 0) return prev;
          return {
            ...prev,
            pages: prev.pages.map((page, idx) =>
              idx === 0
                ? { ...page, items: [newComment, ...page.items] }
                : page
            ),
          };
        });
        bumpCommentCountAcrossFeedCaches(1);
      }
    },
  });

  const edit = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string; parentId?: string }) =>
      editComment(commentId, content),
    onSuccess: (result, { commentId, parentId }) => {
      if ('error' in result) return;
      const updatedComment = result.data;
      if (parentId) {
        // Update inside the replies cache
        const repliesKey = queryKeys.feed.replies(parentId);
        qc.setQueryData<FeedComment[]>(repliesKey, (prev) =>
          prev
            ? prev.map((c) =>
                c.id === commentId
                  ? { ...c, content: updatedComment.content, updated_at: updatedComment.updated_at }
                  : c
              )
            : prev
        );
      } else {
        qc.setQueryData<InfiniteCommentsData>(key, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pages: prev.pages.map((page) => ({
              ...page,
              items: page.items.map((comment) =>
                comment.id === commentId
                  ? { ...comment, content: updatedComment.content, updated_at: updatedComment.updated_at }
                  : comment
              ),
            })),
          };
        });
      }
    },
  });

  const remove = useMutation({
    mutationFn: ({ commentId }: { commentId: string; parentId?: string }) => deleteComment(commentId),
    onMutate: async ({ commentId, parentId }) => {
      if (parentId) {
        const repliesKey = queryKeys.feed.replies(parentId);
        await qc.cancelQueries({ queryKey: repliesKey });
        const prev = qc.getQueryData<FeedComment[]>(repliesKey);
        qc.setQueryData<FeedComment[]>(repliesKey, (d) =>
          d ? d.filter((c) => c.id !== commentId) : d!
        );
        return { prev, repliesKey };
      } else {
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData(key);
        qc.setQueryData<InfiniteCommentsData>(key, (d) =>
          d
            ? {
                ...d,
                pages: d.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((c) => c.id !== commentId),
                })),
              }
            : d!
        );
        return { prev };
      }
    },
    onError: (_err, { parentId }, ctx) => {
      if (parentId && ctx?.repliesKey) {
        qc.setQueryData(ctx.repliesKey, ctx.prev);
      } else if (ctx?.prev) {
        qc.setQueryData(key, ctx.prev);
      }
    },
    onSuccess: (result, { parentId }) => {
      if ('error' in result) return;
      if (!parentId) {
        bumpCommentCountAcrossFeedCaches(-1);
      }
    },
  });

  return { query, add, edit, remove };
}
