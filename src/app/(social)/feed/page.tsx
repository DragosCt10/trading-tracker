import { getCachedUserSession } from '@/lib/server/session';
import { ensureSocialProfile } from '@/lib/server/socialProfile';
import { getPublicFeed, getTimeline } from '@/lib/server/feedPosts';
import { resolveSubscription } from '@/lib/server/subscription';
import { getMyChannels } from '@/lib/server/feedChannels';
import { getUserActivityCount } from '@/lib/server/feedActivity';
import { getDiscountByTypeAndMilestone } from '@/lib/server/discounts';
import { NO_MILESTONE } from '@/types/userDiscount';
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

  const [initialActivityCount, activityDiscount] = await Promise.all([
    profile ? getUserActivityCount(profile.id) : null,
    user ? getDiscountByTypeAndMilestone(user.id, 'activity', NO_MILESTONE) : null,
  ]);

  // The activity discount is "applied" when it has a pending variant revert attached.
  const initialActivityApplied = activityDiscount?.revertSubscriptionId != null;

  return (
    <FeedClient
      userId={user?.id ?? null}
      initialProfile={profile}
      initialFeedData={initialFeedData}
      initialSubscription={initialSubscription}
      initialMyChannels={initialMyChannels ?? []}
      initialFollowingFeedData={initialFollowingFeedData ?? undefined}
      initialActivityCount={initialActivityCount ?? undefined}
      initialActivityDiscount={activityDiscount}
      initialActivityApplied={initialActivityApplied}
    />
  );
}
