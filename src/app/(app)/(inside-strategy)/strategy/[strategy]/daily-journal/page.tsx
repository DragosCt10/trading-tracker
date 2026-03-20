import { getCachedUserSession } from '@/lib/server/session';
import { redirect } from 'next/navigation';
import DailyJournalData from './DailyJournalData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ strategy: string }>;
}

export default async function DailyJournalPage({ params }: PageProps) {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  const resolvedParams = await params;
  const strategySlug = decodeURIComponent(resolvedParams.strategy);
  return <DailyJournalData user={user} strategySlug={strategySlug} />;
}
