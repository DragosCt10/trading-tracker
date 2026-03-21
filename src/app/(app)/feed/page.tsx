import { redirect } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { ensureSocialProfile } from '@/lib/server/socialProfile';
import { getPublicFeed } from '@/lib/server/feedPosts';
import FeedClient from './FeedClient';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  // Auto-create social profile on first visit (silent, zero friction)
  const [profile, initialFeed] = await Promise.all([
    ensureSocialProfile(),
    getPublicFeed(undefined, 20),
  ]);

  return (
    <FeedClient
      userId={user.id}
      initialProfile={profile}
      initialFeed={initialFeed}
    />
  );
}
