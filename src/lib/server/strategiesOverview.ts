'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';

/** One equity-curve data point returned by the RPC. */
export interface EquityCurvePoint {
  /** YYYY-MM-DD */
  d: string;
  /** Cumulative profit at this point */
  p: number;
}

/** Per-strategy stats returned by get_strategies_overview. */
export interface StrategyOverviewRow {
  totalTrades: number;
  winRate: number;
  avgRR: number;
  totalRR: number;
  totalProfit: number;
  equityCurve: EquityCurvePoint[];
}

/** Full RPC result: strategy_id → stats */
export type StrategiesOverviewResult = Record<string, StrategyOverviewRow>;

/**
 * Calls the get_strategies_overview Supabase RPC.
 * Returns per-strategy aggregated stats + equity curves in a single DB round-trip.
 * Replaces the N-page getFilteredTrades() bulk fetch on the Strategies page.
 */
export async function getStrategiesOverview(
  accountId: string,
  mode: string,
): Promise<StrategiesOverviewResult> {
  const { user } = await getCachedUserSession();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_strategies_overview', {
    p_user_id:    user.id,
    p_account_id: accountId,
    p_mode:       mode,
  });

  if (error) throw error;
  return (data ?? {}) as StrategiesOverviewResult;
}
