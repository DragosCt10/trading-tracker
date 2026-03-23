'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { followUser, unfollowUser } from '@/lib/server/socialProfile';

interface FollowButtonProps {
  targetProfileId: string;
  initialFollowing: boolean;
  onFollowChange?: (following: boolean) => void;
}

export default function FollowButton({ targetProfileId, initialFollowing, onFollowChange }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

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
          ? 'rounded-xl border-slate-600/60 text-slate-300 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all duration-200 disabled:opacity-50'
          : 'themed-btn-primary relative overflow-hidden rounded-xl text-white border-0 disabled:opacity-50 group'
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
