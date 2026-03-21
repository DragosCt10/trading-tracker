'use client';

import { Crown } from 'lucide-react';
import PostCard from '@/components/feed/PostCard';
import FollowButton from '@/components/feed/FollowButton';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import type { SocialProfile, FeedPost, PaginatedResult } from '@/types/social';

interface ProfileClientProps {
  profile: SocialProfile;
  initialPosts: PaginatedResult<FeedPost>;
}

export default function ProfileClient({ profile, initialPosts }: ProfileClientProps) {
  const { data: userData } = useUserDetails();
  const userId = userData?.user?.id;
  const { data: ownProfile } = useSocialProfile(userId);

  const isPro = profile.tier === 'pro' || profile.tier === 'elite';
  const isOwnProfile = ownProfile?.user_id === profile.user_id;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-0 py-6 space-y-6">
      {/* Profile header */}
      <div className="rounded-2xl border border-slate-700/55 bg-slate-800/35 backdrop-blur-xl p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center text-slate-300 font-bold text-xl shrink-0"
            style={isPro ? { boxShadow: '0 0 0 2px rgba(251,191,36,0.45)' } : undefined}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              profile.display_name.slice(0, 1).toUpperCase()
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-100">{profile.display_name}</h1>
                {isPro && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Crown className="w-2.5 h-2.5" />
                    PRO
                  </span>
                )}
              </div>

              {!isOwnProfile && ownProfile && (
                <FollowButton
                  targetProfileId={profile.id}
                  initialFollowing={false}
                />
              )}
            </div>

            <p className="text-slate-500 text-sm">@{profile.username}</p>

            {profile.bio && (
              <p className="text-slate-300 text-sm leading-relaxed mt-2">{profile.bio}</p>
            )}

            <div className="flex items-center gap-4 mt-3 text-sm">
              <span>
                <span className="font-semibold text-slate-100">{profile.follower_count}</span>
                <span className="text-slate-500 ml-1">Followers</span>
              </span>
              <span>
                <span className="font-semibold text-slate-100">{profile.following_count}</span>
                <span className="text-slate-500 ml-1">Following</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide px-1">Posts</h2>

        {initialPosts.items.length === 0 ? (
          <div className="rounded-2xl border border-slate-700/55 bg-slate-800/35 backdrop-blur-xl p-8 text-center">
            <p className="text-slate-500 text-sm">No posts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialPosts.items.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={userId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
