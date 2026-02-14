import { Suspense } from 'react';
import { format, subDays } from 'date-fns';
import { getFilteredTrades } from '@/lib/server/trades';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import AnalyticsClient from './AnalyticsClient';
import { Trade } from '@/types/trade';
import type { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

function createInitialDateRange(today = new Date()) {
  return {
    startDate: fmt(subDays(today, 29)),
    endDate: fmt(today),
  };
}

async function AnalyticsDataFetcher({ user }: { user: User }) {
  const today = new Date();
  const initialDateRange = createInitialDateRange(today);
  const initialSelectedYear = today.getFullYear();
  const yearStart = `${initialSelectedYear}-01-01`;
  const yearEnd = `${initialSelectedYear}-12-31`;

  const activeAccount = await getActiveAccountForMode(user.id, 'live');

  if (!activeAccount) {
    return (
      <AnalyticsClient
        initialUserId={user.id}
        initialFilteredTrades={[]}
        initialAllTrades={[]}
        initialNonExecutedTrades={[]}
        initialNonExecutedTotalTradesCount={0}
        initialDateRange={initialDateRange}
        initialSelectedYear={initialSelectedYear}
        initialMode="live"
        initialActiveAccount={null}
      />
    );
  }

  let initialFilteredTrades: Trade[] = [];
  let initialAllTrades: Trade[] = [];
  let initialNonExecutedTrades: Trade[] = [];
  let initialNonExecutedTotalTradesCount = 0;

  try {
    const [filtered, allForYear, nonExecutedRange, nonExecutedYear] =
      await Promise.all([
        getFilteredTrades({
          userId: user.id,
          accountId: activeAccount.id,
          mode: 'live',
          startDate: initialDateRange.startDate,
          endDate: initialDateRange.endDate,
        }),
        getFilteredTrades({
          userId: user.id,
          accountId: activeAccount.id,
          mode: 'live',
          startDate: yearStart,
          endDate: yearEnd,
        }),
        getFilteredTrades({
          userId: user.id,
          accountId: activeAccount.id,
          mode: 'live',
          startDate: initialDateRange.startDate,
          endDate: initialDateRange.endDate,
          onlyNonExecuted: true,
        }),
        getFilteredTrades({
          userId: user.id,
          accountId: activeAccount.id,
          mode: 'live',
          startDate: yearStart,
          endDate: yearEnd,
          onlyNonExecuted: true,
        }),
      ]);

    initialFilteredTrades = filtered;
    initialAllTrades = allForYear;
    initialNonExecutedTrades = nonExecutedRange;
    initialNonExecutedTotalTradesCount = nonExecutedYear.length;
  } catch (error) {
    console.error('Error fetching initial analytics data:', error);
  }

  return (
    <AnalyticsClient
      initialUserId={user.id}
      initialFilteredTrades={initialFilteredTrades}
      initialAllTrades={initialAllTrades}
      initialNonExecutedTrades={initialNonExecutedTrades}
      initialNonExecutedTotalTradesCount={initialNonExecutedTotalTradesCount}
      initialDateRange={initialDateRange}
      initialSelectedYear={initialSelectedYear}
      initialMode="live"
      initialActiveAccount={activeAccount}
    />
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[320px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

interface AnalyticsDataProps {
  user: User;
}

export default function AnalyticsData({ user }: AnalyticsDataProps) {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsDataFetcher user={user} />
    </Suspense>
  );
}
