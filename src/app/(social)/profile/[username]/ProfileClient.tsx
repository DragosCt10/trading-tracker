'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import PostCard from '@/components/feed/PostCard';
import ProfileSummaryCard from '@/components/feed/ProfileSummaryCard';
import EditPostModal from '@/components/feed/EditPostModal';
import { useSocialUser } from '@/contexts/SocialUserContext';
import { usePostActions } from '@/hooks/usePostActions';
import { getPostsByProfile } from '@/lib/server/feedPosts';
import { queryKeys } from '@/lib/queryKeys';
import type { SocialProfile, FeedPost, PaginatedResult } from '@/types/social';

interface ProfileClientProps {
  profile: SocialProfile;
  initialPosts: PaginatedResult<FeedPost>;
  currentProfileId?: string;
  initialFollowing: boolean;
}

export default function ProfileClient({
  profile,
  initialPosts,
  currentProfileId,
  initialFollowing,
}: ProfileClientProps) {
  const queryClient = useQueryClient();
  const { userId, ownProfile, subscription } = useSocialUser();
  const { like, remove, edit, report } = usePostActions(userId);
  const [followerCount, setFollowerCount] = useState(profile.follower_count);
  const followingCount = profile.following_count;
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [editPost, setEditPost] = useState<FeedPost | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const effectiveCurrentProfileId = currentProfileId ?? ownProfile?.id;

  // Prefer server-provided identity to avoid SSR/client hydration divergence.
  const isOwnProfile = currentProfileId === profile.id;

  const {
    data: postsData,
    isError: isPostsError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.feed.profile(profile.username),
    queryFn: ({ pageParam }) => getPostsByProfile(profile.id, pageParam as string | undefined, 20),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: { pages: [initialPosts], pageParams: [undefined] },
    // eslint-disable-next-line react-hooks/purity
    initialDataUpdatedAt: Date.now(),
    staleTime: 60_000,
  });

  const posts = postsData?.pages.flatMap((p) => p.items) ?? [];
  const effectiveTier = isOwnProfile && subscription?.tier ? subscription.tier : profile.tier;

  const refreshPosts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.feed.profile(profile.username) });
  }, [queryClient, profile.username]);

  const handleLike = useCallback(
    (id: string) => { if (!like.isPending) like.mutate(id, { onSettled: refreshPosts }); },
    [like, refreshPosts]
  );
  const handleDelete = useCallback(
    (id: string) => { if (!remove.isPending) remove.mutate(id, { onSettled: refreshPosts }); },
    [remove, refreshPosts]
  );
  const handleEdit = useCallback((p: FeedPost) => {
    setEditError(null);
    setEditPost(p);
  }, []);
  const handleReport = useCallback(
    (id: string, reason: string) =>
      report.mutate({ postId: id, reason: reason.trim() }, { onSettled: refreshPosts }),
    [report, refreshPosts]
  );

  function handleFollowChange(nextFollowing: boolean) {
    setIsFollowing(nextFollowing);
    setFollowerCount((prev) => Math.max(0, prev + (nextFollowing ? 1 : -1)));
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-0 py-6 space-y-6">
      <h1 className="sr-only">{profile.display_name} — Profile</h1>
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to feed
      </Link>

      <ProfileSummaryCard
        profile={profile}
        currentProfileId={effectiveCurrentProfileId}
        followerCount={followerCount}
        followingCount={followingCount}
        showBio
        showFollowButton={!!ownProfile}
        initialFollowing={isFollowing}
        onFollowChange={handleFollowChange}
        showTierBadge
        tierOverride={effectiveTier}
      />

      {/* Posts */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">Posts</h2>

        {isPostsError ? (
          <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-8 text-center" role="alert">
            <p className="text-slate-500 text-sm">Unable to load posts. Please try refreshing.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-8 text-center">
            <p role="status" className="text-slate-500 text-sm">No posts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={userId}
                currentProfileId={effectiveCurrentProfileId}
                currentUserTier={isOwnProfile ? subscription?.tier : undefined}
                onLike={userId ? handleLike : undefined}
                onDelete={userId ? handleDelete : undefined}
                onEdit={userId ? handleEdit : undefined}
                onReport={userId ? handleReport : undefined}
              />
            ))}
            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetchingNextPage ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                  ) : (
                    'Load more posts'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {editPost && userId && subscription && (
        <EditPostModal
          open={!!editPost}
          onClose={() => {
            setEditPost(null);
            setEditError(null);
          }}
          onSubmit={async (content) => {
            setEditError(null);
            const result = await edit.mutateAsync({ postId: editPost.id, content });
            if ('error' in result) {
              setEditError(result.error);
              return;
            }
            setEditPost(null);
            refreshPosts();
          }}
          initialContent={editPost.content}
          maxLen={subscription.definition.limits.maxPostContentLength}
          isSubmitting={edit.isPending}
          submitError={editError ?? undefined}
        />
      )}
    </div>
  );
}
