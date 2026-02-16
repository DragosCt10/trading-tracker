import { getCachedUserSession } from '@/lib/server/trades';
import { redirect } from 'next/navigation';
import { getStrategyBySlug } from '@/lib/server/strategies';
import AnalyticsData from './AnalyticsData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    strategy: string;
  }>;
}

export default async function StrategyAnalyticsPage({ params }: PageProps) {
  // Unwrap the params promise as required by Next.js dynamic routes
  const resolvedParams = await params;
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  // Decode the strategy slug (URL-encoded)
  const strategySlug = decodeURIComponent(resolvedParams.strategy);

  // Verify the strategy exists and belongs to the user
  const strategy = await getStrategyBySlug(user.id, strategySlug);

  if (!strategy) {
    // Strategy not found, redirect to strategies page
    redirect('/strategies');
  }

  return <AnalyticsData user={user} strategySlug={strategySlug} />;
}