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
  const targetFeedPrefixes: (readonly unknown[])[] = channelId
    ? [['feed:channelPosts', channelId]]
    : userId
      ? [['feed:public'], ['feed:timeline', userId]]
      : [['feed:public']];

  function getTargetFeedEntries() {
    const entries: Array<{ key: readonly unknown[]; data: InfiniteData | undefined }> = [];
    for (const prefix of targetFeedPrefixes) {
      const matches = qc.getQueriesData<InfiniteData>({ queryKey: prefix });
      for (const [key, data] of matches) {
        entries.push({ key, data });
      }
    }
    return entries;
  }

  const like = useMutation({
    mutationFn: (postId: string) => likePost(postId),
    onMutate: async (postId) => {
      for (const prefix of targetFeedPrefixes) {
        await qc.cancelQueries({ queryKey: prefix });
      }
      await qc.cancelQueries({ queryKey: queryKeys.feed.post(postId) });

      const prev = getTargetFeedEntries();
      const prevPost = qc.getQueryData<FeedPost>(queryKeys.feed.post(postId));

      // Optimistically update feed list caches
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

      // Optimistically update individual post cache (used by post detail page)
      if (prevPost) {
        const newLiked = !prevPost.is_liked_by_me;
        const newCount = Math.max(0, prevPost.like_count + (newLiked ? 1 : -1));
        qc.setQueryData<FeedPost>(queryKeys.feed.post(postId), {
          ...prevPost, is_liked_by_me: newLiked, like_count: newCount,
        });
      }

      return { prev, prevPost };
    },
    onSuccess: (result, postId) => {
      if ('data' in result) {
        // Settle feed list caches with confirmed server values
        for (const { key } of getTargetFeedEntries()) {
          qc.setQueryData<InfiniteData>(key, (d) =>
            d ? toggleLikeInCache(d, postId, result.data.liked, result.data.like_count) : d!
          );
        }
        // Settle individual post cache
        const cached = qc.getQueryData<FeedPost>(queryKeys.feed.post(postId));
        if (cached) {
          qc.setQueryData<FeedPost>(queryKeys.feed.post(postId), {
            ...cached, is_liked_by_me: result.data.liked, like_count: result.data.like_count,
          });
        }
      }
    },
    onError: (_err, postId, ctx) => {
      if (!ctx?.prev) return;
      for (const entry of ctx.prev) {
        if (entry.data) qc.setQueryData(entry.key, entry.data);
      }
      // Roll back individual post cache
      if (ctx.prevPost) qc.setQueryData(queryKeys.feed.post(postId), ctx.prevPost);
    },
  });

  const create = useMutation({
    mutationFn: (input: Parameters<typeof createPost>[0]) => createPost(input),
    onSuccess: () => {
      for (const prefix of targetFeedPrefixes) {
        qc.invalidateQueries({ queryKey: prefix });
      }
    },
  });

  const edit = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      updatePost(postId, content),
    onSuccess: (result, { postId }) => {
      if ('error' in result) return;
      const updatedPost = result.data;
      for (const { key } of getTargetFeedEntries()) {
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
    },
  });

  const remove = useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onMutate: async (postId) => {
      for (const prefix of targetFeedPrefixes) {
        await qc.cancelQueries({ queryKey: prefix });
      }
      const prev = getTargetFeedEntries();
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
