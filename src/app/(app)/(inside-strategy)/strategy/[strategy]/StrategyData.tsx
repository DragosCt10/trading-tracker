import { Suspense } from 'react';
import { getDashboardApiResponse } from '@/lib/server/dashboardApiResponse';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import { getCachedAccountsForMode } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import StrategyClient from './StrategyClient';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { User } from '@supabase/supabase-js';
import { StrategySkeleton } from '@/components/skeletons/StrategySkeleton';

async function StrategyDataFetcher({ user, strategySlug }: { user: User; strategySlug: string }) {
  const today = new Date();
  const initialDateRange = createAllTimeRange(today);
  const initialSelectedYear = today.getFullYear();

  let strategyId: string | null = null;
  let initialExtraCards: ExtraCardKey[] = [];
  if (strategySlug) {
    const strategy = await getStrategyBySlug(user.id, strategySlug);
    if (!strategy) {
      return (
        <StrategyClient
          initialUserId={user.id}
          initialDateRange={initialDateRange}
          initialSelectedYear={initialSelectedYear}
          initialMode="live"
          initialActiveAccount={null}
          initialStrategyId={null}
          initialExtraCards={[]}
        />
      );
    }
    strategyId = strategy.id;
    initialExtraCards = (strategy.extra_cards ?? []) as ExtraCardKey[];
  }

  const allLiveAccounts = await getCachedAccountsForMode(user.id, 'live');
  const activeAccount = allLiveAccounts.find((a) => a.is_active) ?? allLiveAccounts[0] ?? null;

  if (!activeAccount) {
    return (
      <StrategyClient
        initialUserId={user.id}
        initialDateRange={initialDateRange}
        initialSelectedYear={initialSelectedYear}
        initialMode="live"
        initialActiveAccount={null}
        initialStrategyId={strategyId}
        initialExtraCards={initialExtraCards}
      />
    );
  }

  // 1–2 RPCs via getDashboardApiResponse; client hydrates from this so it doesn't call /api/dashboard-stats on first load (audit 2.1).
  let initialDashboardStats: Awaited<ReturnType<typeof getDashboardApiResponse>> | null = null;

  try {
    initialDashboardStats = await getDashboardApiResponse({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      startDate: initialDateRange.startDate,
      endDate: initialDateRange.endDate,
      strategyId,
      accountBalance: activeAccount.account_balance ?? 0,
      execution: 'executed',
      market: 'all',
    });
  } catch (error) {
    console.error('Error fetching initial dashboard stats:', error);
  }

  return (
    <StrategyClient
      initialUserId={user.id}
      initialDashboardStats={initialDashboardStats}
      initialDateRange={initialDateRange}
      initialSelectedYear={initialSelectedYear}
      initialMode="live"
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
