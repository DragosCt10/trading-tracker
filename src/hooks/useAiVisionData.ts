'use client';

// src/hooks/useAiVisionData.ts
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
  mode: string;
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

  // Always fetch all 5 windows — unused ones are cached and reused when switching presets
  const period7d   = usePeriodQuery('7d',   7);
  const period30d  = usePeriodQuery('30d',  30);
  const period90d  = usePeriodQuery('90d',  90);
  const period180d = usePeriodQuery('180d', 180);
  const period365d = usePeriodQuery('365d', 365);

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

  const allTrades = filterByMarketAndExecution(rawAllTrades, market, execution);

  const isInitialLoading =
    period7d.isLoading || period30d.isLoading || period90d.isLoading ||
    period180d.isLoading || period365d.isLoading || allTradesLoading;

  const isRefetching =
    (!period7d.isLoading   && period7d.isFetching)   ||
    (!period30d.isLoading  && period30d.isFetching)  ||
    (!period90d.isLoading  && period90d.isFetching)  ||
    (!period180d.isLoading && period180d.isFetching) ||
    (!period365d.isLoading && period365d.isFetching);

  return {
    periods: {
      '7d':   period7d,
      '30d':  period30d,
      '90d':  period90d,
      '180d': period180d,
      '365d': period365d,
    },
    allTrades,
    allTradesLoading,
    allTradesFetching,
    allTradesError,
    isInitialLoading,
    isRefetching,
  };
}
