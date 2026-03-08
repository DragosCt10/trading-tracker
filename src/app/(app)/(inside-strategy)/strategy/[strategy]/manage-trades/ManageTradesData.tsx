import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getFilteredTrades } from '@/lib/server/trades';
import { getCachedAccountsForMode } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import { queryKeys } from '@/lib/queryKeys';
import ManageTradesClient from './ManageTradesClient';
import { Trade } from '@/types/trade';
import { ManageTradesSkeleton } from './ManageTradesSkeleton';
import type { User } from '@supabase/supabase-js';

async function TradesDataFetcher({
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
  const activeAccount = allLiveAccounts.find((a) => a.is_active) ?? allLiveAccounts[0] ?? null;
  if (!strategy) redirect('/strategies');
  const initialStrategyId = strategy.id;
  const today = new Date();
  const initialDateRange = createAllTimeRange(today);

  if (!activeAccount) {
    return (
      <ManageTradesClient
        initialUserId={user.id}
        initialTrades={[]}
        initialDateRange={initialDateRange}
        initialMode="live"
        initialActiveAccount={null}
        initialStrategyId={initialStrategyId}
      />
    );
  }

  let initialTrades: Trade[] = [];
  try {
    initialTrades = await getFilteredTrades({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      startDate: initialDateRange.startDate,
      endDate: initialDateRange.endDate,
      includeNonExecuted: true,
      strategyId: initialStrategyId,
    });
  } catch (error) {
    console.error('Error fetching initial trades:', error);
  }

  // Seed client cache with same key the client uses (initialDateRange so server/client key matches — avoids duplicate fetch and hydration mismatch) (audit 2.4).
  const queryClient = new QueryClient();
  const filteredKey = queryKeys.trades.filtered(
    'live',
    activeAccount.id,
    user.id,
    'all',
    initialDateRange.startDate,
    initialDateRange.endDate,
    initialStrategyId,
  );
  queryClient.setQueryData(filteredKey, initialTrades);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ManageTradesClient
        initialUserId={user.id}
        initialTrades={initialTrades}
        initialDateRange={initialDateRange}
        initialMode="live"
        initialActiveAccount={activeAccount}
        initialStrategyId={initialStrategyId}
      />
    </HydrationBoundary>
  );
}

interface ManageTradesDataProps {
  user: User;
  strategySlug: string;
}

export default function ManageTradesData({ user, strategySlug }: ManageTradesDataProps) {
  return (
    <Suspense fallback={<ManageTradesSkeleton />}>
      <TradesDataFetcher user={user} strategySlug={strategySlug} />
    </Suspense>
  );
}
