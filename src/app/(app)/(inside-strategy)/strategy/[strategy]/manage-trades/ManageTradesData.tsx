import { Suspense } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { redirect } from 'next/navigation';
import { getFilteredTrades } from '@/lib/server/trades';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import ManageTradesClient from './ManageTradesClient';
import { Trade } from '@/types/trade';
import { ManageTradesSkeleton } from './ManageTradesSkeleton';
import type { User } from '@supabase/supabase-js';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

async function TradesDataFetcher({
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
  const initialDateRange = {
    startDate: fmt(startOfMonth(today)),
    endDate: fmt(endOfMonth(today)),
  };

  const activeAccount = await getActiveAccountForMode(user.id, 'live');

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

  return (
    <ManageTradesClient
      initialUserId={user.id}
      initialTrades={initialTrades}
      initialDateRange={initialDateRange}
      initialMode="live"
      initialActiveAccount={activeAccount}
      initialStrategyId={initialStrategyId}
    />
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
