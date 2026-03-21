import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { HydrationBoundary } from '@tanstack/react-query';
import { loadInsideStrategySubpageData } from '@/lib/server/insideStrategySubpageLoader';
import CustomStatsClient from './CustomStatsClient';
import { CustomStatsSkeleton } from './CustomStatsSkeleton';
import type { User } from '@supabase/supabase-js';

async function CustomStatsDataFetcher({
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

  if (!strategy) redirect('/stats');

  return (
    <HydrationBoundary state={dehydratedState}>
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
