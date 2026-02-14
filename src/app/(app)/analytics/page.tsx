import { getCachedUserSession } from '@/lib/server/trades';
import { redirect } from 'next/navigation';
import AnalyticsData from './AnalyticsData';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');
  return <AnalyticsData user={user} />;
}
