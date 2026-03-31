import { getInsideStrategyPageContext } from '@/lib/server/insideStrategyPageContext';
import DailyJournalData from './DailyJournalData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ strategy: string }>;
}

export default async function DailyJournalPage({ params }: PageProps) {
  const { user, strategySlug } = await getInsideStrategyPageContext(params);
  return <DailyJournalData user={user} strategySlug={strategySlug} />;
}
