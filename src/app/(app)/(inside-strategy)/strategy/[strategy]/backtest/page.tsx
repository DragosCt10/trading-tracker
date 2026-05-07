import { getInsideStrategyPageContext } from '@/lib/server/insideStrategyPageContext';
import BacktestData from './BacktestData';

// Force dynamic rendering — getInsideStrategyPageContext reads cookies
// (Supabase session + active-account) which require per-request execution.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ strategy: string }>;
}

export default async function BacktestPage({ params }: PageProps) {
  const { user, strategySlug } = await getInsideStrategyPageContext(params);
  return <BacktestData user={user} strategySlug={strategySlug} />;
}
