import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { getCachedAccountsForMode } from '@/lib/server/accounts';
import { getFilteredTrades } from '@/lib/server/trades';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import { queryKeys } from '@/lib/queryKeys';
import DailyJournalClient from './DailyJournalClient';
import { DailyJournalSkeleton } from './DailyJournalSkeleton';
import type { User } from '@supabase/supabase-js';
import type { Trade } from '@/types/trade';

/** Server-safe currency symbol lookup (do not import from client components). */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  HKD: 'HK$',
  NZD: 'NZ$',
};

function getCurrencySymbol(account: { currency?: string | null }): string {
  if (!account?.currency) return '$';
  return CURRENCY_SYMBOLS[account.currency] ?? account.currency;
}

async function DailyJournalDataFetcher({
  user,
  strategySlug,
}: {
  user: User;
  strategySlug: string;
}) {
  const [strategy, allLiveAccounts] = await Promise.all([
    getStrategyBySlug(user.id, strategySlug),
    getCachedAccountsForMode(user.id, 'live'),
  ]);
  if (!strategy) redirect('/strategies');

  const activeAccount = allLiveAccounts.find((a) => a.is_active) ?? allLiveAccounts[0] ?? null;

  let initialTrades: Trade[] = [];
  let currencySymbol = '$';
  let accountBalance: number | null = null;

  if (activeAccount) {
    const allTime = createAllTimeRange();

    initialTrades = await getFilteredTrades({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      startDate: allTime.startDate,
      endDate: allTime.endDate,
      includeNonExecuted: true,
      strategyId: strategy.id,
    });

    accountBalance = activeAccount.account_balance ?? null;
    currencySymbol = getCurrencySymbol(activeAccount);
  }

  const queryClient = new QueryClient();
  if (activeAccount) {
    const allTime = createAllTimeRange();
    const filteredKey = queryKeys.trades.filtered(
      'live',
      activeAccount.id,
      user.id,
      'all',
      allTime.startDate,
      allTime.endDate,
      strategy.id,
    );
    queryClient.setQueryData(filteredKey, initialTrades);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DailyJournalClient
        strategyId={strategy.id}
        strategyName={strategy.name}
        initialTrades={initialTrades}
        initialActiveAccount={activeAccount}
        initialMode="live"
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
