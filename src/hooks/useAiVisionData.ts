'use client';

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
  /**
   * When false, no network request is made and all slices return empty.
   * Used to skip fetches for PRO-gated views when the user is on a lower tier.
   */
  enabled?: boolean;
}

interface PeriodData {
  trades: Trade[];
}

export interface AiVisionData {
  periods: Record<PeriodKey, PeriodData>;
  allTrades: Trade[];
  isInitialLoading: boolean;
  isRefetching: boolean;
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

const EMPTY_TRADES: Trade[] = [];

export function useAiVisionData({
  userId,
  accountId,
  mode,
  strategyId,
  market,
  execution,
  enabled: enabledParam = true,
}: UseAiVisionDataParams): AiVisionData {
  const enabled = Boolean(userId && accountId && mode) && enabledParam;

  // Single all-time fetch — every period slice is derived from this client-side.
  // Previously this hook fired 6 parallel queries (7d/30d/90d/180d/365d/all);
  // all of them were subsets of `allTrades`, so we just keep the biggest one.
  const { startDate: allStart, endDate: allEnd } = createAllTimeRange();
  const {
    data: rawAllTrades = EMPTY_TRADES,
    isLoading: allTradesLoading,
    isFetching: allTradesFetching,
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

  // Memoize client-side filtering — stable references survive filter toggles.
  const allTrades = useMemo(
    () => filterByMarketAndExecution(rawAllTrades, market, execution),
    [rawAllTrades, market, execution],
  );

  // Slice the filtered trade set into each period window. `today` is stable for
  // the lifetime of the hook mount — no midnight-rollover thundering herd.
  const periods = useMemo<Record<PeriodKey, PeriodData>>(() => {
    const today = startOfDay(new Date());
    const endStr = format(today, 'yyyy-MM-dd');
    const sliceFor = (days: number): Trade[] => {
      const startStr = format(subDays(today, days), 'yyyy-MM-dd');
      return allTrades.filter(
        (t) => t.trade_date >= startStr && t.trade_date <= endStr,
      );
    };

    return {
      '7d':   { trades: sliceFor(7)   },
      '30d':  { trades: sliceFor(30)  },
      '90d':  { trades: sliceFor(90)  },
      '180d': { trades: sliceFor(180) },
      '365d': { trades: sliceFor(365) },
    };
  }, [allTrades]);

  // Only one underlying query now, so loading/refetching collapse to its state.
  const isInitialLoading = allTradesLoading;
  const isRefetching = !allTradesLoading && allTradesFetching;

  return {
    periods,
    allTrades,
    isInitialLoading,
    isRefetching,
  };
}
