import { getInsideStrategyPageContext } from '@/lib/server/insideStrategyPageContext';
import AiVisionData from './AiVisionData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    strategy: string;
  }>;
}

export default async function AiVisionPage({ params }: PageProps) {
  const { user, strategySlug } = await getInsideStrategyPageContext(params);
  return <AiVisionData user={user} strategySlug={strategySlug} />;
}
