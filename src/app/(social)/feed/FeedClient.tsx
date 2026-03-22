'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Hash, Plus, Globe, Lock, Loader2, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeed } from '@/hooks/useFeed';
import { usePostActions } from '@/hooks/usePostActions';
import { useMyChannels } from '@/hooks/useChannels';
import { updateChannel } from '@/lib/server/feedChannels';
import { queryKeys } from '@/lib/queryKeys';
import FeedPostList from '@/components/feed/FeedPostList';
import InlineCreatePostCard from '@/components/feed/InlineCreatePostCard';
import EditPostModal from '@/components/feed/EditPostModal';
import CreateChannelModal from '@/components/feed/CreateChannelModal';
import SearchBar from '@/components/feed/SearchBar';
import { cn } from '@/lib/utils';
import type { SocialProfile, FeedPost, PaginatedResult } from '@/types/social';

interface FeedClientProps {
  userId: string | null;
  initialProfile: SocialProfile | null;
  initialFeed: PaginatedResult<FeedPost>;
}

type FeedTab = 'public' | 'following' | 'channels';

const FEED_TAB_ICONS = {
  public: Globe,
  following: UserPlus,
  channels: Hash,
} as const;

export default function FeedClient({ userId, initialProfile, initialFeed }: FeedClientProps) {
  const uid = userId ?? undefined;
  const { subscription } = useSubscription({ userId: uid });
  const [createError, setCreateError] = useState('');
  const [editPost, setEditPost] = useState<FeedPost | null>(null);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>('public');
  const [composerCollapsed, setComposerCollapsed] = useState(false);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const lastFeedScrollTop = useRef(0);
  const composerLocked = useRef(false);

  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'elite';

  const isChannelsTab = activeTab === 'channels';
  const feedView = activeTab === 'following' ? 'following' : 'public';
  const feedInitialData = feedView === 'public' ? initialFeed : undefined;
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useFeed(uid, feedInitialData, undefined, feedView);
  const { like, create, edit, remove, report } = usePostActions(uid);
  const { data: myChannels = [] } = useMyChannels(uid);
  const queryClient = useQueryClient();
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
  const [, startChannelTransition] = useTransition();

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  function handleChannelToggle(e: React.MouseEvent, channelId: string, currentlyPublic: boolean) {
    e.preventDefault();
    e.stopPropagation();
    setPendingChannelId(channelId);
    startChannelTransition(async () => {
      await updateChannel(channelId, { isPublic: !currentlyPublic });
      setPendingChannelId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.channels(uid) });
    });
  }

  /** Match AppLayout ActionBar: hide on scroll down, show on scroll up; near top always expanded */
  useEffect(() => {
    const el = feedScrollRef.current;
    if (!el) return;

    const collapse = (next: boolean) => {
      if (composerLocked.current) return;
      composerLocked.current = true;
      setComposerCollapsed(next);
      // Hold the lock for the full animation duration so layout-triggered
      // scroll events (card resize → scrollTop clamp) can't flip the state back.
      setTimeout(() => {
        composerLocked.current = false;
        lastFeedScrollTop.current = el.scrollTop;
      }, 350);
    };

    const onScroll = () => {
      if (composerLocked.current) return;
      const current = el.scrollTop;
      const diff = current - lastFeedScrollTop.current;
      lastFeedScrollTop.current = current;
      if (current < 12) {
        collapse(false);
      } else if (diff > 8) {
        collapse(true);
      } else if (diff < -8) {
        collapse(false);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  async function handleCreate(input: { content: string; tradeId?: string; tradeMode?: 'live' | 'demo' | 'backtesting' }) {
    setCreateError('');
    const result = await create.mutateAsync(input);
    if ('error' in result) {
      setCreateError(result.error);
      return;
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-0 py-6">
      {/* 8rem = layout pt-20 (5rem) + this page py-6 (3rem); inner column scrolls feed only */}
      <div className="flex gap-6 items-stretch min-h-0 h-[calc(100dvh-8rem)] max-h-[calc(100dvh-8rem)]">
        {/* Main feed */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-6">
          {/* Tab bar — matches AdminClient */}
          <div className="shrink-0 flex gap-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20 p-1 backdrop-blur-sm">
            {([
              { id: 'public', label: 'Public' },
              { id: 'following', label: 'Following' },
              { id: 'channels', label: 'Channels' },
            ] as const).map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = FEED_TAB_ICONS[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setComposerCollapsed(false);
                    lastFeedScrollTop.current = feedScrollRef.current?.scrollTop ?? 0;
                  }}
                  className={cn(
                    'flex-1 rounded-xl px-4 py-2 min-h-[2.75rem] text-sm font-semibold transition-colors !shadow-none cursor-pointer flex items-center justify-center gap-1.5',
                    isActive
                      ? 'text-slate-900 dark:text-slate-50 shadow-sm border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/30'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  <TabIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="shrink-0">
            {userId && initialProfile && subscription ? (
              <InlineCreatePostCard
                userId={userId}
                profile={initialProfile}
                subscription={subscription}
                onSubmit={handleCreate}
                isSubmitting={create.isPending}
                submitError={createError}
                collapsed={composerCollapsed}
                onExpand={() => { composerLocked.current = false; setComposerCollapsed(false); }}
              />
            ) : !userId ? (
              <div className="flex justify-end">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800">
                    Sign in to post
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>

          <div
            ref={feedScrollRef}
            className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-y-contain pr-1 -mr-1 [scrollbar-gutter:stable]"
          >
          {isChannelsTab ? (
            <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/40">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your Channels</h3>
              </div>
              {myChannels.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-slate-600 dark:text-slate-400 font-medium">No channels yet</p>
                  {isPro ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      onClick={() => setChannelModalOpen(true)}
                    >
                      Create channel
                    </Button>
                  ) : (
                    <Link
                      href="/settings?tab=billing"
                      className="inline-block mt-3 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 underline underline-offset-2"
                    >
                      Upgrade to PRO to create channels
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                  {myChannels.map((channel) => {
                    const isOwner = channel.owner_id === initialProfile?.id;
                    const isPendingThis = pendingChannelId === channel.id;
                    return (
                      <div key={channel.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 transition-colors">
                        <Link href={`/feed/channel/${channel.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-200/90 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-300/60 dark:border-slate-700/60">
                            <Hash className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{channel.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-xs text-slate-500 dark:text-slate-600 truncate">#{channel.slug}</p>
                              {channel.member_count != null && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700 text-xs">·</span>
                                  <span className="flex items-center gap-0.5 text-xs text-slate-400 dark:text-slate-600">
                                    <Users className="w-3 h-3" />
                                    {channel.member_count}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                        {isOwner ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={channel.is_public}
                            disabled={isPendingThis}
                            onClick={(e) => handleChannelToggle(e, channel.id, channel.is_public)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 disabled:opacity-50 ${
                              channel.is_public ? 'themed-btn-primary' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          >
                            {isPendingThis
                              ? <Loader2 className="absolute inset-0 m-auto w-3 h-3 animate-spin text-white" />
                              : <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${channel.is_public ? 'translate-x-6' : 'translate-x-1'}`} />
                            }
                          </button>
                        ) : (
                          channel.is_public
                            ? <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-600 shrink-0" />
                            : <Lock  className="w-3.5 h-3.5 text-slate-500 dark:text-slate-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <FeedPostList
              posts={posts}
              isLoading={isLoading}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              fetchNextPage={fetchNextPage}
              currentUserId={uid}
              currentProfileId={initialProfile?.id}
              currentUserTier={subscription?.tier}
              onLike={(id) => like.mutate(id)}
              onDelete={(id) => remove.mutate(id)}
              onEdit={(p) => setEditPost(p)}
              onReport={(id) => report.mutate({ postId: id, reason: 'Reported by user' })}
              emptyMessage="No posts yet"
              emptySubtext={
                activeTab === 'following'
                  ? 'Follow some traders to populate your timeline.'
                  : 'Follow some traders or be the first to post!'
              }
              skeletonCount={5}
            />
          )}
          </div>
        </div>

        {/* Sidebar — height follows content; long channel lists scroll inside a capped area */}
        <aside className="hidden lg:flex flex-col gap-6 w-72 shrink-0 self-start">
          <div className="shrink-0 rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-1">
            <SearchBar />
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/40">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Channels</h3>
              {isPro && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => setChannelModalOpen(true)}
                  aria-label="Create channel"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="max-h-[min(50vh,18rem)] overflow-y-auto overscroll-y-contain divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {myChannels.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <p className="text-xs text-slate-500">No channels yet</p>
                  {isPro ? (
                    <button
                      onClick={() => setChannelModalOpen(true)}
                      className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 mt-1 underline underline-offset-2"
                    >
                      Create one
                    </button>
                  ) : (
                    <Link href="/settings?tab=billing" className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 mt-1 underline underline-offset-2">
                      Upgrade to PRO
                    </Link>
                  )}
                </div>
              ) : (
                myChannels.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/feed/channel/${channel.slug}`}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-100/90 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-200/90 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-300/60 dark:border-slate-700/60">
                      <Hash className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{channel.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[10px] text-slate-500 dark:text-slate-600 truncate">#{channel.slug}</p>
                        {channel.member_count != null && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700 text-[10px]">·</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-600">
                              <Users className="w-2.5 h-2.5" />
                              {channel.member_count}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {channel.is_public
                      ? <Globe className="w-3 h-3 text-slate-500 dark:text-slate-600 shrink-0" />
                      : <Lock  className="w-3 h-3 text-slate-500 dark:text-slate-600 shrink-0" />
                    }
                  </Link>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {editPost && userId && subscription && (
        <EditPostModal
          open={!!editPost}
          onClose={() => setEditPost(null)}
          onSubmit={async (content) => {
            const result = await edit.mutateAsync({ postId: editPost.id, content });
            if ('error' in result) { setCreateError(result.error); return; }
            setEditPost(null);
          }}
          initialContent={editPost.content}
          maxLen={subscription.definition.limits.maxPostContentLength}
          isSubmitting={edit.isPending}
          submitError={createError}
        />
      )}
      <CreateChannelModal
        open={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        userId={uid}
      />
    </div>
  );
}
