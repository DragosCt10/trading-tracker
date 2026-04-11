import { notFound } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { getCachedSocialProfile, getSocialProfileByUsername, isFollowingProfile } from '@/lib/server/socialProfile';
import { getPostsByProfile } from '@/lib/server/feedPosts';
import ProfileClient from './ProfileClient';

export const revalidate = 60;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getSocialProfileByUsername(username);

  const session = await getCachedUserSession().catch(() => null);

  if (!profile) notFound();

  const [initialPosts, ownProfile, initialFollowing] = await Promise.all([
    getPostsByProfile(profile.id, undefined, 20),
    session?.user ? getCachedSocialProfile(session.user.id) : Promise.resolve(null),
    session?.user ? isFollowingProfile(profile.id) : Promise.resolve(false),
  ]);

  return (
    <ProfileClient
      profile={profile}
      initialPosts={initialPosts}
      currentProfileId={ownProfile?.id}
      initialFollowing={initialFollowing}
    />
  );
}
