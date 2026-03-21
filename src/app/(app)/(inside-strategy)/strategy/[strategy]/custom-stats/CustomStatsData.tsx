import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { resolveActiveAccountFromCookies } from '@/lib/server/accounts';
import { getFilteredTrades } from '@/lib/server/trades';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import { queryKeys } from '@/lib/queryKeys';
import { getCurrencySymbolFromAccount } from '@/utils/accountOverviewHelpers';
import CustomStatsClient from './CustomStatsClient';
import { CustomStatsSkeleton } from './CustomStatsSkeleton';
import type { User } from '@supabase/supabase-js';
import type { Trade } from '@/types/trade';

async function CustomStatsDataFetcher({
  user,
  strategySlug,
}: {
  user: User;
  strategySlug: string;
}) {
  const { mode, activeAccount } = await resolveActiveAccountFromCookies(user.id);
  const strategy = await getStrategyBySlug(user.id, strategySlug, activeAccount?.id);
  if (!strategy) redirect('/stats');

  let initialTrades: Trade[] = [];
  let currencySymbol = '$';
  let accountBalance: number | null = null;

  const PREFETCH_TIMEOUT_MS = 300;

  if (activeAccount) {
    const allTime = createAllTimeRange();
    const tradesResult = await Promise.race([
      getFilteredTrades({
        userId: user.id,
        accountId: activeAccount.id,
        mode,
        startDate: allTime.startDate,
        endDate: allTime.endDate,
        includeNonExecuted: true,
        strategyId: strategy.id,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), PREFETCH_TIMEOUT_MS)),
    ]);
    if (tradesResult !== null) {
      initialTrades = tradesResult;
    }
    accountBalance = activeAccount.account_balance ?? null;
    currencySymbol = getCurrencySymbolFromAccount(activeAccount);
  }

  const queryClient = new QueryClient();
  if (activeAccount && initialTrades.length > 0) {
    const allTime = createAllTimeRange();
    const filteredKey = queryKeys.trades.filtered(
      mode,
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
      <CustomStatsClient
        strategyId={strategy.id}
        strategyName={strategy.name}
        extraCards={strategy.extra_cards}
        savedCustomStats={strategy.saved_custom_stats ?? []}
        savedSetupTypes={strategy.saved_setup_types ?? []}
        savedLiquidityTypes={strategy.saved_liquidity_types ?? []}
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

interface CustomStatsDataProps {
  user: User;
  strategySlug: string;
}

export default function CustomStatsData({ user, strategySlug }: CustomStatsDataProps) {
  return (
    <Suspense fallback={<CustomStatsSkeleton />}>
      <CustomStatsDataFetcher user={user} strategySlug={strategySlug} />
    </Suspense>
  );
}
