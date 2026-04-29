import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import type { DashboardRpcResult } from '@/types/dashboard-rpc';
import type { TradingMode } from '@/types/trade';
import type { AccountType } from '@/types/account-settings';

export interface GetDashboardAggregatesParams {
  userId: string;
  accountId: string;
  mode: TradingMode;
  startDate: string;
  endDate: string;
  strategyId?: string | null;
  /** 'executed' | 'non_executed' | 'all' — defaults to 'executed' */
  execution?: string;
  accountBalance: number;
  /** When true, RPC returns compact_trades[] (used by public share pages). */
  includeCompactTrades?: boolean;
  /** Market filter — 'all' (default) or a specific market name. Applied in DB. */
  market?: string;
  /** When true, RPC includes series[] in the response. Defaults to false — series_stats in
   *  the RPC now computes all 6 time-series values (maxDrawdown, streaks, Sharpe, TQI)
   *  directly in SQL, so series[] is no longer needed for stat computation. */
  includeSeries?: boolean;
  /** Selects the SQL P&L formula. 'futures' makes the RPC read calculated_profit
   *  directly (the snapshot from tradePnlCalculator.ts); 'standard' keeps the
   *  legacy risk × R:R × balance formula. Defaults to 'standard'. */
  accountType?: AccountType | null;
}

/**
 * Layer 1 wrapper: calls the get_dashboard_aggregates Supabase RPC.
 * Returns pre-aggregated stats in a single DB round-trip.
 * No raw trade fetching — the DB does all the work.
 */
export async function getDashboardAggregates(
  params: GetDashboardAggregatesParams
): Promise<DashboardRpcResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_dashboard_aggregates', {
    p_user_id:              params.userId,
    p_account_id:           params.accountId,
    p_mode:                 params.mode,
    p_start_date:           params.startDate,
    p_end_date:             params.endDate,
    p_strategy_id:          params.strategyId ?? null,
    p_execution:            params.execution ?? 'executed',
    p_account_balance:      params.accountBalance,
    p_include_compact_trades: params.includeCompactTrades ?? false,
    p_market:               params.market ?? 'all',
    p_include_series:       params.includeSeries ?? false,
    p_account_type:         params.accountType ?? 'standard',
  });

  if (error) throw error;
  return data as DashboardRpcResult;
}

/**
 * Same as getDashboardAggregates but uses the service-role client.
 * Requires the RPC to allow service_role calls (auth.role() = 'service_role' bypass).
 * Used by the public share page to refresh the stats cache without a user session.
 */
export async function getDashboardAggregatesServiceRole(
  params: GetDashboardAggregatesParams
): Promise<DashboardRpcResult> {
  const supabase = createServiceRoleClient();

  const { data, error } = await (supabase as any).rpc('get_dashboard_aggregates', {
    p_user_id:                params.userId,
    p_account_id:             params.accountId,
    p_mode:                   params.mode,
    p_start_date:             params.startDate,
    p_end_date:               params.endDate,
    p_strategy_id:            params.strategyId ?? null,
    p_execution:              params.execution ?? 'executed',
    p_account_balance:        params.accountBalance,
    p_include_compact_trades: params.includeCompactTrades ?? false,
    p_market:                 params.market ?? 'all',
    p_include_series:         params.includeSeries ?? false,
    p_account_type:           params.accountType ?? 'standard',
  });

  if (error) throw error;
  return data as DashboardRpcResult;
}
