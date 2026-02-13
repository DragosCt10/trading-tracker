import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/server/trades';
import DiscoverData from './DiscoverData';

// Ensure hard refresh always fetches fresh data and allows skeleton to stream (no cached RSC)
export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const { user, session } = await getUserSession();

  // Redirect if not authenticated
  if (!user || !session) {
    redirect('/login');
  }

  // Render immediately with Suspense - skeleton will show while data loads
  return <DiscoverData />;
}
