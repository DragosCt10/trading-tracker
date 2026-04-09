'use client';

import { useState, useRef, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { Hash, Plus, PlusCircle, Globe, Lock, UserPlus, Users, Settings2, Ban, Loader2 } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeed } from '@/hooks/useFeed';
import { usePostActions } from '@/hooks/usePostActions';
import { useMyChannels, usePublicChannels, useChannelActions, useRemovedPublicChannelIds } from '@/hooks/useChannels';
import { queryKeys } from '@/lib/queryKeys';
import FeedPostList from '@/components/feed/FeedPostList';
import InlineCreatePostCard from '@/components/feed/InlineCreatePostCard';
import NewPostsBanner from '@/components/feed/NewPostsBanner';
import { useNewPostsNotifier } from '@/hooks/useNewPostsNotifier';
import SearchBar from '@/components/feed/SearchBar';
import ActivityProgressCard from '@/components/feed/ActivityProgressCard';

const EditPostModal      = dynamic(() => import('@/components/feed/EditPostModal'));
const CreateChannelModal = dynamic(() => import('@/components/feed/CreateChannelModal'));
const ChannelInviteModal = dynamic(() => import('@/components/feed/ChannelInviteModal'));
const EditChannelModal   = dynamic(() => import('@/components/feed/EditChannelModal'));
const ProfilePreviewModal = dynamic(() => import('@/components/feed/ProfilePreviewModal'));
import { FEED_CARD_SURFACE_CLASS } from '@/components/feed/feedCardStyles';
import { cn } from '@/lib/utils';
import type { SocialProfile, FeedPost, FeedChannel, PaginatedResult } from '@/types/social';
import type { ResolvedSubscription } from '@/types/subscription';
import type { UserDiscount } from '@/types/userDiscount';

interface FeedClientProps {
  userId: string | null;
  initialProfile: SocialProfile | null;
  initialFeedData?: PaginatedResult<FeedPost>;
  initialSubscription?: ResolvedSubscription | null;
  initialMyChannels?: FeedChannel[];
  initialFollowingFeedData?: PaginatedResult<FeedPost>;
  initialActivityCount?: { posts: number; comments: number; total: number };
  initialActivityDiscount?: UserDiscount | null;
  initialActivityApplied?: boolean;
}

type FeedTab = 'public' | 'following' | 'channels';

const FEED_TAB_ICONS = {
  public: Globe,
  following: UserPlus,
  channels: Hash,
} as const;

const FEED_SURFACE_CLASS = FEED_CARD_SURFACE_CLASS;

