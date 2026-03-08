import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getFilteredTrades } from '@/lib/server/trades';
import { getCachedAccountsForMode } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';
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
      <MyTradesClient
        initialUserId={user.id}
        initialFilteredTrades={[]}
        initialDateRange={initialDateRange}
        initialMode="live"
        initialActiveAccount={null}
        initialStrategyId={initialStrategyId}
      />
    );
  }

  // Single getFilteredTrades call: prefetch for client cache so client useQuery uses hydrated data (no duplicate fetch)
  const queryClient = new QueryClient();
  // Use the same key shape that StrategiesClient seeds — guarantees a cache hit when navigating from Strategies
  const key = queryKeys.trades.filtered('live', activeAccount.id, user.id, 'dateRange', '2000-01-01', initialDateRange.endDate, initialStrategyId);
  await queryClient.prefetchQuery({
    queryKey: key,
    queryFn: async () => {
      const { startDate, endDate } = createAllTimeRange(today);
      return getFilteredTrades({
        userId: user.id,
        accountId: activeAccount.id,
        mode: 'live',
        startDate,
        endDate,
        includeNonExecuted: true,
        strategyId: initialStrategyId,
      });
    },
    staleTime: TRADES_DATA.staleTime,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyTradesClient
        initialUserId={user.id}
        initialDateRange={initialDateRange}
        initialMode="live"
        initialActiveAccount={activeAccount}
        initialStrategyId={initialStrategyId}
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
