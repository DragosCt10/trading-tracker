import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@/lib/server/feedChannels';
import {
  getChannelInvites,
  createChannelInvite,
  revokeChannelInvite,
} from '@/lib/server/channelInvites';
import { queryKeys } from '@/lib/queryKeys';
import { FEED_DATA } from '@/constants/queryConfig';

export function useMyChannels(userId?: string) {
  return useQuery({
    queryKey: queryKeys.feed.channels(userId),
    queryFn: getMyChannels,
    enabled: !!userId,
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
    onSuccess: invalidateChannelLists,
  });

  const leave = useMutation({
    mutationFn: leaveChannel,
    onSuccess: invalidateChannelLists,
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
