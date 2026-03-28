'use client';

// src/hooks/useAiVisionData.ts
import { useQuery } from '@tanstack/react-query';
import { subDays, format, startOfDay } from 'date-fns';
import { getFilteredTrades } from '@/lib/server/trades';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import type { Trade } from '@/types/trade';

export const AI_VISION_DEFAULT_PERIODS = [
  { key: '7d',  label: 'Last 7 days',  days: 7  },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
] as const;

export type PeriodKey = typeof AI_VISION_DEFAULT_PERIODS[number]['key'];

interface UseAiVisionDataParams {
  userId: string | undefined;
  accountId: string | undefined;
  mode: string;
  strategyId: string | null | undefined;
  /** Market filter from TradeFiltersBar ('all' = no filter) */
  market: string;
  /** Execution filter from TradeFiltersBar */
  execution: 'all' | 'executed' | 'nonExecuted';
}

interface PeriodData {
  trades: Trade[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

export interface AiVisionData {
  periods: Record<PeriodKey, PeriodData>;
  allTrades: Trade[];
  allTradesLoading: boolean;
  allTradesFetching: boolean;
  allTradesError: boolean;
  /** True if any of the 4 queries is loading for the first time */
  isInitialLoading: boolean;
  /** True if any of the 4 queries is re-fetching (filter change) — use for overlay */
  isRefetching: boolean;
}

function buildPeriodDates(days: number) {
  const today = startOfDay(new Date());
  const endDate = format(today, 'yyyy-MM-dd');
  const startDate = format(subDays(today, days), 'yyyy-MM-dd');
  return { startDate, endDate };
}

function filterByMarketAndExecution(
  trades: Trade[],
  market: string,
  execution: 'all' | 'executed' | 'nonExecuted',
): Trade[] {
  let result = trades;
  if (market !== 'all') {
    result = result.filter((t) => t.market === market);
  }
  if (execution === 'executed') {
    result = result.filter((t) => t.executed !== false);
  } else if (execution === 'nonExecuted') {
    result = result.filter((t) => t.executed === false);
  }
  return result;
}

/**
 * Runs 4 parallel queries for the AI Vision page:
 *   - 3 period queries (7d / 30d / 90d) via `queryKeys.aiVision`
 *   - 1 all-time query via `queryKeys.trades.filtered` (reuses dashboard cache)
 *
 * Market and execution filters are applied client-side after fetching,
 * matching the existing dashboard pattern.
 *
 * Known limitation: getFilteredTrades caps at 2000 trades per query.
 * For backtesting strategies with >2000 trades in a 90d window, period
 * data may be incomplete. Acceptable for live/demo trading.
 */
export function useAiVisionData({
  userId,
  accountId,
  mode,
  strategyId,
  market,
  execution,
}: UseAiVisionDataParams): AiVisionData {
  const enabled = Boolean(userId && accountId && mode);

  // ── Period queries ──────────────────────────────────────────────────────
  function usePeriodQuery(periodKey: PeriodKey, days: number): PeriodData {
    const { startDate, endDate } = buildPeriodDates(days);

    const { data: rawTrades = [], isLoading, isFetching, isError, refetch } = useQuery<Trade[]>({
      queryKey: queryKeys.aiVision(
        periodKey, mode, accountId, userId, strategyId,
        startDate, endDate, market, execution,
      ),
      queryFn: async () => {
        if (!userId || !accountId) return [];
        return getFilteredTrades({
          userId,
          accountId,
          mode,
          startDate,
          endDate,
          strategyId,
        });
      },
      enabled,
      ...TRADES_DATA,
    });

    const trades = filterByMarketAndExecution(rawTrades, market, execution);
    return { trades, isLoading, isFetching, isError, refetch };
  }

  const period7d  = usePeriodQuery('7d',  7);
  const period30d = usePeriodQuery('30d', 30);
  const period90d = usePeriodQuery('90d', 90);

  // ── All-time query (for trend lines) ──────────────────────────────────
  // Uses queryKeys.trades.filtered with createAllTimeRange() — same key as
  // useDashboardData so it reuses the TanStack cache when available.
  const { startDate: allStart, endDate: allEnd } = createAllTimeRange();
  const {
    data: rawAllTrades = [],
    isLoading: allTradesLoading,
    isFetching: allTradesFetching,
    isError: allTradesError,
  } = useQuery<Trade[]>({
    queryKey: queryKeys.trades.filtered(
      mode, accountId, userId, 'dateRange',
      allStart, allEnd, strategyId ?? null,
    ),
    queryFn: async () => {
      if (!userId || !accountId) return [];
      return getFilteredTrades({
        userId,
        accountId,
        mode,
        startDate: allStart,
        endDate: allEnd,
        strategyId,
      });
    },
    enabled,
    ...TRADES_DATA,
  });

  // Apply market + execution filter to allTrades for trend line charts
  const allTrades = filterByMarketAndExecution(rawAllTrades, market, execution);

  const isInitialLoading =
    period7d.isLoading || period30d.isLoading || period90d.isLoading || allTradesLoading;

  // isFetching && !isLoading = refetch on filter change (not initial load)
  const isRefetching =
    (!period7d.isLoading  && period7d.isFetching)  ||
    (!period30d.isLoading && period30d.isFetching) ||
    (!period90d.isLoading && period90d.isFetching);

  return {
    periods: {
      '7d':  period7d,
      '30d': period30d,
      '90d': period90d,
    },
    allTrades,
    allTradesLoading,
    allTradesFetching,
    allTradesError,
    isInitialLoading,
    isRefetching,
  };
}
