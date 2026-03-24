'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PostCard from '@/components/feed/PostCard';
import ProfileSummaryCard from '@/components/feed/ProfileSummaryCard';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useSubscription } from '@/hooks/useSubscription';
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
  const { data: userData } = useUserDetails();
  const userId = userData?.user?.id;
  const { data: ownProfile } = useSocialProfile(userId);
  const { subscription } = useSubscription({ userId });
  const [followerCount, setFollowerCount] = useState(profile.follower_count);
  const [followingCount, setFollowingCount] = useState(profile.following_count);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const effectiveCurrentProfileId = currentProfileId ?? ownProfile?.id;

  // Prefer server-provided identity to avoid SSR/client hydration divergence.
  const isOwnProfile = currentProfileId === profile.id;
  const effectiveTier = isOwnProfile && subscription?.tier ? subscription.tier : profile.tier;

  useEffect(() => {
    setFollowerCount(profile.follower_count);
    setFollowingCount(profile.following_count);
    setIsFollowing(initialFollowing);
  }, [profile.follower_count, profile.following_count, initialFollowing, profile.id]);

  function handleFollowChange(nextFollowing: boolean) {
    setIsFollowing(nextFollowing);
    setFollowerCount((prev) => Math.max(0, prev + (nextFollowing ? 1 : -1)));
  }

  return (
    <div suppressHydrationWarning className="mx-auto w-full max-w-5xl px-4 sm:px-0 py-6 space-y-6">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
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

        {initialPosts.items.length === 0 ? (
          <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-8 text-center">
            <p className="text-slate-500 text-sm">No posts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialPosts.items.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={userId}
                currentProfileId={effectiveCurrentProfileId}
                currentUserTier={isOwnProfile ? subscription?.tier : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
