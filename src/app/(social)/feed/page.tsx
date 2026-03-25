import { getCachedUserSession } from '@/lib/server/session';
import { ensureSocialProfile } from '@/lib/server/socialProfile';
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

  const profile = user ? await ensureSocialProfile() : null;

  return (
    <FeedClient
      userId={user?.id ?? null}
      initialProfile={profile}
    />
  );
}
