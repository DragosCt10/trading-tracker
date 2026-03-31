import { getInsideStrategyPageContext } from '@/lib/server/insideStrategyPageContext';
import CustomStatsData from './CustomStatsData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ strategy: string }>;
}

export default async function CustomStatsPage({ params }: PageProps) {
  const { user, strategySlug } = await getInsideStrategyPageContext(params);
  return <CustomStatsData user={user} strategySlug={strategySlug} />;
}