function ChannelListSkeleton({ rows = 3, compact = false }: { rows?: number; compact?: boolean }) {
  return (
    <div className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`channel-skeleton-${index}`}
          className={compact ? 'flex items-center gap-2.5 px-4 py-2.5' : 'flex items-center gap-3 px-4 py-3'}
        >
          <div className={compact ? 'h-6 w-6 rounded-lg bg-slate-200/80 dark:bg-slate-700/60 animate-pulse' : 'h-8 w-8 rounded-lg bg-slate-200/80 dark:bg-slate-700/60 animate-pulse'} />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className={compact ? 'h-3 w-28 rounded bg-slate-200/80 dark:bg-slate-700/60 animate-pulse' : 'h-4 w-36 rounded bg-slate-200/80 dark:bg-slate-700/60 animate-pulse'} />
            <div className={compact ? 'h-2.5 w-20 rounded bg-slate-200/70 dark:bg-slate-700/40 animate-pulse' : 'h-3 w-24 rounded bg-slate-200/70 dark:bg-slate-700/40 animate-pulse'} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FeedClient({ userId, initialProfile, initialFeedData, initialSubscription, initialMyChannels, initialFollowingFeedData, initialActivityCount, initialActivityDiscount, initialActivityApplied }: FeedClientProps) {
  const uid = userId ?? undefined;
  const { subscription } = useSubscription({ userId: uid, initialData: initialSubscription ?? undefined });
  const [createError, setCreateError] = useState('');
  const [editPost, setEditPost] = useState<FeedPost | null>(null);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [inviteModalChannel, setInviteModalChannel] = useState<FeedChannel | null>(null);
  const [editModalChannel, setEditModalChannel] = useState<FeedChannel | null>(null);
  const { data: serverRemovedChannelIds = [] } = useRemovedPublicChannelIds(uid);
  const [localRemovedChannelIds, setLocalRemovedChannelIds] = useState<Set<string>>(new Set());
  const removedChannelIds = useMemo(
    () => new Set([...serverRemovedChannelIds, ...Array.from(localRemovedChannelIds)]),
    [serverRemovedChannelIds, localRemovedChannelIds]
  );
  const [joinErrorChannelId, setJoinErrorChannelId] = useState<string | null>(null);
  const joinErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>('public');
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'elite';
  const canCreateChannel = mounted && isPro;

  const isChannelsTab = activeTab === 'channels';
  const feedView = activeTab === 'following' ? 'following' : 'public';
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useFeed(
    uid,
    feedView === 'public' ? initialFeedData : initialFollowingFeedData,
    undefined,
    feedView,
  );
  const { like, create, edit, remove, report } = usePostActions(uid);
  const { data: myChannels = [], isLoading: isMyChannelsLoading } = useMyChannels(uid, initialMyChannels);
  const { data: publicChannelsResult } = usePublicChannels(isChannelsTab);
  const publicChannels = publicChannelsResult?.items ?? [];
  const { join: joinChannel, leave: leaveChannel } = useChannelActions(uid);
  const myChannelIds = new Set(myChannels.map((c) => c.id));
  const discoverChannels = publicChannels.filter((c) => !myChannelIds.has(c.id));
  const { newPostCount, clearCount } = useNewPostsNotifier(
    initialProfile?.id,
    activeTab === 'public',  // only public tab: following tab can't filter by followed users client-side
  );
  const queryClient = useQueryClient();
  const [feedChromeVisible, setFeedChromeVisible] = useState(true);
  const [previewUsername, setPreviewUsername] = useState<string | null>(null);
  const lastScrollY = useRef(0);

  const posts = data?.pages.flatMap((p) => p.items) ?? [];
  const visiblePosts =
    activeTab === 'following' && uid
      ? posts.filter((post) => post.author.user_id !== uid)
      : posts;

  const handleAuthorClick = useCallback((username: string) => setPreviewUsername(username), []);
  const handleLike = useCallback((id: string) => like.mutate(id), [like]);
  const handleDelete = useCallback((id: string) => remove.mutate(id), [remove]);
  const handleEdit = useCallback((p: FeedPost) => setEditPost(p), []);
  const handleReport = useCallback(
    (id: string, reason: string) => report.mutate({ postId: id, reason: reason.trim() }),
    [report]
  );

  function handleSeeNewPosts() {
    clearCount();
    queryClient.invalidateQueries({ queryKey: queryKeys.feed.public() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleQuickPost() {
    setActiveTab('public');
    clearCount();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Wait for the top composer to be in view after smooth scroll, then focus.
    setTimeout(() => {
      const composer = document.querySelector<HTMLTextAreaElement>('textarea[data-feed-composer="true"]');
      composer?.focus();
    }, 420);
  }

  useEffect(() => {
    let rafScheduled = false;
    const handleScroll = () => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const diff = currentY - lastScrollY.current;
        if (diff > 6) setFeedChromeVisible(false);
        else if (diff < -6) setFeedChromeVisible(true);
        lastScrollY.current = currentY;
        rafScheduled = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
      <div className="flex gap-6 items-start">
        {/* Main feed */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Tab bar — matches AdminClient */}
          <div
            className={cn(
              FEED_SURFACE_CLASS,
              'shrink-0 flex gap-1 p-1',
              activeTab !== 'channels' && 'sticky top-24 z-30 transition-all duration-300 ease-in-out',
              activeTab !== 'channels' && (feedChromeVisible
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-3 pointer-events-none')
            )}
          >
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
                    clearCount();
                  }}
                  className={cn(
                    'flex-1 rounded-xl px-4 py-2.5 min-h-[2.75rem] text-sm font-semibold transition-colors !shadow-none cursor-pointer flex items-center justify-center gap-1.5',
                    isActive
                      ? 'text-slate-900 dark:text-slate-50 shadow-sm border border-slate-300/60 dark:border-slate-700/50 bg-slate-50/90 dark:bg-slate-800/30'
                      : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent'
                  )}
                >
                  <TabIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'public' ? (
            <div className="shrink-0">
              {mounted && userId && initialProfile && subscription ? (
                <InlineCreatePostCard
                  userId={userId}
                  profile={initialProfile}
                  subscription={subscription}
                  onSubmit={handleCreate}
                  isSubmitting={create.isPending}
                  submitError={createError}
                />
              ) : mounted && !userId ? (
                <div className="flex justify-end">
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800">
                      Sign in to post
                    </Button>
                  </Link>
                </div>
              ) : null}
              <NewPostsBanner count={newPostCount} onClick={handleSeeNewPosts} />
            </div>
          ) : null}

          <div className="min-w-0">
          {isChannelsTab ? (
            <div className="flex flex-col gap-4">
            <div className={cn(FEED_SURFACE_CLASS, 'overflow-hidden')}>
              <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/40">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">My Channels</h3>
              </div>
              {isMyChannelsLoading ? (
                <ChannelListSkeleton rows={4} />
              ) : myChannels.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-slate-600 dark:text-slate-400 font-medium">No channels yet</p>
                  {canCreateChannel ? (
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
                    return (
                      <div key={channel.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors">
                        <Link href={`/feed/channel/${channel.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                            {channel.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" width="32" height="32" loading="lazy" />
                            ) : (
                              <Hash className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate leading-5">{channel.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-xs text-slate-500 dark:text-slate-500 truncate">#{channel.slug}</p>
                              {channel.member_count != null && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700 text-xs">·</span>
                                  <span className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-200">
                                    <Users className="w-3 h-3" />
                                    {channel.member_count}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                        {isOwner ? (
                          <div className="flex items-center gap-2 shrink-0">
                            {!channel.is_public && (
                              <>
                                <button
                                  type="button"
                                  title="Invite people"
                                  onClick={(e) => { e.preventDefault(); setInviteModalChannel(channel); }}
                                  className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 h-8 rounded-xl text-white text-xs font-medium themed-btn-primary border-0 transition-opacity hover:opacity-90"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  Add
                                </button>
                                <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
                              </>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                title="Edit channel"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditModalChannel(channel);
                                }}
                                className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 h-8 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-300/90 dark:border-slate-600/70 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
                              <span className="text-[10px] text-slate-500 dark:text-slate-200">
                                {channel.is_public ? 'Public' : 'Private'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            {channel.is_public
                              ? <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-600" />
                              : <Lock  className="w-3.5 h-3.5 text-slate-500 dark:text-slate-600" />
                            }
                            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 cursor-pointer rounded-xl text-xs border-slate-300/90 bg-slate-50/70 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/70 dark:border-slate-600/70 dark:bg-slate-800/40 dark:text-rose-300 dark:hover:text-rose-200 dark:hover:border-rose-400/60 dark:hover:bg-rose-500/12"
                              disabled={pendingChannelId === channel.id}
                              onClick={async () => {
                                setPendingChannelId(channel.id);
                                try {
                                  await leaveChannel.mutateAsync(channel.id);
                                } finally {
                                  setPendingChannelId(null);
                                }
                              }}
                            >
                              {pendingChannelId === channel.id
                                ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Leaving…</>
                                : 'Leave'}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {discoverChannels.length > 0 && (
              <div className={cn(FEED_SURFACE_CLASS, 'overflow-hidden')}>
                <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/40">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Discover</h3>
                </div>
                {joinErrorChannelId && (
                  <p className="px-4 py-2 text-xs text-rose-600 dark:text-rose-400">
                    You were removed from this channel by the owner.
                  </p>
                )}
                <div className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                  {discoverChannels.map((channel) => (
                    <div key={channel.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors">
                      <Link href={`/feed/channel/${channel.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                          {channel.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" width="32" height="32" loading="lazy" />
                          ) : (
                            <Hash className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate leading-5">{channel.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-slate-500 dark:text-slate-500 truncate">#{channel.slug}</p>
                            {channel.member_count != null && (
                              <>
                                <span className="text-slate-300 dark:text-slate-700 text-xs">·</span>
                                <span className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-200">
                                  <Users className="w-3 h-3" />
                                  {channel.member_count}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                      {uid && channel.owner_id !== initialProfile?.id && (
                        myChannelIds.has(channel.id) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 cursor-pointer h-8 rounded-xl text-xs border-slate-300/90 bg-slate-50/70 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/70 dark:border-slate-600/70 dark:bg-slate-800/40 dark:text-rose-300 dark:hover:text-rose-200 dark:hover:border-rose-400/60 dark:hover:bg-rose-500/12"
                            disabled={pendingChannelId === channel.id}
                            onClick={async () => {
                              setPendingChannelId(channel.id);
                              try {
                                await leaveChannel.mutateAsync(channel.id);
                              } finally {
                                setPendingChannelId(null);
                              }
                            }}
                          >
                            {pendingChannelId === channel.id
                              ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Leaving…</>
                              : 'Leave'}
                          </Button>
                        ) : removedChannelIds.has(channel.id) ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  className="shrink-0 h-8 rounded-xl text-xs border-rose-200 dark:border-rose-800/60 text-rose-400 dark:text-rose-500 bg-rose-50/50 dark:bg-rose-950/20 cursor-not-allowed opacity-70"
                                >
                                  <Ban className="w-3 h-3 mr-1" />
                                  Removed by owner
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                You were removed by the owner
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 h-8 rounded-xl text-xs border-slate-300 dark:border-slate-600 cursor-pointer"
                            disabled={pendingChannelId === channel.id}
                            onClick={async () => {
                              setPendingChannelId(channel.id);
                              try {
                                const result = await joinChannel.mutateAsync(channel.id);
                                if ('error' in result) {
                                  setLocalRemovedChannelIds((prev) => new Set(prev).add(channel.id));
                                  setJoinErrorChannelId(channel.id);
                                  if (joinErrorTimerRef.current) clearTimeout(joinErrorTimerRef.current);
                                  joinErrorTimerRef.current = setTimeout(() => setJoinErrorChannelId(null), 5000);
                                }
                              } finally {
                                setPendingChannelId(null);
                              }
                            }}
                          >
                            {pendingChannelId === channel.id
                              ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Joining…</>
                              : 'Join'}
                          </Button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          ) : (
            <FeedPostList
              posts={visiblePosts}
              isLoading={isLoading}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              fetchNextPage={fetchNextPage}
              currentUserId={uid}
              currentProfileId={initialProfile?.id}
              currentUserTier={subscription?.tier}
              onLike={handleLike}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onReport={handleReport}
              onAuthorClick={handleAuthorClick}
              emptyMessage="No posts yet"
              emptySubtext={
                activeTab === 'following'
                  ? 'Follow some traders to populate your timeline.'
                  : 'Follow some traders or be the first to post!'
              }
              skeletonCount={3}
              composerSkeletonFirst={
                activeTab === 'public' &&
                !(mounted && userId && initialProfile && subscription)
              }
            />
          )}
          </div>
        </div>

        {/* Sidebar — height follows content; long channel lists scroll inside a capped area */}
        <aside className={cn('hidden lg:flex flex-col gap-6 w-72 shrink-0 self-start h-fit', activeTab !== 'channels' && 'sticky top-24')}>
          <div className={cn(FEED_SURFACE_CLASS, 'relative z-50 shrink-0 overflow-visible py-1')}>
            <SearchBar />
          </div>

          <div className={cn(FEED_SURFACE_CLASS, 'flex flex-col overflow-hidden')}>
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/40">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">My Channels</h3>
              {canCreateChannel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 -mr-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  onClick={() => setChannelModalOpen(true)}
                  aria-label="Create channel"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="max-h-[min(50vh,18rem)] overflow-y-auto overscroll-y-contain divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isMyChannelsLoading ? (
                <ChannelListSkeleton rows={3} compact />
              ) : myChannels.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <p className="text-xs text-slate-500">No channels yet</p>
                  {canCreateChannel ? (
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
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                      {channel.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" width="28" height="28" loading="lazy" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate leading-5">{channel.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[11px] text-slate-500 dark:text-slate-500 truncate">#{channel.slug}</p>
                        {channel.member_count != null && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700 text-[11px]">·</span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-200">
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

          {initialProfile && <ActivityProgressCard profileId={initialProfile.id} initialCount={initialActivityCount} isPro={isPro} initialDiscount={initialActivityDiscount} initialApplied={initialActivityApplied} />}

          {mounted && userId && initialProfile && subscription && (
            <div
              className={cn(
                'transition-all duration-300 ease-in-out will-change-transform will-change-opacity',
                !feedChromeVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
              )}
            >
              <Button
                type="button"
                onClick={handleQuickPost}
                className="w-full h-12 cursor-pointer themed-btn-primary rounded-xl !text-white font-semibold text-base border-0 shadow-lg shadow-violet-500/30 relative overflow-hidden group"
                aria-label="Scroll to top and start writing a post"
                title="Post"
              >
                <span className="relative z-10 flex items-center gap-2.5 text-white">
                  <PlusCircle className="w-5 h-5 text-white" />
                  <span>Post</span>
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </div>
          )}
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
      {inviteModalChannel && (
        <ChannelInviteModal
          channel={inviteModalChannel}
          userId={uid}
          open={!!inviteModalChannel}
          onClose={() => setInviteModalChannel(null)}
        />
      )}
      {editModalChannel && (
        <EditChannelModal
          channel={editModalChannel}
          userId={uid}
          open={!!editModalChannel}
          onClose={() => {
            setEditModalChannel(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.feed.channels(uid) });
            queryClient.invalidateQueries({ queryKey: queryKeys.feed.channels() });
          }}
        />
      )}
      <ProfilePreviewModal
        open={!!previewUsername}
        username={previewUsername}
        currentProfileId={initialProfile?.id}
        onClose={() => setPreviewUsername(null)}
      />

    </div>
  );
}
