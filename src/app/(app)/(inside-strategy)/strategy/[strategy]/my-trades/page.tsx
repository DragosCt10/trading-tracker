import { getCachedUserSession } from '@/lib/server/trades';
import { redirect } from 'next/navigation';
import MyTradesData from './MyTradesData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ strategy: string }>;
}

export default async function MyTradesPage({ params }: PageProps) {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');
  const resolvedParams = await params;
  const strategySlug = decodeURIComponent(resolvedParams.strategy);
  return <MyTradesData user={user} strategySlug={strategySlug} />;
}
