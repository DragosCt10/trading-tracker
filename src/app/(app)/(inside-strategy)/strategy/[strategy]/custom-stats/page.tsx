import { getCachedUserSession } from '@/lib/server/session';
import { redirect } from 'next/navigation';
import CustomStatsData from './CustomStatsData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ strategy: string }>;
}

export default async function CustomStatsPage({ params }: PageProps) {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  const resolvedParams = await params;
  const strategySlug = decodeURIComponent(resolvedParams.strategy);
  return <CustomStatsData user={user} strategySlug={strategySlug} />;
}
