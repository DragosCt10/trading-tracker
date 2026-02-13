import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/server/trades';
import TradesData from './TradesData';

export const dynamic = 'force-dynamic';

export default async function TradesPage() {
  const { user, session } = await getUserSession();

  if (!user || !session) {
    redirect('/login');
  }

  return <TradesData />;
}
