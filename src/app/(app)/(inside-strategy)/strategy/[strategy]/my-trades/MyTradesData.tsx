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
  const strategy = await getStrategyBySlug(user.id, strategySlug);
  if (!strategy) redirect('/strategies');
  const initialStrategyId = strategy.id;

  const today = new Date();
  // Default to "All Trades" range so UI (All Trades selected) and data match on first load
  const initialDateRange = createAllTimeRange(today);

  const activeAccount = await getActiveAccountForMode(user.id, 'live');

  // If no account, return empty data - client will handle "No Active Account" UI
  if (!activeAccount) {
    return (
      <MyTradesClient
        initialUserId={user.id}
        initialFilteredTrades={[]}
        initialAllTrades={[]}
        initialDateRange={initialDateRange}
        initialMode="live"
        initialActiveAccount={null}
        initialStrategyId={initialStrategyId}
      />
    );
  }

  // Fetch initial trades server-side (filtered by strategy)
  let initialFilteredTrades: Trade[] = [];
  let initialAllTrades: Trade[] = [];

  try {
    // Fetch filtered trades for the initial date range (All Trades: 2000-01-01 to today; include non-executed)
    initialFilteredTrades = await getFilteredTrades({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      startDate: initialDateRange.startDate,
      endDate: initialDateRange.endDate,
      includeNonExecuted: true,
      strategyId: initialStrategyId,
    });

    // Fetch all trades for the current year to get markets list (include non-executed trades)
    const currentYear = today.getFullYear();
    initialAllTrades = await getFilteredTrades({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      includeNonExecuted: true,
      strategyId: initialStrategyId,
    });
  } catch (error) {
    console.error('Error fetching initial trades:', error);
    // Return empty arrays on error - client will handle loading states
  }

  return (
    <MyTradesClient
      initialUserId={user.id}
      initialFilteredTrades={initialFilteredTrades}
      initialAllTrades={initialAllTrades}
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
