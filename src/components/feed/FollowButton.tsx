'use client';

import { useEffect, useState } from 'react';
import { Loader2, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { followUser, unfollowUser } from '@/lib/server/socialProfile';

interface FollowButtonProps {
  targetProfileId: string;
  initialFollowing: boolean;
  isLoading?: boolean;
  onFollowChange?: (following: boolean) => void;
}

export default function FollowButton({ targetProfileId, initialFollowing, isLoading = false, onFollowChange }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  if (isLoading) {
    return (
      <div
        className="h-8 w-8 rounded-xl bg-slate-200/80 dark:bg-slate-700/60 animate-pulse"
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
          ? 'h-8 w-8 p-0 rounded-xl border border-slate-500/55 bg-slate-900/20 text-rose-400 hover:text-rose-300 hover:border-rose-400/60 hover:bg-rose-500/12 transition-all duration-200 disabled:opacity-50 cursor-pointer'
          : 'relative overflow-hidden h-8 w-8 p-0 rounded-xl text-white border-0 disabled:opacity-50 group cursor-pointer bg-gradient-to-r from-[#A665FF] via-[#8B5CF6] to-[#D32FD6] hover:from-[#B07CFF] hover:via-[#9D6BFF] hover:to-[#DF49DE] shadow-[0_10px_24px_-10px_rgba(168,95,255,0.95)]'
      }
      aria-label={following ? 'Unfollow user' : 'Follow user'}
      title={following ? 'Unfollow' : 'Follow'}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : following ? (
        <UserMinus className="w-3.5 h-3.5" />
      ) : (
        <UserPlus className="relative z-10 w-3.5 h-3.5" />
      )}
      {!following && !loading && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
      )}
    </Button>
  );
}
