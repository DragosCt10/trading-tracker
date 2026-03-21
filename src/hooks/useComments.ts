import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComments, addComment, editComment, deleteComment } from '@/lib/server/feedInteractions';
import { queryKeys } from '@/lib/queryKeys';
import { FEED_DATA } from '@/constants/queryConfig';
import type { PaginatedResult, FeedComment } from '@/types/social';

export function useComments(postId: string, initialData?: PaginatedResult<FeedComment>) {
  const qc = useQueryClient();
  const key = queryKeys.feed.comments(postId);

  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => getComments(postId, pageParam as string | undefined, 30),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: initialData
      ? { pages: [initialData], pageParams: [undefined] }
      : undefined,
    ...FEED_DATA,
  });

  const add = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      addComment(postId, content, parentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const edit = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      editComment(commentId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onMutate: async (commentId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData<{ pages: PaginatedResult<FeedComment>[]; pageParams: unknown[] }>(key, (d) =>
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
  });

  return { query, add, edit, remove };
}
