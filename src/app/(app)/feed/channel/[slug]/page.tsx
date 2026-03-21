import { notFound } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { getCachedSocialProfile } from '@/lib/server/socialProfile';
import { getPublicChannels } from '@/lib/server/feedChannels';
import { getChannelFeed } from '@/lib/server/feedPosts';
import ChannelClient from './ChannelClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ChannelPage({ params }: Props) {
  const { slug } = await params;

  const channelsResult = await getPublicChannels(undefined, 100);
  const channel = channelsResult.items.find((c) => c.slug === slug);
  if (!channel) notFound();

  const session = await getCachedUserSession();
  const profile = session.user ? await getCachedSocialProfile(session.user.id) : null;

  const initialFeed = await getChannelFeed(channel.id, undefined, 20);

  return (
    <ChannelClient
      channel={channel}
      initialFeed={initialFeed}
      currentProfileId={profile?.id}
    />
  );
}
