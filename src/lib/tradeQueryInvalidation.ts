import type { QueryClient } from '@tanstack/react-query';
import type { TradingMode } from '@/types/trade';
import { queryKeys } from '@/lib/queryKeys';

interface InvalidateAndRefetchTradeQueriesArgs {
  queryClient: QueryClient;
  strategyIds: Array<string | null | undefined>;
  mode: TradingMode;
  accountId?: string;
  userId?: string;
}

export async function invalidateAndRefetchTradeQueries({
  queryClient,
  strategyIds,
  mode,
  accountId,
  userId,
}: InvalidateAndRefetchTradeQueriesArgs): Promise<void> {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('trade-data-invalidated', Date.now().toString());
  }

  const affectedStrategyIds = new Set<string | null>(
    strategyIds.map((id) => id ?? null)
  );
  const affectedStrategyIdsArray = Array.from(affectedStrategyIds);

  // invalidateQueries (default refetchType:'active') marks queries stale AND immediately
  // refetches any that are currently observed by a mounted component. This is the primary
  // mechanism for live dashboard updates (delete, edit, insert while on strategy page).
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      if (!Array.isArray(key)) return false;
      const firstKey = key[0];
      if (
        firstKey === 'all-strategy-trades' ||
        firstKey === 'all-strategy-stats' ||
        firstKey === 'strategies-overview'
      ) {
        return true;
      }
      if (firstKey === 'allTrades') return affectedStrategyIds.has((key[5] ?? null) as string | null);
      if (firstKey === 'filteredTrades' || firstKey === 'nonExecutedTrades') {
        return affectedStrategyIds.has((key[7] ?? null) as string | null);
      }
      if (firstKey === 'dashboardStats' || firstKey === 'calendarTrades') {
        return affectedStrategyIds.has((key[4] ?? null) as string | null);
      }
      return false;
    },
  });

  if (accountId && userId) {
    await Promise.all([
      queryClient.refetchQueries({
        queryKey: queryKeys.allStrategyTrades(userId, accountId, mode),
      }),
      queryClient.refetchQueries({
        queryKey: ['strategies-overview', userId, accountId, mode],
      }),
    ]);
  }

  // Pre-warm inactive caches (queries with no active observers, e.g. user navigated away).
  // Using type:'inactive' ensures active queries — already refetched by invalidateQueries
  // above — are NOT triggered again. This prevents the double-skeleton flash where the card
  // would show a spinner twice: once from the auto-refetch and once from this explicit call.
  await queryClient.refetchQueries({
    predicate: (query) => {
      const key = query.queryKey;
      if (!Array.isArray(key)) return false;
      const firstKey = key[0];
      if (firstKey === 'dashboardStats' || firstKey === 'calendarTrades') {
        return affectedStrategyIdsArray.includes((key[4] ?? null) as string | null);
      }
      if (firstKey === 'filteredTrades') {
        return affectedStrategyIdsArray.includes((key[7] ?? null) as string | null);
      }
      return false;
    },
    type: 'inactive',
  });
}

