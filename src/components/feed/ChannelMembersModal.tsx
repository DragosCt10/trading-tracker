'use client';

import { Loader2, Users, X, Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { useChannelMembersList } from '@/hooks/useChannels';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { useDarkMode } from '@/hooks/useDarkMode';
import TierBadge from '@/components/feed/TierBadge';
import { getPublicDisplayName } from '@/utils/displayName';
import type { ChannelMember } from '@/types/social';

interface ChannelMembersModalProps {
  channelId: string;
  channelName: string;
  memberCount: number;
  currentUserId: string;
  open: boolean;
  onClose: () => void;
}

function MemberRow({ member, isLightMode, isSelf }: { member: ChannelMember; isLightMode: boolean; isSelf: boolean }) {
  const profile = member.profile;

  // Profile is null when RLS blocks it (private profile not visible to this user)
  if (!profile) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-1">
        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Private member</p>
        </div>
      </div>
    );
  }

  const isPrivate = !isSelf && profile.is_public === false;
  const initials = profile.display_name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
        {isPrivate ? (
          <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden />
        ) : profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {initials}
          </span>
        )}
      </div>

      {/* Name + username */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {getPublicDisplayName(profile, isSelf)}
        </p>
        {!isPrivate && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            @{profile.username}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {profile.tier && profile.tier !== 'starter' && (
          <TierBadge tier={profile.tier} isLightMode={isLightMode} />
        )}
        {member.role === 'owner' && (
          <span className="inline-flex items-center rounded-md px-2 py-0.5 border border-slate-300/60 dark:border-slate-600/60 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 select-none">
            Owner
          </span>
        )}
      </div>
    </div>
  );
}

export default function ChannelMembersModal({
  channelId,
  channelName,
  memberCount,
  currentUserId,
  open,
  onClose,
}: ChannelMembersModalProps) {
  const { isDark } = useDarkMode();
  const isLightMode = !isDark;

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useChannelMembersList(channelId, open);

  const sentinelRef = useInfiniteScrollSentinel(fetchNextPage, !!hasNextPage, isFetchingNextPage);

  const members = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent className="max-w-md max-h-[90vh] fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">

        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl" />
        </div>

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              <div className="p-2 rounded-lg themed-header-icon-box">
                <Users className="h-5 w-5" />
              </div>
              <span>Members</span>
              <span className="font-normal text-slate-400 dark:text-slate-500 text-base truncate max-w-[180px]">
                · {channelName}
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable member list */}
        <div className="relative overflow-y-auto flex-1 px-5 divide-y divide-slate-200/50 dark:divide-slate-700/40">
          {isLoading ? (
            Array.from({ length: Math.min(memberCount || 3, 6) }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-1 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-16 rounded bg-slate-200/70 dark:bg-slate-700/70" />
                </div>
              </div>
            ))
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">
              No members yet
            </p>
          ) : (
            <>
              {members.map((member) => (
                <MemberRow key={member.user_id} member={member} isLightMode={isLightMode} isSelf={member.user_id === currentUserId} />
              ))}
              <div ref={sentinelRef} />
              {isFetchingNextPage && (
                <div className="flex justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="h-4 flex-shrink-0" />
      </AlertDialogContent>
    </AlertDialog>
  );
}
