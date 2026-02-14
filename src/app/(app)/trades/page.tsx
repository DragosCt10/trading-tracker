import { getCachedUserSession } from '@/lib/server/trades';
import { redirect } from 'next/navigation';
import TradesData from './TradesData';

export const dynamic = 'force-dynamic';

export default async function TradesPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');
  return <TradesData user={user} />;
}
