/**
 * Server-only: builds the full dashboard API response (single RPC via getDashboardAggregates).
 * Shared by the /api/dashboard-stats route and StrategyData so the client can be hydrated
 * without a separate API call (audit 2.1).
 *
 * Time-series stats (maxDrawdown, streaks, Sharpe, TQI) are computed directly in the
 * RPC via series_stats. Non-executed comparison stats are computed inline in the RPC
 * via non_executed_stats — no second round-trip needed.
 */
import { getDashboardAggregates } from '@/lib/server/dashboardAggregates';
import type { DashboardApiResponse } from '@/types/dashboard-rpc';
import type { TradingMode } from '@/types/trade';

export interface GetDashboardApiResponseParams {
  userId: string;
  accountId: string;
  mode: TradingMode;
  startDate: string;
  endDate: string;
  strategyId?: string | null;
  accountBalance: number;
  /** 'executed' | 'non_executed' | 'all' */
  execution?: string;
  market?: string;
  /** When true, RPC returns compact_trades[] (used by public share pages). Dashboard never sets this. */
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

  // Single RPC call — non_executed_stats is now computed inline in the RPC
  // via the _ne/_ne_*_raw CTEs, eliminating a second round-trip + full table scan.
  const main = await getDashboardAggregates({
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
  });
  const nonExecuted = main.non_executed_stats ?? { core: { totalTrades: 0 }, setup_stats: [], liquidity_stats: [], market_stats: [] };

  // Read pre-computed time-series stats from the RPC (series_stats key).
  const ss = main.series_stats;
  const tradeMonths = (main.trade_months ?? []) as string[];
  const earliestTradeDate = main.earliest_trade_date ?? null;

  const response: DashboardApiResponse = {
    ...main,
    maxDrawdown: ss?.maxDrawdown ?? 0,
    drawdownCount: ss?.drawdownCount ?? 0,
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
