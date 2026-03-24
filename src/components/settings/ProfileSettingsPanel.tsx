'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSocialProfile, checkUsernameAvailability, getFollowing, unfollowUser } from '@/lib/server/socialProfile';
import { queryKeys } from '@/lib/queryKeys';
import type { SocialProfile } from '@/types/social';

interface ProfileSettingsPanelProps {
  initialProfile: SocialProfile | null;
}

const INPUT_CLASS =
  'h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500';

export default function ProfileSettingsPanel({ initialProfile }: ProfileSettingsPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [savedProfile, setSavedProfile] = useState<SocialProfile | null>(initialProfile);
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? '');
  const [username, setUsername]         = useState(initialProfile?.username ?? '');
  const [bio, setBio]                   = useState(initialProfile?.bio ?? '');
  const [avatarUrl, setAvatarUrl]       = useState(initialProfile?.avatar_url ?? '');
  const [isPublic, setIsPublic]         = useState(initialProfile?.is_public ?? true);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');
  const [isPending, startTransition] = useTransition();

  // Following state
  const [pendingFollowingId, setPendingFollowingId] = useState<string | null>(null);
  const [followingError, setFollowingError]         = useState('');
  const [, startFollowingTransition] = useTransition();

  // Availability indicator: null when same as original (no check needed)
  const effectiveUsernameAvailable =
    username === savedProfile?.username ? null : usernameAvailable;

  const handleUsernameChange = useCallback(
    (value: string) => {
      const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setUsername(cleaned);
      setUsernameAvailable(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!cleaned || cleaned === savedProfile?.username) return;

      setUsernameChecking(true);
      debounceRef.current = setTimeout(async () => {
        const available = await checkUsernameAvailability(cleaned);
        setUsernameAvailable(available);
        setUsernameChecking(false);
      }, 400);
    },
    [savedProfile?.username]
  );

  // Following infinite query — paginated, "Load more" button
  const {
    data: followingPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.feed.following(savedProfile?.id),
    queryFn: ({ pageParam }) => getFollowing(savedProfile!.id, pageParam ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!savedProfile?.id,
    staleTime: 0,
  });
  const following = followingPages?.pages.flatMap((p) => p.items) ?? [];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (effectiveUsernameAvailable === false) {
      setError('Username is already taken.');
      return;
    }

    startTransition(async () => {
      const result = await updateSocialProfile({
        display_name: displayName.trim() || undefined,
        username:     username.trim() || undefined,
        bio:          bio.trim() || null,
        avatar_url:   avatarUrl.trim() || null,
        is_public:    isPublic,
      });

      if ('error' in result) {
        setError(result.error);
      } else {
        const updatedProfile = result.data;
        const oldUsername = savedProfile?.username;

        setSavedProfile(updatedProfile);
        setDisplayName(updatedProfile.display_name ?? '');
        setUsername(updatedProfile.username ?? '');
        setBio(updatedProfile.bio ?? '');
        setAvatarUrl(updatedProfile.avatar_url ?? '');
        setIsPublic(updatedProfile.is_public);
        setUsernameAvailable(null);
        setUsernameChecking(false);

        queryClient.setQueryData(queryKeys.socialProfile(updatedProfile.user_id), updatedProfile);
        queryClient.removeQueries({
          predicate: (query) =>
            typeof query.queryKey[0] === 'string' &&
            query.queryKey[0].startsWith('feed:'),
        });
        if (oldUsername && oldUsername !== updatedProfile.username) {
          queryClient.removeQueries({ queryKey: queryKeys.feed.profile(oldUsername) });
        }

        router.refresh();
        setMessage('Profile updated successfully.');
      }
    });
  }

  function handleUnfollow(targetProfileId: string) {
    setFollowingError('');
    setPendingFollowingId(targetProfileId);
    startFollowingTransition(async () => {
      const result = await unfollowUser(targetProfileId);
      setPendingFollowingId(null);
      if ('error' in result) {
        setFollowingError(result.error);
      } else {
        setSavedProfile(prev =>
          prev ? { ...prev, following_count: Math.max(0, prev.following_count - 1) } : prev
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.following(savedProfile?.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.socialProfile(savedProfile?.user_id) });
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* ── Social Profile form ── */}
      <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
          Social Profile
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Your public identity in the Alpha Level feed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="display-name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Display name
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              className={INPUT_CLASS}
              placeholder="Your name"
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Username
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm select-none">
                @
              </span>
              <Input
                id="username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                maxLength={50}
                className={`${INPUT_CLASS} pl-8`}
                placeholder="yourhandle"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2">
                {usernameChecking                                            && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                {!usernameChecking && effectiveUsernameAvailable === true  && <Check   className="w-4 h-4 text-green-500" />}
                {!usernameChecking && effectiveUsernameAvailable === false && <X       className="w-4 h-4 text-rose-500" />}
              </span>
            </div>
            {effectiveUsernameAvailable === false && (
              <p className="text-xs text-rose-500">Username is already taken.</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Bio
              </Label>
              <span className={`text-xs ${bio.length >= 260 ? 'text-amber-500' : 'text-slate-400'}`}>
                {bio.length}/280
              </span>
            </div>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Tell traders who you are..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm resize-none focus:outline-none themed-focus transition-all duration-300"
            />
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <Label htmlFor="avatar-url" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Avatar URL
            </Label>
            <Input
              id="avatar-url"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className={INPUT_CLASS}
              placeholder="https://..."
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between py-3 border-t border-slate-200/60 dark:border-slate-700/40">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Public profile</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Allow others to see your posts in the feed</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic((v) => !v)}
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

          {error   && <p className="text-sm text-rose-500">{error}</p>}
          {message && <p className="text-sm text-green-500">{message}</p>}

          <Button
            type="submit"
            disabled={isPending || effectiveUsernameAvailable === false}
            className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 [&_svg]:text-white"
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPending ? 'Saving...' : 'Save profile'}
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Button>
        </form>
      </div>

      {/* ── Following ── */}
      {following.length > 0 && (
        <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Following</h2>
            <span className="text-sm text-slate-400 dark:text-slate-500">
              {savedProfile?.following_count ?? following.length}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            People you follow. Unfollow anyone you want to remove.
          </p>
          <div className="space-y-0">
            {following.map((person) => {
              const isPendingThis = pendingFollowingId === person.id;
              const initials = (person.display_name ?? person.username ?? '?')
                .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={person.id} className="flex items-center gap-3 py-2.5 border-b border-slate-200/60 dark:border-slate-700/40 last:border-0">
                  <div className="shrink-0">
                    {person.avatar_url ? (
                      <Image src={person.avatar_url} alt={person.display_name ?? ''} width={32} height={32} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{initials}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {person.display_name ?? person.username ?? 'Unknown'}
                    </p>
                    {person.username && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">@{person.username}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPendingThis}
                    onClick={() => handleUnfollow(person.id)}
                    className="shrink-0 text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg px-2 py-1 h-auto disabled:opacity-50"
                  >
                    {isPendingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Unfollow'}
                  </Button>
                </div>
              );
            })}
          </div>
          {followingError && <p className="text-sm text-rose-500 mt-3">{followingError}</p>}
          {hasNextPage && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-3 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1.5 disabled:opacity-50"
            >
              {isFetchingNextPage ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isFetchingNextPage ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
