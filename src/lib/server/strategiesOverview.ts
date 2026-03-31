'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import type { TradingMode } from '@/types/trade';

/** One equity-curve data point returned by the RPC or cache. */
export interface EquityCurvePoint {
  /** YYYY-MM-DD */
  d: string;
  /** Cumulative profit at this point */
  p: number;
}

/** Per-strategy stats (overview cards + "All Trades" fixed-input case). */
export interface StrategyOverviewRow {
  totalTrades: number;
  winRate: number;
  avgRR: number;
  totalRR: number;
  totalProfit: number;
  equityCurve: EquityCurvePoint[];
}

/** Full result: strategy_id → stats */
export type StrategiesOverviewResult = Record<string, StrategyOverviewRow>;

/**
 * Returns per-strategy aggregated stats + equity curves.
 *
 * Read order:
 *   1. strategy_stats_cache table (Phase 3) — simple SELECT, ~1-5ms
 *   2. get_strategies_overview RPC (Phase 1 fallback) — ~200ms SQL aggregation
 *
 * The cache is kept up-to-date automatically via DB triggers on all three
 * trade tables, so it is always fresh. The RPC fallback covers the window
 * between a new deployment and the backfill completing, or any trigger failure.
 */
export async function getStrategiesOverview(
  accountId: string,
  mode: TradingMode,
): Promise<StrategiesOverviewResult> {
  const { user } = await getCachedUserSession();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createClient();
  const normalizedMode = mode.trim().toLowerCase();
  const isValidMode =
    normalizedMode === 'live' ||
    normalizedMode === 'demo' ||
    normalizedMode === 'backtesting';
  if (!isValidMode) {
    console.error(
      `[strategiesOverview] invalid mode for stats RPC accountId=${accountId} userId=${user.id} mode=${JSON.stringify(mode)}`
    );
    return {};
  }

  // ── 1. Try the snapshot cache (Phase 3) ───────────────────────────────────
  const { data: cached, error: cacheError } = await supabase
    .from('strategy_stats_cache')
    .select('strategy_id, total_trades, win_rate, avg_rr, total_rr, total_profit, equity_curve')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .eq('mode', normalizedMode);

  if (!cacheError && cached && cached.length > 0) {
    return Object.fromEntries(
      cached.map((row) => [
        row.strategy_id,
        {
          totalTrades:  row.total_trades,
          winRate:      row.win_rate,
          avgRR:        row.avg_rr,
          totalRR:      row.total_rr,
          totalProfit:  row.total_profit,
          equityCurve:  (row.equity_curve ?? []) as EquityCurvePoint[],
        } satisfies StrategyOverviewRow,
      ])
    );
  }

  if (cacheError) {
    console.error(
      `[strategiesOverview] cache read failed accountId=${accountId} userId=${user.id} mode=${normalizedMode}`,
      cacheError
    );
  }

  // ── 2. Fallback: call the RPC (Phase 1) ───────────────────────────────────
  const { data, error } = await supabase.rpc('get_strategies_overview', {
    p_user_id:    user.id,
    p_account_id: accountId,
    p_mode:       normalizedMode,
  });

  if (error) {
    console.error(
      `[strategiesOverview] RPC get_strategies_overview failed accountId=${accountId} userId=${user.id} mode=${normalizedMode} code=${error.code ?? 'unknown'}`,
      error
    );
    // Never 500 the /stats page because of a DB-side RPC issue.
    return {};
  }
  return (data ?? {}) as StrategiesOverviewResult;
}
