import { getCachedUserSession } from '@/lib/server/session';
import { ensureSocialProfile } from '@/lib/server/socialProfile';
import { getPublicFeed, getTimeline } from '@/lib/server/feedPosts';
import { resolveSubscription } from '@/lib/server/subscription';
import { getMyChannels } from '@/lib/server/feedChannels';
import FeedClient from './FeedClient';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  let user = null;
  try {
    const session = await getCachedUserSession();
    user = session.user ?? null;
  } catch {
    // unauthenticated
  }

  const [profile, initialFeedData, initialSubscription, initialMyChannels, initialFollowingFeedData] = await Promise.all([
    user ? ensureSocialProfile() : null,
    getPublicFeed(undefined, 20),
    user ? resolveSubscription(user.id) : null,
    user ? getMyChannels() : null,
    user ? getTimeline(undefined, 20) : null,
  ]);

  return (
    <FeedClient
      userId={user?.id ?? null}
      initialProfile={profile}
      initialFeedData={initialFeedData}
      initialSubscription={initialSubscription}
      initialMyChannels={initialMyChannels ?? []}
      initialFollowingFeedData={initialFollowingFeedData ?? undefined}
    />
  );
}
