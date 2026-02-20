import { Suspense } from 'react';
import { format, subDays } from 'date-fns';
import { getFilteredTrades } from '@/lib/server/trades';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import StrategyClient from './StrategyClient';
import { Trade } from '@/types/trade';
import type { User } from '@supabase/supabase-js';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BouncePulse } from '@/components/ui/bounce-pulse';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

function createInitialDateRange(today = new Date()) {
  return {
    startDate: fmt(subDays(today, 29)),
    endDate: fmt(today),
  };
}

async function StrategyDataFetcher({ user, strategySlug }: { user: User; strategySlug: string }) {
  const today = new Date();
  const initialDateRange = createInitialDateRange(today);
  const initialSelectedYear = today.getFullYear();
  const yearStart = `${initialSelectedYear}-01-01`;
  const yearEnd = `${initialSelectedYear}-12-31`;

  // Get strategy ID if strategySlug is provided
  let strategyId: string | null = null;
  if (strategySlug) {
    const strategy = await getStrategyBySlug(user.id, strategySlug);
    if (!strategy) {
      // Strategy not found - return empty state
      return (
        <StrategyClient
          initialUserId={user.id}
          initialFilteredTrades={[]}
          initialAllTrades={[]}
          initialNonExecutedTrades={[]}
          initialNonExecutedTotalTradesCount={0}
          initialDateRange={initialDateRange}
          initialSelectedYear={initialSelectedYear}
          initialMode="live"
          initialActiveAccount={null}
          initialStrategyId={null}
        />
      );
    }
    strategyId = strategy.id;
  }

  const activeAccount = await getActiveAccountForMode(user.id, 'live');

  if (!activeAccount) {
    return (
      <StrategyClient
        initialUserId={user.id}
        initialFilteredTrades={[]}
        initialAllTrades={[]}
        initialNonExecutedTrades={[]}
        initialNonExecutedTotalTradesCount={0}
        initialDateRange={initialDateRange}
        initialSelectedYear={initialSelectedYear}
        initialMode="live"
        initialActiveAccount={null}
        initialStrategyId={strategyId}
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
          strategyId,
        }),
        getFilteredTrades({
          userId: user.id,
          accountId: activeAccount.id,
          mode: 'live',
          startDate: yearStart,
          endDate: yearEnd,
          strategyId,
        }),
        getFilteredTrades({
          userId: user.id,
          accountId: activeAccount.id,
          mode: 'live',
          startDate: initialDateRange.startDate,
          endDate: initialDateRange.endDate,
          onlyNonExecuted: true,
          strategyId,
        }),
        getFilteredTrades({
          userId: user.id,
          accountId: activeAccount.id,
          mode: 'live',
          startDate: yearStart,
          endDate: yearEnd,
          onlyNonExecuted: true,
          strategyId,
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
    <StrategyClient
      initialUserId={user.id}
      initialFilteredTrades={initialFilteredTrades}
      initialAllTrades={initialAllTrades}
      initialNonExecutedTrades={initialNonExecutedTrades}
      initialNonExecutedTotalTradesCount={initialNonExecutedTotalTradesCount}
      initialDateRange={initialDateRange}
      initialSelectedYear={initialSelectedYear}
      initialMode="live"
      initialActiveAccount={activeAccount}
      initialStrategyId={strategyId}
    />
  );
}

function StrategySkeleton() {
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
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
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
            <div className="w-full h-full flex items-center justify-center">
              <BouncePulse size="md" />
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Month stats row: Best Month + Worst Month */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <Card className="flex-1 relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
        <Card className="flex-1 relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
      </div>

      {/* Stat cards grid: row 1 (Profit Factor, Consistency Score, Average Monthly Trades) + row 2 (Average Monthly Profit, Sharpe Ratio, Non-Executed Trades) */}
      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 pb-8 w-full">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
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

interface StrategyDataProps {
  user: User;
  strategySlug: string;
}

export default function StrategyData({ user, strategySlug }: StrategyDataProps) {
  return (
    <Suspense fallback={<StrategySkeleton />}>
      <StrategyDataFetcher user={user} strategySlug={strategySlug} />
    </Suspense>
  );
}
