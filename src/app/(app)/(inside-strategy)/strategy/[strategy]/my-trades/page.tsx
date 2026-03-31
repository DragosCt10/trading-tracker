import { getInsideStrategyPageContext } from '@/lib/server/insideStrategyPageContext';
import MyTradesData from './MyTradesData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ strategy: string }>;
}

export default async function MyTradesPage({ params }: PageProps) {
  const { user, strategySlug } = await getInsideStrategyPageContext(params);
  return <MyTradesData user={user} strategySlug={strategySlug} />;
}
