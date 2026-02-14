import { Suspense } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { getFilteredTrades } from '@/lib/server/trades';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import TradesClient from './TradesClient';
import { Trade } from '@/types/trade';
import { TradesSkeleton } from './TradesSkeleton';
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
      <TradesClient
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
    <TradesClient
      initialUserId={user.id}
      initialTrades={initialTrades}
      initialDateRange={initialDateRange}
      initialMode="live"
      initialActiveAccount={activeAccount}
    />
  );
}

interface TradesDataProps {
  user: User;
}

export default function TradesData({ user }: TradesDataProps) {
  return (
    <Suspense fallback={<TradesSkeleton />}>
      <TradesDataFetcher user={user} />
    </Suspense>
  );
}
