import { Suspense } from 'react';
import { getFilteredTrades } from '@/lib/server/trades';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import { getActiveAccountForMode } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import StrategyClient from './StrategyClient';
import { Trade } from '@/types/trade';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { User } from '@supabase/supabase-js';
import { StrategySkeleton } from '@/components/skeletons/StrategySkeleton';

async function StrategyDataFetcher({ user, strategySlug }: { user: User; strategySlug: string }) {
  const today = new Date();
  const initialDateRange = createAllTimeRange(today);
  const initialSelectedYear = today.getFullYear();
  const yearStart = `${initialSelectedYear}-01-01`;
  const yearEnd = `${initialSelectedYear}-12-31`;

  // Get strategy ID and extra_cards if strategySlug is provided
  let strategyId: string | null = null;
  let initialExtraCards: ExtraCardKey[] = [];
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
        initialFilteredTrades={[]}
        initialAllTrades={[]}
        initialNonExecutedTrades={[]}
        initialNonExecutedTotalTradesCount={0}
        initialDateRange={initialDateRange}
        initialSelectedYear={initialSelectedYear}
        initialMode="live"
        initialActiveAccount={null}
        initialStrategyId={strategyId}
        initialExtraCards={initialExtraCards}
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
