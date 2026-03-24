'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Hash, Loader2, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChannelActions, useChannelMemberActions, useChannelMembers } from '@/hooks/useChannels';
import type { FeedChannel } from '@/types/social';

interface EditChannelModalProps {
  channel: FeedChannel;
  open: boolean;
  onClose: () => void;
  userId?: string;
}

const INPUT_CLASS =
  'h-11 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-sm text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 themed-focus';

function initialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function EditChannelModal({ channel, open, onClose, userId }: EditChannelModalProps) {
  const { update } = useChannelActions(userId);
  const {
    data: memberPages,
    isLoading: isLoadingMembers,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useChannelMembers(channel.id, userId);
  const { add, remove } = useChannelMemberActions(channel.id, userId);
  const [mounted, setMounted] = useState(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const [name, setName] = useState(channel.name);
  const [isPublic, setIsPublic] = useState(channel.is_public);
  const [memberHandle, setMemberHandle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    setName(channel.name);
    setIsPublic(channel.is_public);
    setMemberHandle('');
    setFormError(null);
    setMembersError(null);
    setPendingRemoveId(null);
  }, [channel.id, channel.is_public, channel.name, open]);

  const sortedMembers = useMemo(
    () =>
      [...(memberPages?.pages.flatMap((page) => page.items) ?? [])].sort((a, b) => {
        if (a.user_id === channel.owner_id) return -1;
        if (b.user_id === channel.owner_id) return 1;
        const left = a.profile?.username ?? '';
        const right = b.profile?.username ?? '';
        return left.localeCompare(right);
      }),
    [channel.owner_id, memberPages]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!formError && !membersError) return;
    const timeoutId = window.setTimeout(() => {
      setFormError(null);
      setMembersError(null);
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [formError, membersError]);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined') return;
    if (!hasNextPage || !observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (isLoadingMembers || isFetchingNextPage) return;
        void fetchNextPage();
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoadingMembers, mounted]);

  const hasChanges = name.trim() !== channel.name || isPublic !== channel.is_public;

  async function handleSave() {
    setFormError(null);
    const result = await update.mutateAsync({
      channelId: channel.id,
      input: {
        name: name.trim(),
        isPublic,
      },
    });

    if ('error' in result) {
      setFormError(result.error);
      return;
    }

    onClose();
  }

  async function handleAddMember() {
    const normalized = memberHandle.trim();
    if (!normalized) return;

    setMembersError(null);
    const result = await add.mutateAsync(normalized);
    if ('error' in result) {
      setMembersError(result.error);
      return;
    }

    setMemberHandle('');
  }

  async function handleRemoveMember(memberUserId: string) {
    setMembersError(null);
    setPendingRemoveId(memberUserId);
    try {
      const result = await remove.mutateAsync(memberUserId);
      if ('error' in result) {
        setMembersError(result.error);
      }
    } finally {
      setPendingRemoveId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl" />
        </div>
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg themed-header-icon-box">
                  <Hash className="h-5 w-5" />
                </div>
                <span>Edit Channel</span>
              </DialogTitle>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-sm h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <DialogDescription className="sr-only">Edit channel settings and members</DialogDescription>
          </DialogHeader>
        </div>

        <div className="relative overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Channel name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Scalping Setups"
              className={INPUT_CLASS}
              maxLength={60}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-t border-b border-slate-200/60 dark:border-slate-700/40">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Public channel</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Anyone can find and join this channel</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic((value) => !value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                isPublic ? 'themed-btn-primary' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  isPublic ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Members</p>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Users className="w-3.5 h-3.5" />
                {sortedMembers.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={memberHandle}
                onChange={(e) => setMemberHandle(e.target.value)}
                placeholder="Add by username (e.g. john)"
                className={INPUT_CLASS}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddMember();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddMember}
                disabled={!memberHandle.trim() || add.isPending}
                className="themed-btn-primary cursor-pointer h-11 rounded-xl text-white font-semibold px-4 border-0 disabled:opacity-60"
              >
                <span className="flex items-center gap-2 text-sm">
                  {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Add
                </span>
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/40 bg-white/40 dark:bg-slate-800/30 divide-y divide-slate-200/70 dark:divide-slate-700/50">
              {isLoadingMembers ? (
                <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading members...
                </div>
              ) : sortedMembers.length === 0 ? (
                <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">No members yet.</div>
              ) : (
                sortedMembers.map((member) => {
                  const isOwner = member.user_id === channel.owner_id || member.role === 'owner';
                  const isPending = pendingRemoveId === member.user_id;
                  return (
                    <div key={`${member.channel_id}-${member.user_id}`} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-slate-200/80 dark:bg-slate-700/70 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center">
                          {initialsFromName(member.profile?.display_name || member.profile?.username || 'U')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {member.profile?.display_name || member.profile?.username || 'Unknown user'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            @{member.profile?.username || 'unknown'} {isOwner ? '· owner' : ''}
                          </p>
                        </div>
                      </div>
                      {isOwner ? (
                        <span className="text-xs px-2 py-1 rounded-md bg-slate-200/70 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                          Owner
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending || remove.isPending}
                          onClick={() => void handleRemoveMember(member.user_id)}
                          className="h-8 cursor-pointer rounded-lg text-xs border-slate-300/90 bg-slate-50/70 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/70 dark:border-slate-600/70 dark:bg-slate-800/40 dark:text-rose-300 dark:hover:text-rose-200 dark:hover:border-rose-400/60 dark:hover:bg-rose-500/12"
                        >
                          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                          <span className="ml-1">Remove</span>
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
              {hasNextPage && (
                <div ref={observerTarget} className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {isFetchingNextPage ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading more...
                    </span>
                  ) : (
                    <span className="h-3.5 inline-block" />
                  )}
                </div>
              )}
            </div>
          </div>

          {(formError || membersError) && (
            <p className="text-sm text-rose-500">{formError || membersError}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={update.isPending}
              className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || update.isPending || !hasChanges}
              className="themed-btn-primary cursor-pointer rounded-xl text-white font-semibold px-4 py-2 border-0 disabled:opacity-60"
            >
              <span className="flex items-center gap-2 text-sm">
                {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {update.isPending ? 'Saving...' : 'Save changes'}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
