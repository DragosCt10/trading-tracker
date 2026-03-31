'use client';

// src/hooks/useAiVisionData.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, format, startOfDay } from 'date-fns';
import { getFilteredTrades } from '@/lib/server/trades';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import type { Trade } from '@/types/trade';

export const AI_VISION_ALL_PERIODS = [
  { key: '7d',   label: 'Last 7 days',   days: 7   },
  { key: '30d',  label: 'Last 30 days',  days: 30  },
  { key: '90d',  label: 'Last 90 days',  days: 90  },
  { key: '180d', label: 'Last 6 months', days: 180 },
  { key: '365d', label: 'Last 1 year',   days: 365 },
] as const;

/** Kept for backward compat — references the short-term preset keys */
export const AI_VISION_DEFAULT_PERIODS = AI_VISION_ALL_PERIODS.filter(
  (p) => p.key === '7d' || p.key === '30d' || p.key === '90d',
);

export type PeriodKey = typeof AI_VISION_ALL_PERIODS[number]['key'];

export type PeriodPreset = 'short' | 'long';

export const PERIOD_PRESETS: Record<PeriodPreset, { keys: [PeriodKey, PeriodKey, PeriodKey]; label: string }> = {
  short: { keys: ['7d',  '30d',  '90d'],  label: 'Short term' },
  long:  { keys: ['90d', '180d', '365d'], label: 'Long term'  },
};

interface UseAiVisionDataParams {
  userId: string | undefined;
  accountId: string | undefined;
  mode: 'live' | 'backtesting' | 'demo';
  strategyId: string | null | undefined;
  market: string;
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
  isInitialLoading: boolean;
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

export function useAiVisionData({
  userId,
  accountId,
  mode,
  strategyId,
  market,
  execution,
}: UseAiVisionDataParams): AiVisionData {
  const enabled = Boolean(userId && accountId && mode);

  function usePeriodQuery(periodKey: PeriodKey, days: number) {
    const { startDate, endDate } = buildPeriodDates(days);

    const { data: rawTrades = [], isLoading, isFetching, isError, refetch } = useQuery<Trade[]>({
      queryKey: queryKeys.aiVision(
        periodKey, mode, accountId, userId, strategyId,
        startDate, endDate,
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

    return { rawTrades, isLoading, isFetching, isError, refetch };
  }

  // Always fetch all 5 windows — unused ones are cached and reused when switching presets
  const q7d   = usePeriodQuery('7d',   7);
  const q30d  = usePeriodQuery('30d',  30);
  const q90d  = usePeriodQuery('90d',  90);
  const q180d = usePeriodQuery('180d', 180);
  const q365d = usePeriodQuery('365d', 365);

  // All-time query for trend lines
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

  // Memoize client-side filtering — stable references survive filter toggles
  const trades7d   = useMemo(() => filterByMarketAndExecution(q7d.rawTrades,   market, execution), [q7d.rawTrades,   market, execution]);
  const trades30d  = useMemo(() => filterByMarketAndExecution(q30d.rawTrades,  market, execution), [q30d.rawTrades,  market, execution]);
  const trades90d  = useMemo(() => filterByMarketAndExecution(q90d.rawTrades,  market, execution), [q90d.rawTrades,  market, execution]);
  const trades180d = useMemo(() => filterByMarketAndExecution(q180d.rawTrades, market, execution), [q180d.rawTrades, market, execution]);
  const trades365d = useMemo(() => filterByMarketAndExecution(q365d.rawTrades, market, execution), [q365d.rawTrades, market, execution]);
  const allTrades  = useMemo(() => filterByMarketAndExecution(rawAllTrades,    market, execution), [rawAllTrades,    market, execution]);

  const isInitialLoading =
    q7d.isLoading || q30d.isLoading || q90d.isLoading ||
    q180d.isLoading || q365d.isLoading || allTradesLoading;

  const isRefetching =
    (!q7d.isLoading   && q7d.isFetching)   ||
    (!q30d.isLoading  && q30d.isFetching)  ||
    (!q90d.isLoading  && q90d.isFetching)  ||
    (!q180d.isLoading && q180d.isFetching) ||
    (!q365d.isLoading && q365d.isFetching);

  return {
    periods: {
      '7d':   { trades: trades7d,   isLoading: q7d.isLoading,   isFetching: q7d.isFetching,   isError: q7d.isError,   refetch: q7d.refetch },
      '30d':  { trades: trades30d,  isLoading: q30d.isLoading,  isFetching: q30d.isFetching,  isError: q30d.isError,  refetch: q30d.refetch },
      '90d':  { trades: trades90d,  isLoading: q90d.isLoading,  isFetching: q90d.isFetching,  isError: q90d.isError,  refetch: q90d.refetch },
      '180d': { trades: trades180d, isLoading: q180d.isLoading, isFetching: q180d.isFetching, isError: q180d.isError, refetch: q180d.refetch },
      '365d': { trades: trades365d, isLoading: q365d.isLoading, isFetching: q365d.isFetching, isError: q365d.isError, refetch: q365d.refetch },
    },
    allTrades,
    allTradesLoading,
    allTradesFetching,
    allTradesError,
    isInitialLoading,
    isRefetching,
  };
}
