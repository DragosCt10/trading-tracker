import { getCachedUserSession } from '@/lib/server/trades';
import { redirect } from 'next/navigation';
import DiscoverData from './DiscoverData';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');
  return <DiscoverData user={user} />;
}
