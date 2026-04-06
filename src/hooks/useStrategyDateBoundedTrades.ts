'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Trade, TradingMode } from '@/types/trade';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA } from '@/constants/queryConfig';
import { getFilteredTrades } from '@/lib/server/trades';

type UseStrategyDateBoundedTradesParams = {
  userId?: string;
  activeAccountId?: string;
  mode: TradingMode;
  strategyId: string;
  isPro: boolean;
  initialTrades: Trade[];
  isInitialContext: boolean;
  startDate: string;
  endDate: string;
};

/**
 * Like useStrategyAllTimeTrades but scoped to a date range.
 * When startDate/endDate change the query key changes and TanStack Query
 * automatically fetches the new range.
 */
export function useStrategyDateBoundedTrades({
  userId,
  activeAccountId,
  mode,
  strategyId,
  isPro,
  initialTrades,
  isInitialContext,
  startDate,
  endDate,
}: UseStrategyDateBoundedTradesParams) {
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
      startDate,
      endDate,
      strategyId,
    ),
    queryFn: async () => {
      if (!isPro) return [];
      if (!userId || !activeAccountId) return [];
      return getFilteredTrades({
        userId,
        accountId: activeAccountId,
        mode,
        startDate,
        endDate,
        includeNonExecuted: true,
        strategyId,
      });
    },
    initialData: isPro && isInitialContext && initialTrades.length > 0 ? initialTrades : undefined,
    enabled: isPro && !!userId && !!activeAccountId,
    ...TRADES_DATA,
  });

  const tradesData = useMemo(
    () => (isPro ? (rawTrades ?? (isInitialContext && initialTrades.length > 0 ? initialTrades : [])) : []),
    [isPro, rawTrades, isInitialContext, initialTrades]
  );

  return {
    tradesData,
    tradesLoading,
    tradesError,
    refetchTrades,
  };
}
