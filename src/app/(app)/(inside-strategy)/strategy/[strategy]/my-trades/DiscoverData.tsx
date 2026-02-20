import { Suspense } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { getFilteredTrades } from '@/lib/server/trades';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import DiscoverClient from './DiscoverClient';
import { Trade } from '@/types/trade';
import { DiscoverSkeleton } from './DiscoverSkeleton';
import type { User } from '@supabase/supabase-js';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

async function DiscoverDataFetcher({ user }: { user: User }) {
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
    // Fetch filtered trades for the current month (include non-executed trades)
    initialFilteredTrades = await getFilteredTrades({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      startDate: initialDateRange.startDate,
      endDate: initialDateRange.endDate,
      includeNonExecuted: true, // Include non-executed trades so they can be filtered client-side
    });

    // Fetch all trades for the current year to get markets list (include non-executed trades)
    const currentYear = today.getFullYear();
    initialAllTrades = await getFilteredTrades({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      includeNonExecuted: true, // Include non-executed trades for markets list
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

interface DiscoverDataProps {
  user: User;
}

export default function DiscoverData({ user }: DiscoverDataProps) {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverDataFetcher user={user} />
    </Suspense>
  );
}
