'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin } from './admin';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import type { AdminPlatformStats, ComparisonPeriod, PlatformStatsRpcResponse } from '@/types/platform-stats';

const INTERVALS: Record<ComparisonPeriod, string> = {
  '1w': '7 days',
  '1m': '1 month',
  '3m': '3 months',
  '6m': '6 months',
  '1y': '1 year',
};

export async function getAdminPlatformStats(
  period?: ComparisonPeriod
): Promise<{ data: AdminPlatformStats } | { error: string }> {
  if (!(await isAdmin())) return { error: 'Unauthorized' };

  const supabase = createServiceRoleClient();
  const { data: raw, error } = await supabase.rpc('get_platform_stats', {
    p_compare_interval: period ? INTERVALS[period] : null,
  });

  if (error || !raw) return { error: error?.message ?? 'RPC failed' };

  const data = raw as unknown as PlatformStatsRpcResponse;

  const { count: subsCount, error: subsError } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'admin_granted');

  if (subsError) {
    return { error: subsError.message };
  }

  const result: AdminPlatformStats = {
    tradersCount: data.traders_count,
    activeTradersCount: data.active_traders_count,
    tradesCount: data.trades_count,
    statsBoardsCount: data.stats_boards_count,
    subscriptionsCount: subsCount ?? 0,
    tradesByMode: {
      live: data.live_trades_count,
      demo: data.demo_trades_count,
      backtesting: data.backtesting_trades_count,
    },
  };

  if (period && data.prev_traders_count != null) {
    result.prev = {
      tradersCount: data.prev_traders_count ?? 0,
      activeTradersCount: data.prev_active_traders_count ?? 0,
      tradesCount: data.prev_trades_count ?? 0,
      statsBoardsCount: data.prev_stats_boards_count ?? 0,
      tradesByMode: {
        live: data.prev_live_trades_count ?? 0,
        demo: data.prev_demo_trades_count ?? 0,
        backtesting: data.prev_backtesting_trades_count ?? 0,
      },
    };
  }

  return { data: result };
}

export async function revalidateLandingStats(): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: 'Unauthorized' };
  revalidatePath('/');
  return {};
}
