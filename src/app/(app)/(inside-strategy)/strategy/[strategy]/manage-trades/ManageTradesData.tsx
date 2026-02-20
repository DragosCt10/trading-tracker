import { Suspense } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { getFilteredTrades } from '@/lib/server/trades';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import ManageTradesClient from './ManageTradesClient';
import { Trade } from '@/types/trade';
import { ManageTradesSkeleton } from './ManageTradesSkeleton';
import type { User } from '@supabase/supabase-js';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

async function TradesDataFetcher({ user }: { user: User }) {
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
    />
  );
}

interface ManageTradesDataProps {
  user: User;
}

export default function ManageTradesData({ user }: ManageTradesDataProps) {
  return (
    <Suspense fallback={<ManageTradesSkeleton />}>
      <TradesDataFetcher user={user} />
    </Suspense>
  );
}
