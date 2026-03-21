import { getCachedUserSession } from '@/lib/server/session';
import { ensureSocialProfile } from '@/lib/server/socialProfile';
import { getPublicFeed } from '@/lib/server/feedPosts';
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

  const [profile, initialFeed] = await Promise.all([
    user ? ensureSocialProfile() : Promise.resolve(null),
    getPublicFeed(undefined, 20),
  ]);

  return (
    <FeedClient
      userId={user?.id ?? null}
      initialProfile={profile}
      initialFeed={initialFeed}
    />
  );
}
