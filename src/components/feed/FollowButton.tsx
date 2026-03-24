'use client';

import { useEffect, useState } from 'react';
import { Loader2, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { followUser, unfollowUser } from '@/lib/server/socialProfile';
import { useTheme } from '@/hooks/useTheme';

interface FollowButtonProps {
  targetProfileId: string;
  initialFollowing: boolean;
  isLoading?: boolean;
  onFollowChange?: (following: boolean) => void;
}

export default function FollowButton({ targetProfileId, initialFollowing, isLoading = false, onFollowChange }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading]     = useState(false);
  const { theme, mounted } = useTheme();
  const isLightMode = mounted && theme === 'light';

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  if (isLoading) {
    return (
      <div
        className="h-7 w-7 rounded-xl bg-slate-200/80 dark:bg-slate-700/60 animate-pulse"
        aria-label="Loading follow button"
      />
    );
  }

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    const prevFollowing = following;
    setFollowing(!following); // optimistic

    const result = following
      ? await unfollowUser(targetProfileId)
      : await followUser(targetProfileId);

    if ('error' in result) {
      setFollowing(prevFollowing); // rollback
    } else {
      onFollowChange?.(!prevFollowing);
    }
    setLoading(false);
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={following ? 'outline' : 'default'}
      size="sm"
      className={
        following
          ? 'h-7 w-7 p-0 rounded-xl border border-slate-300/80 dark:border-slate-600/70 bg-slate-100/90 dark:bg-slate-800/40 text-slate-600 dark:text-rose-300 hover:text-rose-500 dark:hover:text-rose-200 hover:border-rose-300 dark:hover:border-rose-400/60 hover:bg-rose-50 dark:hover:bg-rose-500/12 transition-all duration-200 disabled:opacity-50 cursor-pointer'
          : isLightMode
            ? 'h-7 w-7 p-0 rounded-xl text-violet-700 border border-violet-300/80 bg-violet-100/80 hover:bg-violet-200/80 hover:border-violet-400/80 hover:text-violet-800 transition-colors duration-200 disabled:opacity-50 cursor-pointer'
            : 'relative overflow-hidden h-7 w-7 p-0 rounded-xl text-white border-0 disabled:opacity-50 group cursor-pointer bg-gradient-to-r from-[#A665FF] via-[#8B5CF6] to-[#D32FD6] hover:from-[#B07CFF] hover:via-[#9D6BFF] hover:to-[#DF49DE] shadow-[0_10px_24px_-10px_rgba(168,95,255,0.95)]'
      }
      aria-label={following ? 'Unfollow user' : 'Follow user'}
      title={following ? 'Unfollow' : 'Follow'}
    >
      {loading ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : following ? (
        <UserMinus className="w-2.5 h-2.5" />
      ) : (
        <UserPlus className="relative z-10 w-2.5 h-2.5" />
      )}
      {!following && !loading && !isLightMode && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
      )}
    </Button>
  );
}
