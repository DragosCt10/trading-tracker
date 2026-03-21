import { useMutation, useQueryClient } from '@tanstack/react-query';
import { likePost, reportContent } from '@/lib/server/feedInteractions';
import { createPost, updatePost, deletePost } from '@/lib/server/feedPosts';
import { queryKeys } from '@/lib/queryKeys';
import type { FeedPost, PaginatedResult } from '@/types/social';

type InfiniteData = {
  pages: PaginatedResult<FeedPost>[];
  pageParams: unknown[];
};

/** Optimistically toggle like in the infinite query cache. */
function toggleLikeInCache(
  data: InfiniteData,
  postId: string,
  liked: boolean,
  likeCount: number
): InfiniteData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((p) =>
        p.id === postId ? { ...p, is_liked_by_me: liked, like_count: likeCount } : p
      ),
    })),
  };
}

export function usePostActions(userId?: string) {
  const qc = useQueryClient();
  const timelineKey = queryKeys.feed.timeline(userId);

  const like = useMutation({
    mutationFn: (postId: string) => likePost(postId),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: timelineKey });
      const prev = qc.getQueryData<InfiniteData>(timelineKey);

      if (prev) {
        // Optimistic toggle
        const currentPost = prev.pages.flatMap((p) => p.items).find((p) => p.id === postId);
        if (currentPost) {
          const newLiked = !currentPost.is_liked_by_me;
          const newCount = currentPost.like_count + (newLiked ? 1 : -1);
          qc.setQueryData<InfiniteData>(timelineKey, (d) =>
            d ? toggleLikeInCache(d, postId, newLiked, Math.max(0, newCount)) : d!
          );
        }
      }

      return { prev };
    },
    onSuccess: (result, postId) => {
      if ('data' in result) {
        qc.setQueryData<InfiniteData>(timelineKey, (d) =>
          d ? toggleLikeInCache(d, postId, result.data.liked, result.data.like_count) : d!
        );
      }
    },
    onError: (_err, _postId, ctx) => {
      if (ctx?.prev) qc.setQueryData(timelineKey, ctx.prev);
    },
  });

  const create = useMutation({
    mutationFn: (input: Parameters<typeof createPost>[0]) => createPost(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timelineKey });
    },
  });

  const edit = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      updatePost(postId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timelineKey });
    },
  });

  const remove = useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: timelineKey });
      const prev = qc.getQueryData<InfiniteData>(timelineKey);
      if (prev) {
        qc.setQueryData<InfiniteData>(timelineKey, {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            items: page.items.filter((p) => p.id !== postId),
          })),
        });
      }
      return { prev };
    },
    onError: (_err, _postId, ctx) => {
      if (ctx?.prev) qc.setQueryData(timelineKey, ctx.prev);
    },
  });

  const report = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: string }) =>
      reportContent(reason, { postId }),
  });

  return { like, create, edit, remove, report };
}
