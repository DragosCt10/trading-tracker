'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Trade, TradingMode } from '@/types/trade';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';
import { getFilteredTrades } from '@/lib/server/trades';

type UseStrategyAllTimeTradesParams = {
  userId?: string;
  activeAccountId?: string;
  mode: TradingMode;
  strategyId: string;
  isPro: boolean;
  initialTrades: Trade[];
  isInitialContext: boolean;
};

export function useStrategyAllTimeTrades({
  userId,
  activeAccountId,
  mode,
  strategyId,
  isPro,
  initialTrades,
  isInitialContext,
}: UseStrategyAllTimeTradesParams) {
  const allTime = useMemo(() => createAllTimeRange(), []);

  const {
    data: rawTrades,
    isLoading: tradesLoading,
    isError: tradesError,
    refetch: refetchTrades,
  } = useQuery<Trade[]>({
    queryKey: queryKeys.trades.filtered(
      mode,
      activeAccountId,
      userId,
      'all',
      allTime.startDate,
      allTime.endDate,
      strategyId,
    ),
    queryFn: async () => {
      if (!isPro) return [];
      if (!userId || !activeAccountId) return [];
      return getFilteredTrades({
        userId,
        accountId: activeAccountId,
        mode,
        startDate: allTime.startDate,
        endDate: allTime.endDate,
        includeNonExecuted: true,
        strategyId,
      });
    },
    // Empty arrays from timed-out server fetches should not block client refetch.
    initialData: isPro && isInitialContext && initialTrades.length > 0 ? initialTrades : undefined,
    enabled: isPro && !!userId && !!activeAccountId,
    ...TRADES_DATA,
  });

  const allTradesData = useMemo(
    () => (isPro ? (rawTrades ?? (isInitialContext && initialTrades.length > 0 ? initialTrades : [])) : []),
    [isPro, rawTrades, isInitialContext, initialTrades]
  );

  return {
    allTradesData,
    tradesLoading,
    tradesError,
    refetchTrades,
  };
}
