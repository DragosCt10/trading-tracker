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

export function usePostActions(userId?: string, channelId?: string) {
  const qc = useQueryClient();
  const targetFeedKeys = channelId
    ? [queryKeys.feed.channelPosts(channelId)]
    : [queryKeys.feed.public(), queryKeys.feed.timeline(userId)];

  const like = useMutation({
    mutationFn: (postId: string) => likePost(postId),
    onMutate: async (postId) => {
      await Promise.all(targetFeedKeys.map((key) => qc.cancelQueries({ queryKey: key })));
      const prev = targetFeedKeys.map((key) => ({
        key,
        data: qc.getQueryData<InfiniteData>(key),
      }));

      for (const entry of prev) {
        const currentData = entry.data;
        if (!currentData) continue;
        const currentPost = currentData.pages.flatMap((p) => p.items).find((p) => p.id === postId);
        if (!currentPost) continue;
        const newLiked = !currentPost.is_liked_by_me;
        const newCount = currentPost.like_count + (newLiked ? 1 : -1);
        qc.setQueryData<InfiniteData>(entry.key, (d) =>
          d ? toggleLikeInCache(d, postId, newLiked, Math.max(0, newCount)) : d!
        );
      }

      return { prev };
    },
    onSuccess: (result, postId) => {
      if ('data' in result) {
        for (const key of targetFeedKeys) {
          qc.setQueryData<InfiniteData>(key, (d) =>
            d ? toggleLikeInCache(d, postId, result.data.liked, result.data.like_count) : d!
          );
        }
      }
    },
    onError: (_err, _postId, ctx) => {
      if (!ctx?.prev) return;
      for (const entry of ctx.prev) {
        if (entry.data) qc.setQueryData(entry.key, entry.data);
      }
    },
  });

  const create = useMutation({
    mutationFn: (input: Parameters<typeof createPost>[0]) => createPost(input),
    onSuccess: () => {
      for (const key of targetFeedKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });

  const edit = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      updatePost(postId, content),
    onSuccess: (result, { postId }) => {
      if ('error' in result) return;
      const updatedPost = result.data;
      for (const key of targetFeedKeys) {
        qc.setQueryData<InfiniteData>(key, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pages: prev.pages.map((page) => ({
              ...page,
              items: page.items.map((p) =>
                p.id === postId
                  ? { ...p, content: updatedPost.content, updated_at: updatedPost.updated_at }
                  : p
              ),
            })),
          };
        });
      }
      // Revalidate to avoid stale client/server divergence after edits.
      for (const key of targetFeedKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });

  const remove = useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onMutate: async (postId) => {
      await Promise.all(targetFeedKeys.map((key) => qc.cancelQueries({ queryKey: key })));
      const prev = targetFeedKeys.map((key) => ({
        key,
        data: qc.getQueryData<InfiniteData>(key),
      }));
      for (const entry of prev) {
        if (!entry.data) continue;
        qc.setQueryData<InfiniteData>(entry.key, {
          ...entry.data,
          pages: entry.data.pages.map((page) => ({
            ...page,
            items: page.items.filter((p) => p.id !== postId),
          })),
        });
      }
      return { prev };
    },
    onError: (_err, _postId, ctx) => {
      if (!ctx?.prev) return;
      for (const entry of ctx.prev) {
        if (entry.data) qc.setQueryData(entry.key, entry.data);
      }
    },
  });

  const report = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: string }) =>
      reportContent(reason, { postId }),
  });

  return { like, create, edit, remove, report };
}
