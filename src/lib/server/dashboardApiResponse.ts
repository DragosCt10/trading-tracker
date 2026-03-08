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
      includeCompactTrades: true,
      market,
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
  const allDates = main.compact_trades.map((t) => t.trade_date).filter(Boolean);
  const earliestTradeDate = allDates.length > 0 ? [...allDates].sort()[0] : null;
  const tradeMonths = Array.from(new Set(allDates.map((d) => d.slice(0, 7)))).sort();

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
