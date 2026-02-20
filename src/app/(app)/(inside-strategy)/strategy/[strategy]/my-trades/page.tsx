import { getCachedUserSession } from '@/lib/server/trades';
import { redirect } from 'next/navigation';
import MyTradesData from './MyTradesData';

export const dynamic = 'force-dynamic';

export default async function MyTradesPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');
  return <MyTradesData user={user} />;
}
