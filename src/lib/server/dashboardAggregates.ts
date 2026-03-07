import { createClient } from '@/utils/supabase/server';
import type { DashboardRpcResult } from '@/types/dashboard-rpc';

export interface GetDashboardAggregatesParams {
  userId: string;
  accountId: string;
  mode: string;
  startDate: string;
  endDate: string;
  strategyId?: string | null;
  /** 'executed' | 'non_executed' | 'all' — defaults to 'executed' */
  execution?: string;
  accountBalance: number;
  /** When true, RPC returns compact_trades[] for the Layer 3 worker cache.
   *  Only needed in the main (executed) call — skip for non_executed call. */
  includeCompactTrades?: boolean;
}

/**
 * Layer 1 wrapper: calls the get_dashboard_aggregates Supabase RPC.
 * Returns pre-aggregated stats + compact_trades[] in a single DB round-trip.
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
    p_include_compact_trades: params.includeCompactTrades ?? true,
  });

  if (error) throw error;
  return data as DashboardRpcResult;
}
