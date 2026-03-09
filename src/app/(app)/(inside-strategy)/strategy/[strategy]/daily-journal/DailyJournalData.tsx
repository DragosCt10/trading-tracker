import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import { getFilteredTrades } from '@/lib/server/trades';
import DailyJournalClient from './DailyJournalClient';
import { DailyJournalSkeleton } from './DailyJournalSkeleton';
import type { User } from '@supabase/supabase-js';
import type { Trade } from '@/types/trade';

async function DailyJournalDataFetcher({
  user,
  strategySlug,
}: {
  user: User;
  strategySlug: string;
}) {
  const [strategy, activeAccount] = await Promise.all([
    getStrategyBySlug(user.id, strategySlug),
    getActiveAccountForMode(user.id, 'live'),
  ]);
  if (!strategy) redirect('/strategies');

  let trades: Trade[] = [];
  let currencySymbol = '$';

  if (activeAccount) {
    const startDate = '2000-01-01';
    const endDate = new Date().toISOString().split('T')[0];

    trades = await getFilteredTrades({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      startDate,
      endDate,
      includeNonExecuted: true,
      strategyId: strategy.id,
    });

    if (activeAccount.currency === 'USD') {
      currencySymbol = '$';
    } else if (activeAccount.currency === 'EUR') {
      currencySymbol = '€';
    } else if (activeAccount.currency === 'GBP') {
      currencySymbol = '£';
    } else if (activeAccount.currency) {
      currencySymbol = activeAccount.currency;
    }
  }

  return (
    <DailyJournalClient
      strategyId={strategy.id}
      strategyName={strategy.name}
      initialTrades={trades}
      currencySymbol={currencySymbol}
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
