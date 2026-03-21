import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyChannels,
  getPublicChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  joinChannel,
  leaveChannel,
} from '@/lib/server/feedChannels';
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

export function usePublicChannels() {
  return useQuery({
    queryKey: queryKeys.feed.channels(),
    queryFn: () => getPublicChannels(),
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
