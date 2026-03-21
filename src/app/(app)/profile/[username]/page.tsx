import { notFound } from 'next/navigation';
import { getSocialProfileByUsername } from '@/lib/server/socialProfile';
import { getPostsByProfile } from '@/lib/server/feedPosts';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getSocialProfileByUsername(username);

  if (!profile) notFound();

  const initialPosts = await getPostsByProfile(profile.id, undefined, 20);

  return <ProfileClient profile={profile} initialPosts={initialPosts} />;
}
