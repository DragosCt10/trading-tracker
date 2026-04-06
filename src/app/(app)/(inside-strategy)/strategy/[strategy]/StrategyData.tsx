import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getDashboardApiResponse } from '@/lib/server/dashboardApiResponse';
import { resolveActiveAccountFromCookies } from '@/lib/server/accounts';
import { format, startOfYear, endOfYear } from 'date-fns';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { raceWithTimeoutAndAbort } from '@/utils/raceWithTimeout';
import StrategyClient from './StrategyClient';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { User } from '@supabase/supabase-js';
import { StrategySkeleton } from '@/components/skeletons/StrategySkeleton';

async function StrategyDataFetcher({ user, strategySlug }: { user: User; strategySlug: string }) {
  const today = new Date();
  const initialSelectedYear = today.getFullYear();
  // Current year matches StrategyClient's default view after resetFilterOnModeSwitch fires on mount.
  const initialDateRange = {
    startDate: format(startOfYear(today), 'yyyy-MM-dd'),
    endDate: format(endOfYear(today), 'yyyy-MM-dd'),
  };

  // Resolve active account first, then fetch strategy filtered by that account.
  // The accountId filter ensures we only render if the strategy belongs to the
  // active account — otherwise the dashboard stats would query the wrong account.
  const { mode, activeAccount } = await resolveActiveAccountFromCookies(user.id);
  const strategy = strategySlug
    ? await getStrategyBySlug(user.id, strategySlug, activeAccount?.id)
    : null;

  const strategyId = strategy?.id ?? null;
  const initialExtraCards = (strategy?.extra_cards ?? []) as ExtraCardKey[];

  if (strategySlug && !strategy) {
    redirect('/stats');
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
        initialStrategyName={strategy?.name ?? null}
        initialExtraCards={initialExtraCards}
        initialSavedTags={strategy?.saved_tags ?? []}
      />
    );
  }

  // Race the stats prefetch against a 1 s timeout.
  // If the RPC is fast (< 1 s) the client gets a hydrated cache and renders instantly.
  // If it's slow (> 1 s) we ship the page immediately and the client fetches client-side
  // (~500 ms) — far better than blocking the Suspense boundary for 3–7 s.
  let initialDashboardStats: Awaited<ReturnType<typeof getDashboardApiResponse>> | null = null;
  try {
    initialDashboardStats = await raceWithTimeoutAndAbort(
      () =>
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
          includeSeries: false,
          includeCompactTrades: false,
        }),
      1000,
      null,
      'getDashboardApiResponse'
    );
  } catch (error) {
    console.error('Error fetching initial dashboard stats:', (error as any)?.message ?? error);
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
      initialStrategyName={strategy?.name ?? null}
      initialExtraCards={initialExtraCards}
      initialSavedTags={strategy?.saved_tags ?? []}
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
