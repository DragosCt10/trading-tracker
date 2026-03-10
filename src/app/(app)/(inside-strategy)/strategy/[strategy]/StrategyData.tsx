import { Suspense } from 'react';
import { getDashboardApiResponse } from '@/lib/server/dashboardApiResponse';
import { resolveActiveAccountFromCookies } from '@/lib/server/accounts';
import { format, startOfYear, endOfYear } from 'date-fns';
import { getStrategyBySlug } from '@/lib/server/strategies';
import StrategyClient from './StrategyClient';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { User } from '@supabase/supabase-js';
import { StrategySkeleton } from '@/components/skeletons/StrategySkeleton';

/** Resolves to null after `ms` milliseconds — used to cap the stats prefetch. */
function timeout(ms: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

async function StrategyDataFetcher({ user, strategySlug }: { user: User; strategySlug: string }) {
  const today = new Date();
  const initialSelectedYear = today.getFullYear();
  // Current year matches StrategyClient's default view after resetFilterOnModeSwitch fires on mount.
  const initialDateRange = {
    startDate: format(startOfYear(today), 'yyyy-MM-dd'),
    endDate: format(endOfYear(today), 'yyyy-MM-dd'),
  };

  // Fetch strategy metadata and resolve active account/mode from cookies in parallel.
  const [strategy, { mode, activeAccount }] = await Promise.all([
    strategySlug ? getStrategyBySlug(user.id, strategySlug) : Promise.resolve(null),
    resolveActiveAccountFromCookies(user.id),
  ]);

  const strategyId = strategy?.id ?? null;
  const initialExtraCards = (strategy?.extra_cards ?? []) as ExtraCardKey[];

  if (strategySlug && !strategy) {
    return (
      <StrategyClient
        initialUserId={user.id}
        initialDateRange={initialDateRange}
        initialSelectedYear={initialSelectedYear}
        initialMode={mode}
        initialActiveAccount={null}
        initialStrategyId={null}
        initialExtraCards={[]}
      />
    );
  }

  if (!activeAccount) {
    return (
      <StrategyClient
        initialUserId={user.id}
        initialDateRange={initialDateRange}
        initialSelectedYear={initialSelectedYear}
        initialMode={mode}
        initialActiveAccount={null}
        initialStrategyId={strategyId}
        initialExtraCards={initialExtraCards}
      />
    );
  }

  // Race the stats prefetch against a 1 s timeout.
  // If the RPC is fast (< 1 s) the client gets a hydrated cache and renders instantly.
  // If it's slow (> 1 s) we ship the page immediately and the client fetches client-side
  // (~500 ms) — far better than blocking the Suspense boundary for 3–7 s.
  let initialDashboardStats: Awaited<ReturnType<typeof getDashboardApiResponse>> | null = null;
  try {
    initialDashboardStats = await Promise.race([
      getDashboardApiResponse({
        userId: user.id,
        accountId: activeAccount.id,
        mode,
        startDate: initialDateRange.startDate,
        endDate: initialDateRange.endDate,
        strategyId,
        accountBalance: activeAccount.account_balance ?? 0,
        execution: 'executed',
        market: 'all',
      }),
      timeout(1000),
    ]);
  } catch (error) {
    console.error('Error fetching initial dashboard stats:', error);
  }

  return (
    <StrategyClient
      initialUserId={user.id}
      initialDashboardStats={initialDashboardStats}
      initialDateRange={initialDateRange}
      initialSelectedYear={initialSelectedYear}
      initialMode={mode}
      initialActiveAccount={activeAccount}
      initialStrategyId={strategyId}
      initialExtraCards={initialExtraCards}
    />
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
