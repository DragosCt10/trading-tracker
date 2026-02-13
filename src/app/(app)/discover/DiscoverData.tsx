import { Suspense } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { getUserSession, getFilteredTrades } from '@/lib/server/trades';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import DiscoverClient from './DiscoverClient';
import { Trade } from '@/types/trade';
import { DiscoverSkeleton } from './DiscoverSkeleton';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

// Async component that fetches data
async function DiscoverDataFetcher() {
  const { user } = await getUserSession();

  if (!user) {
    return null;
  }

  // Get default date range (current month)
  const today = new Date();
  const initialDateRange = {
    startDate: fmt(startOfMonth(today)),
    endDate: fmt(endOfMonth(today)),
  };

  const activeAccount = await getActiveAccountForMode(user.id, 'live');

  // If no account, return empty data - client will handle "No Active Account" UI
  if (!activeAccount) {
    return (
      <DiscoverClient
        initialUserId={user.id}
        initialFilteredTrades={[]}
        initialAllTrades={[]}
        initialDateRange={initialDateRange}
        initialMode="live"
        initialActiveAccount={null}
      />
    );
  }

  // Fetch initial trades server-side
  let initialFilteredTrades: Trade[] = [];
  let initialAllTrades: Trade[] = [];

  try {
    // Fetch filtered trades for the current month
    initialFilteredTrades = await getFilteredTrades({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      startDate: initialDateRange.startDate,
      endDate: initialDateRange.endDate,
    });

    // Fetch all trades for the current year to get markets list
    const currentYear = today.getFullYear();
    initialAllTrades = await getFilteredTrades({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
    });
  } catch (error) {
    console.error('Error fetching initial trades:', error);
    // Return empty arrays on error - client will handle loading states
  }

  return (
    <DiscoverClient
      initialUserId={user.id}
      initialFilteredTrades={initialFilteredTrades}
      initialAllTrades={initialAllTrades}
      initialDateRange={initialDateRange}
      initialMode="live"
      initialActiveAccount={activeAccount}
    />
  );
}

// Main component with Suspense
export default function DiscoverData() {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverDataFetcher />
    </Suspense>
  );
}
