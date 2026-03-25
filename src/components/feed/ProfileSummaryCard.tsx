'use client';

import type { ReactNode } from 'react';
import type { SocialProfile } from '@/types/social';
import type { TierId } from '@/types/subscription';
import FollowButton from './FollowButton';
import TierBadge from './TierBadge';
import { useTheme } from '@/hooks/useTheme';
import { getPublicDisplayName } from '@/utils/displayName';

interface ProfileSummaryCardProps {
  profile: SocialProfile;
  currentProfileId?: string;
  followerCount: number;
  followingCount: number;
  showBio?: boolean;
  showFollowButton?: boolean;
  initialFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
  nameExtras?: ReactNode;
  showTierBadge?: boolean;
  tierOverride?: TierId;
}

export default function ProfileSummaryCard({
  profile,
  currentProfileId,
  followerCount,
  followingCount,
  showBio = true,
  showFollowButton = true,
  initialFollowing = false,
  onFollowChange,
  nameExtras,
  showTierBadge = false,
  tierOverride,
}: ProfileSummaryCardProps) {
  const { theme, mounted } = useTheme();
  const isOwnProfile = currentProfileId === profile.id;
  const displayedName = getPublicDisplayName(profile);
  const effectiveTier = tierOverride ?? profile.tier;
  const isPro = effectiveTier === 'pro' || effectiveTier === 'elite';
  const isLightMode = mounted && theme === 'light';

  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
      <div className="flex items-start gap-4">
        <div className={`w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xl shrink-0 ${showTierBadge && mounted && isPro ? 'ring-2 ring-[#b45309]/45 dark:ring-[rgba(251,191,36,0.45)] ring-offset-2 ring-offset-white dark:ring-offset-slate-800' : ''}`}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={displayedName} className="w-full h-full object-cover" />
          ) : (
            displayedName.slice(0, 1).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{displayedName}</h1>
              {showTierBadge && !mounted && isPro && (
                <span className="h-5 w-14 rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
              )}
              {showTierBadge && mounted && isPro && (
                <TierBadge tier={effectiveTier} isLightMode={isLightMode} />
              )}
              {nameExtras}
            </div>

            {!isOwnProfile && showFollowButton && (
              <FollowButton
                targetProfileId={profile.id}
                initialFollowing={initialFollowing}
                onFollowChange={onFollowChange}
              />
            )}
          </div>

          <p className="text-slate-500 text-sm">@{profile.is_public ? profile.username : displayedName.toLowerCase()}</p>

          {showBio && profile.bio && (
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
  );
}
