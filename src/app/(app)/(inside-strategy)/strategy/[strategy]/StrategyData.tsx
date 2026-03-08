import { Suspense } from 'react';
import { getDashboardStats, type DashboardStatsResult } from '@/lib/server/dashboardStats';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import { getActiveAccountForMode } from '@/lib/server/accounts';
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

  const activeAccount = await getActiveAccountForMode(user.id, 'live');

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

  let initialDashboardStats: DashboardStatsResult | null = null;

  try {
    // Single server call replaces 4× getFilteredTrades — returns only computed stats (~5KB vs ~50MB)
    initialDashboardStats = await getDashboardStats({
      userId: user.id,
      accountId: activeAccount.id,
      mode: 'live',
      strategyId,
      selectedYear: initialSelectedYear,
      viewMode: 'dateRange',
      dateRange: initialDateRange,
      accountBalance: activeAccount.account_balance ?? 0,
      selectedMarket: 'all',
      selectedExecution: 'executed',
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
