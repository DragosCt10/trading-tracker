import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FeedChannel, PaginatedResult } from '@/types/social';
import {
  getMyChannels,
  getPublicChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  joinChannel,
  leaveChannel,
  getChannelMembershipFlags,
  getChannelMembersForOwner,
  addChannelMemberByHandle,
  removeChannelMemberByUserId,
  getRemovedPublicChannelIds,
  type ChannelMembershipFlags,
} from '@/lib/server/feedChannels';
import {
  getChannelInvites,
  createChannelInvite,
  revokeChannelInvite,
} from '@/lib/server/channelInvites';
import { queryKeys } from '@/lib/queryKeys';
import { FEED_DATA } from '@/constants/queryConfig';

export function useMyChannels(userId?: string, initialData?: FeedChannel[]) {
  return useQuery({
    queryKey: queryKeys.feed.channels(userId),
    queryFn: getMyChannels,
    enabled: !!userId,
    initialData,
    // eslint-disable-next-line react-hooks/purity
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    ...FEED_DATA,
  });
}

export function usePublicChannels(enabled = true) {
  return useQuery({
    queryKey: queryKeys.feed.channels(),
    queryFn: () => getPublicChannels(),
    enabled,
    ...FEED_DATA,
  });
}

export function useRemovedPublicChannelIds(userId?: string) {
  return useQuery({
    queryKey: queryKeys.removedPublicChannels(userId),
    queryFn: getRemovedPublicChannelIds,
    enabled: !!userId,
    ...FEED_DATA,
  });
}

export function useChannelMembershipFlags(channelId: string) {
  return useQuery({
    queryKey: queryKeys.channelMembership(channelId),
    queryFn: () => getChannelMembershipFlags(channelId),
    enabled: !!channelId,
    ...FEED_DATA,
  });
}

export function useChannelActions(userId?: string) {
  const qc = useQueryClient();
  const myChannelsKey = queryKeys.feed.channels(userId);
  const publicChannelsKey = queryKeys.feed.channels();

  function invalidateChannelLists() {
    qc.invalidateQueries({ queryKey: myChannelsKey });
    qc.invalidateQueries({ queryKey: publicChannelsKey });
    qc.invalidateQueries({ queryKey: ['channel-membership'] });
  }

  const create = useMutation({
    mutationFn: createChannel,
    onSuccess: invalidateChannelLists,
  });

  const update = useMutation({
    mutationFn: ({ channelId, input }: { channelId: string; input: Parameters<typeof updateChannel>[1] }) =>
      updateChannel(channelId, input),
    onSuccess: invalidateChannelLists,
  });

  const remove = useMutation({
    mutationFn: deleteChannel,
    onSuccess: invalidateChannelLists,
  });

  const join = useMutation({
    mutationFn: joinChannel,
    onMutate: async (channelId) => {
      await qc.cancelQueries({ queryKey: myChannelsKey });
      await qc.cancelQueries({ queryKey: publicChannelsKey });
      await qc.cancelQueries({ queryKey: queryKeys.channelMembership(channelId) });
      const previous = qc.getQueryData<FeedChannel[]>(myChannelsKey);
      const previousPub = qc.getQueryData<PaginatedResult<FeedChannel>>(publicChannelsKey);
      const previousMembership = qc.getQueryData<ChannelMembershipFlags>(queryKeys.channelMembership(channelId));
      const ch = previousPub?.items?.find((c) => c.id === channelId);
      const updatedCh = ch ? { ...ch, member_count: (ch.member_count ?? 0) + 1 } : undefined;
      if (updatedCh) {
        // Match getMyChannels sort (updated_at desc): joining bumps updated_at, so newest first.
        qc.setQueryData<FeedChannel[]>(myChannelsKey, (old = []) => [updatedCh, ...old.filter((c) => c.id !== channelId)]);
        qc.setQueryData<PaginatedResult<FeedChannel>>(publicChannelsKey, (old) =>
          old ? { ...old, items: old.items.map((c) => (c.id === channelId ? updatedCh : c)) } : old
        );
      }
      qc.setQueryData<ChannelMembershipFlags>(queryKeys.channelMembership(channelId), (old) =>
        old ? { ...old, isMember: true } : { isMember: true, removedByOwner: false }
      );
      return { previous, previousPub, previousMembership };
    },
    onSuccess: (result, channelId, ctx) => {
      if ('error' in result) {
        if (ctx?.previous !== undefined) qc.setQueryData(myChannelsKey, ctx.previous);
        if (ctx?.previousPub !== undefined) qc.setQueryData(publicChannelsKey, ctx.previousPub);
        if (ctx?.previousMembership !== undefined) qc.setQueryData(queryKeys.channelMembership(channelId), ctx.previousMembership);
      }
      invalidateChannelLists();
    },
    onError: (_err, channelId, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(myChannelsKey, ctx.previous);
      if (ctx?.previousPub !== undefined) qc.setQueryData(publicChannelsKey, ctx.previousPub);
      if (ctx?.previousMembership !== undefined) qc.setQueryData(queryKeys.channelMembership(channelId), ctx.previousMembership);
      invalidateChannelLists();
    },
  });

  const leave = useMutation({
    mutationFn: leaveChannel,
    onMutate: async (channelId) => {
      await qc.cancelQueries({ queryKey: myChannelsKey });
      await qc.cancelQueries({ queryKey: publicChannelsKey });
      await qc.cancelQueries({ queryKey: queryKeys.channelMembership(channelId) });
      const previous = qc.getQueryData<FeedChannel[]>(myChannelsKey);
      const previousPub = qc.getQueryData<PaginatedResult<FeedChannel>>(publicChannelsKey);
      const previousMembership = qc.getQueryData<ChannelMembershipFlags>(queryKeys.channelMembership(channelId));
      qc.setQueryData<FeedChannel[]>(myChannelsKey, (old = []) =>
        old.filter((c) => c.id !== channelId)
      );
      qc.setQueryData<PaginatedResult<FeedChannel>>(publicChannelsKey, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((c) =>
                c.id === channelId ? { ...c, member_count: Math.max(0, (c.member_count ?? 1) - 1) } : c
              ),
            }
          : old
      );
      qc.setQueryData<ChannelMembershipFlags>(queryKeys.channelMembership(channelId), (old) =>
        old ? { ...old, isMember: false } : { isMember: false, removedByOwner: false }
      );
      return { previous, previousPub, previousMembership };
    },
    onSuccess: (result, channelId, ctx) => {
      if ('error' in result) {
        if (ctx?.previous !== undefined) qc.setQueryData(myChannelsKey, ctx.previous);
        if (ctx?.previousPub !== undefined) qc.setQueryData(publicChannelsKey, ctx.previousPub);
        if (ctx?.previousMembership !== undefined) qc.setQueryData(queryKeys.channelMembership(channelId), ctx.previousMembership);
      }
      invalidateChannelLists();
    },
    onError: (_err, channelId, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(myChannelsKey, ctx.previous);
      if (ctx?.previousPub !== undefined) qc.setQueryData(publicChannelsKey, ctx.previousPub);
      if (ctx?.previousMembership !== undefined) qc.setQueryData(queryKeys.channelMembership(channelId), ctx.previousMembership);
      invalidateChannelLists();
    },
  });

  return { create, update, remove, join, leave };
}

