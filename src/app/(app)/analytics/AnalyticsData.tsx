import { Suspense } from 'react';
import { format, subDays } from 'date-fns';
import { getFilteredTrades } from '@/lib/server/trades';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import AnalyticsClient from './AnalyticsClient';
import { Trade } from '@/types/trade';
import type { User } from '@supabase/supabase-js';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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

const CHART_BAR_HEIGHTS = [45, 65, 50, 70, 55, 60, 48, 72, 58, 63, 52, 68];

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header: Yearly Stats + year dropdown */}
      <div className="flex justify-between items-center my-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="w-28">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Account Overview card (large chart + balance) */}
      <Card className="overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-none">
        <div className="relative p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-8 w-48" />
              </div>
              <Skeleton className="h-4 w-36 ml-[52px]" />
            </div>
            <div className="text-right space-y-3">
              <Skeleton className="h-3 w-44 ml-auto" />
              <Skeleton className="h-9 w-40 ml-auto rounded-lg" />
              <Skeleton className="h-6 w-28 ml-auto rounded-full" />
            </div>
          </div>
          <CardContent className="h-72 relative p-0">
            <div className="w-full h-full flex items-end justify-between gap-3 px-2">
              {CHART_BAR_HEIGHTS.map((pct, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3">
                  <Skeleton
                    className="w-full rounded-t-xl bg-primary/15"
                    style={{
                      height: `${pct}%`,
                      animationDelay: `${i * 0.06}s`,
                    }}
                  />
                  <Skeleton className="h-3 w-9 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Month stats row: Best Month + Worst Month */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <Card className="flex-1 rounded-xl border-slate-200/60 dark:border-slate-700/50">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
        <Card className="flex-1 rounded-xl border-slate-200/60 dark:border-slate-700/50">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
      </div>

      {/* Stat cards grid (Profit Factor, Consistency Score, Average Monthly Trades) */}
      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 pb-8 w-full">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-xl border-slate-200/60 dark:border-slate-700/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
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
