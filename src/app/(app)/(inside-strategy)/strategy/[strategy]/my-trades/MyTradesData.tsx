import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getFilteredTrades } from '@/lib/server/trades';
import { resolveActiveAccountFromCookies } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import { queryKeys } from '@/lib/queryKeys';
import { raceWithTimeout } from '@/utils/raceWithTimeout';
import MyTradesClient from './MyTradesClient';
import { MyTradesSkeleton } from './MyTradesSkeleton';
import type { User } from '@supabase/supabase-js';

async function MyTradesDataFetcher({
  user,
  strategySlug,
}: {
  user: User;
  strategySlug: string;
}) {
  const { mode, activeAccount } = await resolveActiveAccountFromCookies(user.id);
  const strategy = await getStrategyBySlug(user.id, strategySlug, activeAccount?.id);

  if (!strategy || strategy.user_id !== user.id) redirect('/stats');
  const initialStrategyId = strategy.id;

  const today = new Date();
  const initialDateRange = createAllTimeRange(today);

  if (!activeAccount) {
    return (
      <MyTradesClient
        initialUserId={user.id}
        initialFilteredTrades={[]}
        initialDateRange={initialDateRange}
        initialMode={mode}
        initialActiveAccount={null}
        initialStrategyId={initialStrategyId}
        savedTags={strategy.saved_tags ?? []}
      />
    );
  }

  // Race prefetch against 300ms timeout: ships skeleton HTML fast even when DB is slow.
  // On timeout, cache stays empty → client useQuery fetches trades after mount (existing fallback path).
  const PREFETCH_TIMEOUT_MS = 300;
  const queryClient = new QueryClient();
  const key = queryKeys.trades.filtered(mode, activeAccount.id, user.id, 'dateRange', '2000-01-01', initialDateRange.endDate, initialStrategyId);
  const { startDate, endDate } = createAllTimeRange(today);
  const tradesResult = await raceWithTimeout(
    getFilteredTrades({
      userId: user.id,
      accountId: activeAccount.id,
      mode,
      startDate,
      endDate,
      includeNonExecuted: true,
      strategyId: initialStrategyId,
    }),
    PREFETCH_TIMEOUT_MS,
    null
  );
  if (tradesResult !== null) {
    queryClient.setQueryData(key, tradesResult);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyTradesClient
        initialUserId={user.id}
        initialDateRange={initialDateRange}
        initialMode={mode}
        initialActiveAccount={activeAccount}
        initialStrategyId={initialStrategyId}
        savedTags={strategy.saved_tags ?? []}
      />
    </HydrationBoundary>
  );
}

interface MyTradesDataProps {
  user: User;
  strategySlug: string;
}

export default function MyTradesData({ user, strategySlug }: MyTradesDataProps) {
  return (
    <Suspense fallback={<MyTradesSkeleton />}>
      <MyTradesDataFetcher user={user} strategySlug={strategySlug} />
    </Suspense>
  );
}
