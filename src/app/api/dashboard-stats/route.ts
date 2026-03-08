import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getDashboardAggregates } from '@/lib/server/dashboardAggregates';
import { calculateFromSeries } from '@/utils/calculateFromSeries';
import type { DashboardApiResponse } from '@/types/dashboard-rpc';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const accountId   = searchParams.get('accountId');
  const mode        = searchParams.get('mode');
  const startDate   = searchParams.get('startDate');
  const endDate     = searchParams.get('endDate');
  const strategyId  = searchParams.get('strategyId') || null;
  const accountBalance = Number(searchParams.get('accountBalance') ?? '0');
  // Hook sends 'all' | 'executed' | 'nonExecuted'; map nonExecuted → non_executed for RPC
  const executionParam = searchParams.get('execution') ?? 'executed';
  const execution = executionParam === 'nonExecuted' ? 'non_executed' : executionParam;
  const market = searchParams.get('market') ?? 'all';

  if (!accountId || !mode || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  // Main RPC call (respects execution filter + market filter)
  // Non-executed reference call: only when main isn't already non_executed (saves 1 DB call)
  const nonExecutedNeeded = execution !== 'non_executed';
  const [main, nonExecutedOrNull] = await Promise.all([
    getDashboardAggregates({
      userId: user.id,
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
          userId: user.id,
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

  // Layer 2: time-series stats from the ordered series (drawdown, streaks, Sharpe, TQI)
  const timeSeries = calculateFromSeries(main.series, accountBalance);

  // Derive tradeMonths + earliestTradeDate from compact_trades (all executions)
  const allDates = main.compact_trades.map(t => t.trade_date).filter(Boolean);
  const earliestTradeDate = allDates.length > 0 ? [...allDates].sort()[0] : null;
  const tradeMonths = Array.from(new Set(allDates.map(d => d.slice(0, 7)))).sort();

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

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'private, max-age=120, stale-while-revalidate=300',
    },
  });
}
