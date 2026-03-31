import { getInsideStrategyPageContext } from '@/lib/server/insideStrategyPageContext';
import StrategyData from './StrategyData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    strategy: string;
  }>;
}

export default async function StrategyPage({ params }: PageProps) {
  const { user, strategySlug } = await getInsideStrategyPageContext(params);

  return <StrategyData user={user} strategySlug={strategySlug} />;
}