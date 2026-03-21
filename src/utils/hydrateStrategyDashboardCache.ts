import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

type StrategyDashboardHydrationProps = {
  initialUserId: string;
  initialFilteredTrades: unknown[];
  initialAllTrades: unknown[];
  initialNonExecutedTrades: unknown[];
  initialDateRange: { startDate: string; endDate: string };
  initialSelectedYear: number;
  initialMode: 'live' | 'backtesting' | 'demo';
  initialActiveAccount: { id: string; [key: string]: unknown } | null;
  initialDashboardStats?: unknown | null;
};

type HydrateStrategyDashboardCacheParams = {
  queryClient: QueryClient;
  props?: Partial<StrategyDashboardHydrationProps>;
  strategyId: string | null;
};

export function hydrateStrategyDashboardCache({
  queryClient,
  props,
  strategyId,
}: HydrateStrategyDashboardCacheParams): void {
  const uid = props?.initialUserId;
  const acc = props?.initialActiveAccount;
  const dr = props?.initialDateRange;
  const yr = props?.initialSelectedYear;

  if (!uid || !acc?.id || !dr) return;

  const mode = props?.initialMode ?? 'live';
  const year = yr ?? new Date().getFullYear();
  const initialViewMode: 'yearly' | 'dateRange' = 'dateRange';
  const effectiveStartDate = dr.startDate;
  const effectiveEndDate = dr.endDate;

  const queryKeyAllTrades = queryKeys.trades.all(mode, acc.id, uid, year, strategyId);
  const queryKeyFilteredTrades = queryKeys.trades.filtered(
    mode,
    acc.id,
    uid,
    initialViewMode,
    effectiveStartDate,
    effectiveEndDate,
    strategyId,
  );

  const wasInvalidated =
    typeof window !== 'undefined' && sessionStorage.getItem('trade-data-invalidated');
  const shouldSkipHydration =
    !!wasInvalidated &&
    Date.now() - parseInt(wasInvalidated, 10) < 30000;

  if (
    props?.initialFilteredTrades != null &&
    queryClient.getQueryData(queryKeyAllTrades) === undefined &&
    !shouldSkipHydration
  ) {
    queryClient.setQueryData(queryKeyFilteredTrades, props.initialFilteredTrades);
    queryClient.setQueryData(queryKeyAllTrades, props.initialAllTrades ?? []);
    queryClient.setQueryData(
      queryKeys.trades.nonExecuted(
        mode,
        acc.id,
        uid,
        initialViewMode,
        effectiveStartDate,
        effectiveEndDate,
        strategyId,
      ),
      props.initialNonExecutedTrades ?? []
    );
  }

  const dashboardStatsKey = queryKeys.dashboardStats(
    mode,
    acc.id,
    uid,
    strategyId,
    year,
    initialViewMode,
    effectiveStartDate,
    effectiveEndDate,
    'executed',
    'all',
  );

  if (
    props?.initialDashboardStats != null &&
    queryClient.getQueryData(dashboardStatsKey) === undefined
  ) {
    queryClient.setQueryData(dashboardStatsKey, props.initialDashboardStats);
  }

  if (shouldSkipHydration && typeof window !== 'undefined') {
    sessionStorage.removeItem('trade-data-invalidated');
  }
}
