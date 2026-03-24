'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PostCard from '@/components/feed/PostCard';
import FollowButton from '@/components/feed/FollowButton';
import TierBadge from '@/components/feed/TierBadge';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useSubscription } from '@/hooks/useSubscription';
import type { SocialProfile, FeedPost, PaginatedResult } from '@/types/social';
import { getPublicDisplayName } from '@/utils/displayName';

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
  const { mounted, isDark } = useDarkMode();
  const { subscription } = useSubscription({ userId });
  const [followerCount, setFollowerCount] = useState(profile.follower_count);
  const [followingCount, setFollowingCount] = useState(profile.following_count);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const effectiveCurrentProfileId = currentProfileId ?? ownProfile?.id;

  // Prefer server-provided identity to avoid SSR/client hydration divergence.
  const isOwnProfile = currentProfileId === profile.id;
  // Always apply the mask if is_public=false, regardless of who is viewing.
  const displayedName = getPublicDisplayName(profile);
  const effectiveTier = isOwnProfile && subscription?.tier ? subscription.tier : profile.tier;
  const isPro = effectiveTier === 'pro' || effectiveTier === 'elite';
  const isLightMode = mounted && !isDark;

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

      {/* Profile header */}
      <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className={`w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xl shrink-0 ${isPro ? 'ring-2 ring-amber-400/75 ring-offset-2 ring-offset-white dark:ring-offset-slate-800' : ''}`}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={displayedName} className="w-full h-full object-cover" />
            ) : (
              displayedName.slice(0, 1).toUpperCase()
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{displayedName}</h1>
                {!mounted && isPro && (
                  <span className="h-5 w-14 rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
                )}
                {mounted && isPro && <TierBadge tier={effectiveTier} isLightMode={isLightMode} />}
              </div>

              {!isOwnProfile && ownProfile && (
                <FollowButton
                  targetProfileId={profile.id}
                  initialFollowing={isFollowing}
                  onFollowChange={handleFollowChange}
                />
              )}
            </div>

            <p className="text-slate-500 text-sm">@{profile.is_public ? profile.username : displayedName.toLowerCase()}</p>

            {profile.bio && (
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mt-2">{profile.bio}</p>
            )}

            <div className="flex items-center gap-3 mt-3 text-sm">
              <span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{followerCount}</span>
                <span className="text-slate-500 ml-1">Followers</span>
              </span>
              <span aria-hidden className="text-slate-400 dark:text-slate-500 select-none">•</span>
              <span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{followingCount}</span>
                <span className="text-slate-500 ml-1">Following</span>
              </span>
            </div>
          </div>
        </div>
      </div>

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
