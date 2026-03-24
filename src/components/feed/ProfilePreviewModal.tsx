'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import ProfileSummaryCard from './ProfileSummaryCard';
import { getSocialProfilePreviewByUsername, type SocialProfilePreview } from '@/lib/server/socialProfile';

interface ProfilePreviewModalProps {
  open: boolean;
  username: string | null;
  currentProfileId?: string;
  onClose: () => void;
}

export default function ProfilePreviewModal({
  open,
  username,
  currentProfileId,
  onClose,
}: ProfilePreviewModalProps) {
  const [preview, setPreview] = useState<SocialProfilePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!open || !username) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getSocialProfilePreviewByUsername(username)
      .then((result) => {
        if (cancelled) return;
        if ('error' in result) {
          setPreview(null);
          setError(result.error);
          return;
        }
        setPreview(result.data);
        setIsFollowing(result.data.isFollowing);
        setFollowerCount(result.data.profile.follower_count);
      })
      .catch(() => {
        if (!cancelled) {
          setPreview(null);
          setError('Failed to load profile');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, username]);

  function handleFollowChange(nextFollowing: boolean) {
    setIsFollowing(nextFollowing);
    setFollowerCount((prev) => Math.max(0, prev + (nextFollowing ? 1 : -1)));
  }

  const profile = preview?.profile;
  const profileHref = profile ? `/profile/${profile.username}` : '#';

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <AlertDialogContent
        aria-describedby="profile-preview-description"
        className="max-w-xl max-h-[90vh] fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl" />
        </div>

        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg themed-header-icon-box">
                  <UserRound className="h-5 w-5" />
                </div>
                <span>Profile preview</span>
              </AlertDialogTitle>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-sm h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <AlertDialogDescription id="profile-preview-description" className="sr-only">
              Preview user profile details and navigate to all posts.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <div className="relative overflow-y-auto flex-1 px-6 py-5">
          {loading ? (
            <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 p-5">
              <div className="animate-pulse flex items-start gap-3">
                <div className="h-14 w-14 rounded-full bg-slate-200/80 dark:bg-slate-700/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-44 rounded bg-slate-200/80 dark:bg-slate-700/60" />
                  <div className="h-4 w-32 rounded bg-slate-200/70 dark:bg-slate-700/50" />
                  <div className="h-4 w-48 rounded bg-slate-200/70 dark:bg-slate-700/50" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-300/50 dark:border-rose-800/60 p-4 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </div>
          ) : profile ? (
            <ProfileSummaryCard
              profile={profile}
              currentProfileId={currentProfileId}
              followerCount={followerCount}
              followingCount={profile.following_count}
              showBio={false}
              showFollowButton
              initialFollowing={isFollowing}
              onFollowChange={handleFollowChange}
              showTierBadge
            />
          ) : null}

          {profile && preview?.hasPosts && (
            <div className="mt-4 flex justify-end">
              <Button asChild className="themed-btn-primary relative overflow-hidden rounded-xl text-white border-0">
                <Link href={profileHref} onClick={onClose}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  See all posts
                </Link>
              </Button>
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
