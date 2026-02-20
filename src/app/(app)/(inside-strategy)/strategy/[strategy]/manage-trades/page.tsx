import { getCachedUserSession } from '@/lib/server/trades';
import { redirect } from 'next/navigation';
import ManageTradesData from './ManageTradesData';

export const dynamic = 'force-dynamic';

export default async function ManageTradesPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');
  return <ManageTradesData user={user} />;
}
