import { getInsideStrategyPageContext } from '@/lib/server/insideStrategyPageContext';
import AiVisionData from './AiVisionData';

// Force dynamic rendering — getInsideStrategyPageContext reads cookies
// (Supabase session + active-account) which require per-request execution.
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
