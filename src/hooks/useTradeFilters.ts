'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Trade } from '@/types/trade';
import {
  buildPresetRange,
  isCustomDateRange,
  type DateRangeState,
  type FilterType,
} from '@/utils/dateRangeHelpers';

export type ExecutionFilter = 'all' | 'executed' | 'nonExecuted';

type UseTradeFiltersParams = {
  initialDateRange?: DateRangeState;
  initialFilter?: FilterType;
  initialSelectedMarket?: string;
  initialExecution?: ExecutionFilter;
  tradesForMarkets: Trade[];
  tradesForEarliestDate?: Trade[];
};

function deriveInitialFilter(range: DateRangeState): FilterType {
  if (isCustomDateRange(range)) return 'all';
  const yearRange = buildPresetRange('year').dateRange;
  return yearRange.startDate === range.startDate && yearRange.endDate === range.endDate
    ? 'year'
    : 'all';
}

export function useTradeFilters({
  initialDateRange,
  initialFilter,
  initialSelectedMarket = 'all',
  initialExecution = 'executed',
  tradesForMarkets,
  tradesForEarliestDate,
}: UseTradeFiltersParams) {
  const resolvedInitialDateRange = initialDateRange ?? buildPresetRange('year').dateRange;
  const [dateRange, setDateRange] = useState<DateRangeState>(resolvedInitialDateRange);
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    initialFilter ?? deriveInitialFilter(resolvedInitialDateRange)
  );
  const [selectedMarket, setSelectedMarket] = useState<string>(initialSelectedMarket);
  const [executionFilter, setExecutionFilter] = useState<ExecutionFilter>(initialExecution);

  const markets = useMemo(
    () => Array.from(new Set(tradesForMarkets.map((t) => t.market).filter(Boolean))),
    [tradesForMarkets]
  );

  const isCustomRange = isCustomDateRange(dateRange);

  const earliestTradeDate = useMemo(() => {
    if (activeFilter !== 'all') return undefined;
    const source = tradesForEarliestDate ?? tradesForMarkets;
    if (source.length === 0) return undefined;
    return source.reduce(
      (min: string, t: Trade) => (t.trade_date < min ? t.trade_date : min),
      source[0].trade_date
    );
  }, [activeFilter, tradesForEarliestDate, tradesForMarkets]);

  const handleFilterChange = useCallback((type: FilterType) => {
    setActiveFilter(type);
    const { dateRange: nextRange } = buildPresetRange(type);
    setDateRange(nextRange);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRangeState) => {
    setDateRange(range);
  }, []);

  const handleExecutionChange = useCallback((execution: ExecutionFilter) => {
    setExecutionFilter(execution);
  }, []);

  return {
    dateRange,
    setDateRange,
    activeFilter,
    setActiveFilter,
    selectedMarket,
    setSelectedMarket,
    executionFilter,
    setExecutionFilter,
    markets,
    isCustomRange,
    earliestTradeDate,
    handleFilterChange,
    handleDateRangeChange,
    handleExecutionChange,
  };
}
