import { getCachedUserSession } from '@/lib/server/trades';
import { redirect } from 'next/navigation';
import { getStrategyBySlug } from '@/lib/server/strategies';
import ManageTradesData from './ManageTradesData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ strategy: string }>;
}

export default async function ManageTradesPage({ params }: PageProps) {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');
  const resolvedParams = await params;
  const strategySlug = decodeURIComponent(resolvedParams.strategy);
  const strategy = await getStrategyBySlug(user.id, strategySlug);
  if (!strategy) redirect('/strategies');
  return <ManageTradesData user={user} initialStrategyId={strategy.id} />;
}
