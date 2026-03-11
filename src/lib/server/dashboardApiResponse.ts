/**
 * Server-only: builds the full dashboard API response (1–2 RPCs via getDashboardAggregates).
 * Shared by the /api/dashboard-stats route and StrategyData so the client can be hydrated
 * without a separate API call (audit 2.1).
 */
import { getDashboardAggregates } from '@/lib/server/dashboardAggregates';
import { calculateFromSeries } from '@/utils/calculateFromSeries';
import type { DashboardApiResponse } from '@/types/dashboard-rpc';

export interface GetDashboardApiResponseParams {
  userId: string;
  accountId: string;
  mode: string;
  startDate: string;
  endDate: string;
  strategyId?: string | null;
  accountBalance: number;
  /** 'executed' | 'non_executed' | 'all' */
  execution?: string;
  market?: string;
  /** When true, RPC includes compact_trades[] (needed for extra cards: launch_hour, displacement_size, fvg_size, potential_rr) */
  includeCompactTrades?: boolean;
  /** When false, RPC skips series[] (saves 3-4 MB on all-time queries). Client fetches trades via getFilteredTrades(). */
  includeSeries?: boolean;
}

export async function getDashboardApiResponse(
  params: GetDashboardApiResponseParams
): Promise<DashboardApiResponse> {
  const {
    userId,
    accountId,
    mode,
    startDate,
    endDate,
    strategyId = null,
    accountBalance,
    execution = 'executed',
    market = 'all',
  } = params;

  const nonExecutedNeeded = execution !== 'non_executed';
  const [main, nonExecutedOrNull] = await Promise.all([
    getDashboardAggregates({
      userId,
      accountId,
      mode,
      startDate,
      endDate,
      strategyId,
      execution,
      accountBalance,
      includeCompactTrades: params.includeCompactTrades ?? false,
      market,
      includeSeries: params.includeSeries ?? true,
    }),
    nonExecutedNeeded
      ? getDashboardAggregates({
          userId,
          accountId,
          mode,
          startDate,
          endDate,
          strategyId,
          execution: 'non_executed',
          accountBalance,
          includeCompactTrades: false,
        })
      : Promise.resolve(null),
  ]);
  const nonExecuted = nonExecutedOrNull ?? main;

  const timeSeries = calculateFromSeries(main.series, accountBalance);
  // trade_months and earliest_trade_date are now computed in the RPC (from _all CTE).
  const tradeMonths = (main.trade_months ?? []) as string[];
  const earliestTradeDate = main.earliest_trade_date ?? null;

  const response: DashboardApiResponse = {
    ...main,
    maxDrawdown: timeSeries.maxDrawdown,
    currentStreak: timeSeries.currentStreak,
    maxWinningStreak: timeSeries.maxWinningStreak,
    maxLosingStreak: timeSeries.maxLosingStreak,
    sharpeWithBE: timeSeries.sharpeWithBE,
    tradeQualityIndex: timeSeries.tradeQualityIndex,
    multipleR: main.core.multipleR,
    nonExecutedStats: nonExecuted,
    nonExecutedTotalTradesCount: nonExecuted.core.totalTrades,
    earliestTradeDate,
    tradeMonths,
  };

  return response;
}
