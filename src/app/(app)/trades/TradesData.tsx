import { Suspense } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { getUserSession, getFilteredTrades } from '@/lib/server/trades';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import TradesClient from './TradesClient';
import { Trade } from '@/types/trade';
import { TradesSkeleton } from './TradesSkeleton';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

async function TradesDataFetcher() {
  const { user } = await getUserSession();

  if (!user) {
    return null;
  }

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

export default function TradesData() {
  return (
    <Suspense fallback={<TradesSkeleton />}>
      <TradesDataFetcher />
    </Suspense>
  );
}
