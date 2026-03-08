import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getStrategyBySlug } from '@/lib/server/strategies';
import DailyJournalClient from './DailyJournalClient';
import { DailyJournalSkeleton } from './DailyJournalSkeleton';
import type { User } from '@supabase/supabase-js';

async function DailyJournalDataFetcher({
  user,
  strategySlug,
}: {
  user: User;
  strategySlug: string;
}) {
  const strategy = await getStrategyBySlug(user.id, strategySlug);
  if (!strategy) redirect('/strategies');

  return (
    <DailyJournalClient
      strategyId={strategy.id}
      strategyName={strategy.name}
    />
  );
}

interface DailyJournalDataProps {
  user: User;
  strategySlug: string;
}

export default function DailyJournalData({ user, strategySlug }: DailyJournalDataProps) {
  return (
    <Suspense fallback={<DailyJournalSkeleton />}>
      <DailyJournalDataFetcher user={user} strategySlug={strategySlug} />
    </Suspense>
  );
}
