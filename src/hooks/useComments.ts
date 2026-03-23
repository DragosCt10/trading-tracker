import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComments, addComment, editComment, deleteComment } from '@/lib/server/feedInteractions';
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

export function useComments(postId: string, initialData?: PaginatedResult<FeedComment>) {
  const qc = useQueryClient();
  const key = queryKeys.feed.comments(postId);

  function bumpCommentCountAcrossFeedCaches(delta: number) {
    const prefixes = [
      queryKeys.feed.public(),
      queryKeys.feed.timeline(),
      queryKeys.feed.channelPosts(''),
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
    queryFn: ({ pageParam }) => getComments(postId, pageParam as string | undefined, 30),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: initialData
      ? { pages: [initialData], pageParams: [undefined] }
      : undefined,
    refetchOnMount: true,
    ...FEED_DATA,
  });

  const add = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      addComment(postId, content, parentId),
    onSuccess: (result) => {
      if ('error' in result) return;
      const newComment = result.data;
      qc.setQueryData<InfiniteCommentsData>(key, (prev) => {
        if (!prev || prev.pages.length === 0) return prev;
        return {
          ...prev,
          pages: prev.pages.map((page, idx) =>
            idx === 0
              ? { ...page, items: [...page.items, newComment] }
              : page
          ),
        };
      });
      bumpCommentCountAcrossFeedCaches(1);
    },
  });

  const edit = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      editComment(commentId, content),
    onSuccess: (result, { commentId }) => {
      if ('error' in result) return;
      const updatedComment = result.data;
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
    },
  });

  const remove = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onMutate: async (commentId) => {
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
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (result) => {
      if ('error' in result) return;
      bumpCommentCountAcrossFeedCaches(-1);
    },
  });

  return { query, add, edit, remove };
}
