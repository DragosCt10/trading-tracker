/**
 * Server-only: builds the full dashboard API response (1–2 RPCs via getDashboardAggregates).
 * Shared by the /api/dashboard-stats route and StrategyData so the client can be hydrated
 * without a separate API call (audit 2.1).
 *
 * Time-series stats (maxDrawdown, streaks, Sharpe, TQI) are now computed directly in the
 * RPC via series_stats — no need to transfer series[] to the application layer.
 */
import { getDashboardAggregates } from '@/lib/server/dashboardAggregates';
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
  // series[] is no longer needed for stat computation — series_stats in the RPC provides
  // all 6 time-series values (maxDrawdown, streaks, Sharpe, TQI) computed directly in SQL.
  // Default includeSeries to false to avoid transferring ~4 MB for large trade sets.
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
      includeSeries: params.includeSeries ?? false,
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
          includeSeries: false,
        })
      : Promise.resolve(null),
  ]);
  const nonExecuted = nonExecutedOrNull ?? main;

  // Read pre-computed time-series stats from the RPC (series_stats key).
  const ss = main.series_stats;
  const tradeMonths = (main.trade_months ?? []) as string[];
  const earliestTradeDate = main.earliest_trade_date ?? null;

  const response: DashboardApiResponse = {
    ...main,
    maxDrawdown: ss?.maxDrawdown ?? 0,
    currentStreak: ss?.currentStreak ?? 0,
    maxWinningStreak: ss?.maxWinningStreak ?? 0,
    maxLosingStreak: ss?.maxLosingStreak ?? 0,
    sharpeWithBE: ss?.sharpeWithBE ?? 0,
    tradeQualityIndex: ss?.tradeQualityIndex ?? 0,
    multipleR: main.core.multipleR,
    nonExecutedStats: nonExecuted,
    nonExecutedTotalTradesCount: nonExecuted.core.totalTrades,
    earliestTradeDate,
    tradeMonths,
  };

  return response;
}
