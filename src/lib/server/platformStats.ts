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

  const [liveRes, demoRes, backtestingRes, subsRes] = await Promise.all([
    supabase.from('live_trades').select('id', { count: 'exact', head: true }),
    supabase.from('demo_trades').select('id', { count: 'exact', head: true }),
    supabase.from('backtesting_trades').select('id', { count: 'exact', head: true }),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'admin_granted'),
  ]);

  if (liveRes.error || demoRes.error || backtestingRes.error || subsRes.error) {
    return { error: liveRes.error?.message ?? demoRes.error?.message ?? backtestingRes.error?.message ?? subsRes.error?.message ?? 'Failed to count platform stats' };
  }

  const result: AdminPlatformStats = {
    tradersCount: data.traders_count,
    tradesCount: data.trades_count,
    statsBoardsCount: data.stats_boards_count,
    subscriptionsCount: subsRes.count ?? 0,
    tradesByMode: {
      live: liveRes.count ?? 0,
      demo: demoRes.count ?? 0,
      backtesting: backtestingRes.count ?? 0,
    },
  };

  if (period && data.prev_traders_count != null) {
    result.prev = {
      tradersCount: data.prev_traders_count ?? 0,
      tradesCount: data.prev_trades_count ?? 0,
      statsBoardsCount: data.prev_stats_boards_count ?? 0,
    };
  }

  return { data: result };
}

export async function revalidateLandingStats(): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: 'Unauthorized' };
  revalidatePath('/');
  return {};
}
