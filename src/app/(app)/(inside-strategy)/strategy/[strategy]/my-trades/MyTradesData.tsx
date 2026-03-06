import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getFilteredTrades } from '@/lib/server/trades';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import MyTradesClient from './MyTradesClient';
import { Trade } from '@/types/trade';
import { MyTradesSkeleton } from './MyTradesSkeleton';
import type { User } from '@supabase/supabase-js';

async function MyTradesDataFetcher({
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
  const initialStrategyId = strategy.id;

  const today = new Date();
  // Default to "All Trades" range so UI (All Trades selected) and data match on first load
  const initialDateRange = createAllTimeRange(today);

  // If no account, return empty data - client will handle "No Active Account" UI
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

  let initialFilteredTrades: Trade[] = [];

  try {
    initialFilteredTrades = await getFilteredTrades({
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

  return (
    <MyTradesClient
      initialUserId={user.id}
      initialFilteredTrades={initialFilteredTrades}
      initialDateRange={initialDateRange}
      initialMode="live"
      initialActiveAccount={activeAccount}
      initialStrategyId={initialStrategyId}
    />
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
