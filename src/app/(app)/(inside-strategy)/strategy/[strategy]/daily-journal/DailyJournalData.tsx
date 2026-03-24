import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { HydrationBoundary } from '@tanstack/react-query';
import { loadInsideStrategySubpageData } from '@/lib/server/insideStrategySubpageLoader';
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
  const {
    strategy,
    mode,
    activeAccount,
    initialTrades,
    currencySymbol,
    accountBalance,
    dehydratedState,
  } = await loadInsideStrategySubpageData({
    userId: user.id,
    strategySlug,
  });

  if (!strategy || strategy.user_id !== user.id) redirect('/stats');

  return (
    <HydrationBoundary state={dehydratedState}>
      <DailyJournalClient
        strategyId={strategy.id}
        strategyName={strategy.name}
        initialTrades={initialTrades}
        initialActiveAccount={activeAccount}
        initialMode={mode}
        initialUserId={user.id}
        currencySymbol={currencySymbol}
        accountBalance={accountBalance}
      />
    </HydrationBoundary>
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