export function useChannelInvites(channelId: string, userId?: string) {
  return useQuery({
    queryKey: queryKeys.channelInvites(channelId),
    queryFn: () => getChannelInvites(channelId),
    enabled: !!channelId && !!userId,
    ...FEED_DATA,
  });
}

export function useChannelInviteActions(channelId: string) {
  const qc = useQueryClient();
  const invitesKey = queryKeys.channelInvites(channelId);

  const create = useMutation({
    mutationFn: (input: Parameters<typeof createChannelInvite>[1]) =>
      createChannelInvite(channelId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey }),
  });

  const revoke = useMutation({
    mutationFn: revokeChannelInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey }),
  });

  return { create, revoke };
}

export function useChannelMembers(channelId: string, userId?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.channelMembers(channelId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const result = await getChannelMembersForOwner(channelId, pageParam ?? undefined);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: !!channelId && !!userId,
    ...FEED_DATA,
    refetchOnMount: true,
  });
}

export function useChannelMemberActions(channelId: string, userId?: string) {
  const qc = useQueryClient();
  const membersKey = queryKeys.channelMembers(channelId);
  const myChannelsKey = queryKeys.feed.channels(userId);
  const publicChannelsKey = queryKeys.feed.channels();

  function invalidateMemberAndChannelData() {
    qc.invalidateQueries({ queryKey: membersKey });
    qc.invalidateQueries({ queryKey: myChannelsKey });
    qc.invalidateQueries({ queryKey: publicChannelsKey });
    qc.invalidateQueries({ queryKey: ['channel-membership'] });
  }

  const add = useMutation({
    mutationFn: (handle: string) => addChannelMemberByHandle(channelId, handle),
    onSuccess: invalidateMemberAndChannelData,
  });

  const remove = useMutation({
    mutationFn: (memberUserId: string) => removeChannelMemberByUserId(channelId, memberUserId),
    onSuccess: invalidateMemberAndChannelData,
  });

  return { add, remove };
}
