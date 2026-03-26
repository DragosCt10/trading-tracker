import { notFound } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { getCachedSocialProfile } from '@/lib/server/socialProfile';
import { getChannelBySlug, getChannelMembershipFlags } from '@/lib/server/feedChannels';
import { getChannelFeed } from '@/lib/server/feedPosts';
import { resolveSubscription } from '@/lib/server/subscription';
import ChannelClient from './ChannelClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ChannelPage({ params }: Props) {
  const { slug } = await params;

  const session = await getCachedUserSession();
  if (!session.user) notFound();

  const [channel, profile] = await Promise.all([
    getChannelBySlug(slug),
    getCachedSocialProfile(session.user.id),
  ]);
  if (!channel) notFound();

  const [initialFeed, initialMembership, initialSubscription] = await Promise.all([
    getChannelFeed(channel.id, undefined, 20),
    getChannelMembershipFlags(channel.id),
    resolveSubscription(session.user.id),
  ]);

  return (
    <ChannelClient
      channel={channel}
      initialFeed={initialFeed}
      initialMembership={initialMembership}
      initialSubscription={initialSubscription}
      userId={session.user.id}
      currentProfile={profile}
    />
  );
}
