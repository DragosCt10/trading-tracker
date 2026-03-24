'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
        className="h-7 w-[72px] rounded-lg bg-slate-200/80 dark:bg-slate-700/60 animate-pulse"
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
          ? 'h-7 px-2.5 text-xs rounded-lg border-slate-600/60 text-slate-300 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all duration-200 disabled:opacity-50 cursor-pointer'
          : 'h-7 px-2.5 text-xs themed-btn-primary relative overflow-hidden rounded-lg text-white border-0 disabled:opacity-50 group cursor-pointer'
      }
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
      {following ? 'Following' : 'Follow'}
      {!following && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
      )}
    </Button>
  );
}
