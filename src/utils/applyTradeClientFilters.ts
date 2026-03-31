import type { Trade } from '@/types/trade';
import type { DateRangeState } from '@/utils/dateRangeHelpers';

export type TradeExecutionFilter = 'all' | 'executed' | 'nonExecuted';

type ApplyTradeClientFiltersParams = {
  trades: Trade[];
  dateRange: DateRangeState;
  selectedMarket: string;
  executionFilter: TradeExecutionFilter;
  partialsOnly?: boolean;
};

export function applyTradeClientFilters({
  trades,
  dateRange,
  selectedMarket,
  executionFilter,
  partialsOnly = false,
}: ApplyTradeClientFiltersParams): Trade[] {
  let list = trades.filter(
    (t) => t.trade_date >= dateRange.startDate && t.trade_date <= dateRange.endDate
  );

  if (executionFilter === 'executed') {
    list = list.filter((t) => t.executed === true);
  } else if (executionFilter === 'nonExecuted') {
    list = list.filter((t) => !t.executed);
  }

  if (partialsOnly) {
    list = list.filter((t) => t.partials_taken);
  }

  if (selectedMarket !== 'all') {
    list = list.filter((t) => t.market === selectedMarket);
  }

  return list;
}
