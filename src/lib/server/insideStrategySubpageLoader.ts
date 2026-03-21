import { QueryClient, dehydrate, type DehydratedState } from '@tanstack/react-query';
import { getFilteredTrades } from '@/lib/server/trades';
import { resolveActiveAccountFromCookies } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import { queryKeys } from '@/lib/queryKeys';
import { getCurrencySymbolFromAccount } from '@/utils/accountOverviewHelpers';
import { raceWithTimeout } from '@/utils/raceWithTimeout';
import type { Trade } from '@/types/trade';
import type { Strategy } from '@/types/strategy';
import type { AccountRow, AccountMode } from '@/lib/server/accounts';

const SUBPAGE_PREFETCH_TIMEOUT_MS = 300;

type LoadInsideStrategySubpageDataParams = {
  userId: string;
  strategySlug: string;
  prefetchTimeoutMs?: number;
};

export type InsideStrategySubpageData = {
  strategy: Strategy | null;
  mode: AccountMode;
  activeAccount: AccountRow | null;
  initialTrades: Trade[];
  currencySymbol: string;
  accountBalance: number | null;
  dehydratedState: DehydratedState;
};

export async function loadInsideStrategySubpageData({
  userId,
  strategySlug,
  prefetchTimeoutMs = SUBPAGE_PREFETCH_TIMEOUT_MS,
}: LoadInsideStrategySubpageDataParams): Promise<InsideStrategySubpageData> {
  const { mode, activeAccount } = await resolveActiveAccountFromCookies(userId);
  const strategy = await getStrategyBySlug(userId, strategySlug, activeAccount?.id);

  let initialTrades: Trade[] = [];
  let currencySymbol = '$';
  let accountBalance: number | null = null;

  if (activeAccount && strategy) {
    const allTime = createAllTimeRange();
    const tradesResult = await raceWithTimeout(
      getFilteredTrades({
        userId,
        accountId: activeAccount.id,
        mode,
        startDate: allTime.startDate,
        endDate: allTime.endDate,
        includeNonExecuted: true,
        strategyId: strategy.id,
      }),
      prefetchTimeoutMs,
      null
    );

    if (tradesResult !== null) {
      initialTrades = tradesResult;
    }

    accountBalance = activeAccount.account_balance ?? null;
    currencySymbol = getCurrencySymbolFromAccount(activeAccount);
  }

  const queryClient = new QueryClient();
  if (activeAccount && strategy && initialTrades.length > 0) {
    const allTime = createAllTimeRange();
    const filteredKey = queryKeys.trades.filtered(
      mode,
      activeAccount.id,
      userId,
      'all',
      allTime.startDate,
      allTime.endDate,
      strategy.id
    );
    queryClient.setQueryData(filteredKey, initialTrades);
  }

  return {
    strategy,
    mode,
    activeAccount,
    initialTrades,
    currencySymbol,
    accountBalance,
    dehydratedState: dehydrate(queryClient),
  };
}
