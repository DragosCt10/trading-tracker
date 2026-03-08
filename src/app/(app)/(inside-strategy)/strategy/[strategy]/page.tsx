import { getCachedUserSession } from '@/lib/server/session';
import { redirect } from 'next/navigation';
import StrategyData from './StrategyData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    strategy: string;
  }>;
}

export default async function StrategyPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  const strategySlug = decodeURIComponent(resolvedParams.strategy);

  return <StrategyData user={user} strategySlug={strategySlug} />;
}