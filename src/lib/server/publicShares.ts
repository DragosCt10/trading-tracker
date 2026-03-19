'use server';

import type { Database } from '@/types/supabase';
import type { Trade } from '@/types/trade';
import { createClient as createSupabaseServerClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getCachedUserSession } from '@/lib/server/session';
import { getDashboardAggregates } from '@/lib/server/dashboardAggregates';
import type { DashboardRpcResult } from '@/types/dashboard-rpc';

export type StrategyShareRow =
  Database['public']['Tables']['strategy_shares']['Row'];

type ShareMode = 'live' | 'backtesting' | 'demo';

/**
 * Normalizes trade_screens from DB. Falls back to legacy trade_link / liquidity_taken
 * columns for rows not yet migrated.
 */
function normalizeTradeScreens(
  raw: unknown,
  fallbackLink?: string,
  fallbackLiq?: string
): string[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return [raw[0] ?? '', raw[1] ?? '', raw[2] ?? '', raw[3] ?? ''];
  }
  return [fallbackLink ?? '', fallbackLiq ?? '', '', ''];
}

/**
 * Maps Supabase trade data to Trade type.
 * This mirrors the mapping used in lib/server/trades.ts but uses
 * the service role client so it can bypass RLS for public shares.
 */
function mapSupabaseTradeToTrade(trade: any, mode: ShareMode): Trade {
  return {
    id: trade.id,
    user_id: trade.user_id,
    account_id: trade.account_id,
    mode,
    trade_screens: normalizeTradeScreens(
      trade.trade_screens,
      trade.trade_link,
      trade.liquidity_taken
    ),
    trade_time: trade.trade_time,
    trade_date: trade.trade_date,
    day_of_week: trade.day_of_week,
    market: trade.market,
    setup_type: trade.setup_type,
    liquidity: trade.liquidity,
    sl_size: trade.sl_size,
    direction: trade.direction,
    trade_outcome: trade.trade_outcome,
    session: trade.session ?? '',
    break_even: trade.break_even,
    reentry: trade.reentry,
    news_related: trade.news_related,
    mss: trade.mss,
    risk_reward_ratio: trade.risk_reward_ratio,
    risk_reward_ratio_long: trade.risk_reward_ratio_long,
    local_high_low: trade.local_high_low,
    risk_per_trade: trade.risk_per_trade,
    calculated_profit: trade.calculated_profit,
    notes: trade.notes,
    pnl_percentage: trade.pnl_percentage,
    quarter: trade.quarter,
    evaluation: trade.evaluation,
    partials_taken: trade.partials_taken,
    executed: trade.executed,
    launch_hour: trade.launch_hour,
    displacement_size: trade.displacement_size,
    strategy_id: trade.strategy_id,
    trend: trade.trend ?? null,
    fvg_size: trade.fvg_size ?? null,
    confidence_at_entry: trade.confidence_at_entry ?? null,
    mind_state_at_entry: trade.mind_state_at_entry ?? null,
    be_final_result: trade.be_final_result ?? null,
    trade_executed_at: trade.trade_executed_at ?? null,
    news_name: trade.news_name ?? null,
    news_intensity: trade.news_intensity ?? null,
  };
}

async function createStrategyShare(params: {
  strategyId: string;
  accountId: string;
  mode: ShareMode;
  startDate: string;
  endDate: string;
  userId: string;
}): Promise<{
  shareToken: string | null;
  shareRow: StrategyShareRow | null;
  error: string | null;
}> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== params.userId) {
    return { shareToken: null, shareRow: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  // Optional defense-in-depth: ensure the strategy being shared belongs to this user.
  const { data: strategyRow, error: strategyError } = await supabase
    .from('strategies')
    .select('id, user_id')
    .eq('id', params.strategyId)
    .single();

  if (strategyError || !strategyRow || strategyRow.user_id !== user.id) {
    return {
      shareToken: null,
      shareRow: null,
      error: 'Strategy not found or access denied',
    };
  }

  // If a share already exists for the same period, strategy, account and mode,
  // reuse it instead of creating a duplicate.
  const { data: existingShares, error: existingError } = await supabase
    .from('strategy_shares')
    .select('*')
    .eq('strategy_id', params.strategyId)
    .eq('account_id', params.accountId)
    .eq('mode', params.mode)
    .eq('start_date', params.startDate)
    .eq('end_date', params.endDate)
    .eq('created_by', user.id)
    .limit(1);

  if (!existingError && existingShares && existingShares.length > 0) {
    const existing = existingShares[0] as StrategyShareRow;
    return {
      shareToken: existing.share_token,
      shareRow: existing,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from('strategy_shares')
    .insert({
      strategy_id: params.strategyId,
      account_id: params.accountId,
      mode: params.mode,
      start_date: params.startDate,
      end_date: params.endDate,
      created_by: user.id,
      active: true,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error creating strategy share:', error);
    return {
      shareToken: null,
      shareRow: null,
      error: 'Failed to generate share link. Please try again.',
    };
  }

  const newShare = data as StrategyShareRow;

  // Populate the stats cache so share page visits need only one DB read.
  // Non-fatal: if this fails the share link still works (cache miss handled gracefully).
  try {
    const { data: accountRow } = await supabase
      .from('account_settings')
      .select('account_balance')
      .eq('id', params.accountId)
      .single();
    const accountBalance = (accountRow as { account_balance?: number | null } | null)
      ?.account_balance ?? 0;

    const stats = await getDashboardAggregates({
      userId: params.userId,
      accountId: params.accountId,
      mode: params.mode,
      startDate: params.startDate,
      endDate: params.endDate,
      strategyId: params.strategyId,
      execution: 'executed',
      accountBalance,
      includeCompactTrades: true,
      market: 'all',
      includeSeries: false,
    });

    await supabase
      .from('share_stats_cache')
      .upsert({ share_id: newShare.id, stats: stats as unknown as Record<string, unknown> });
  } catch (cacheErr) {
    console.error('Failed to populate share_stats_cache (non-fatal):', cacheErr);
  }

  return {
    shareToken: newShare.share_token,
    shareRow: newShare,
    error: null,
  };
}

/**
 * Reads pre-computed analytics from the cache for a share.
 * Returns null if the cache is cold (will be rare — populated at share creation).
 */
export async function getShareStatsCache(shareId: string): Promise<DashboardRpcResult | null> {
  const supabase = createServiceRoleClient();
  const { data } = await (supabase as any)
    .from('share_stats_cache')
    .select('stats')
    .eq('share_id', shareId)
    .single();
  return (data?.stats as DashboardRpcResult) ?? null;
}

export async function getShareByToken(
  token: string
): Promise<StrategyShareRow | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await (supabase as any)
    .from('strategy_shares')
    .select('*')
    .eq('share_token', token)
    .eq('active', true)
    .single();

  if (error) {
    if ((error as any).code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching strategy share by token:', error);
    return null;
  }

  return data as StrategyShareRow;
}

async function getStrategySharesForUser(params: {
  strategyId: string;
  userId: string;
  accountId?: string;
  mode?: ShareMode;
}): Promise<StrategyShareRow[]> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== params.userId) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('strategy_shares')
    .select('*')
    .eq('strategy_id', params.strategyId)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (params.accountId) {
    query = query.eq('account_id', params.accountId);
  }
  if (params.mode) {
    query = query.eq('mode', params.mode);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching strategy shares for user:', error);
    return [];
  }

  return (data ?? []) as StrategyShareRow[];
}

export async function getPublicTradesForShare(params: {
  accountId: string;
  mode: ShareMode;
  strategyId: string;
  startDate: string;
  endDate: string;
}): Promise<Trade[]> {
  const supabase = createServiceRoleClient();

  const tableName = `${params.mode}_trades` as const;
  const limit = 500;
  let offset = 0;
  let allRows: any[] = [];
  let totalCount = 0;

  const baseFilter = (client: ReturnType<typeof createServiceRoleClient>) =>
    client
      .from(tableName)
      .select('*', { count: 'exact' })
      .eq('account_id', params.accountId)
      .eq('strategy_id', params.strategyId)
      .gte('trade_date', params.startDate)
      .lte('trade_date', params.endDate)
      .not('executed', 'eq', false)
      .order('trade_date', { ascending: false });

  try {
    const initialQuery = baseFilter(supabase).range(offset, offset + limit - 1);
    const {
      data: initialData,
      error: initialError,
      count,
    } = await initialQuery;

    if (initialError) {
      console.error('Supabase error in getPublicTradesForShare:', initialError);
      return [];
    }

    totalCount = count || 0;
    allRows = initialData || [];

    offset += limit;
    while (offset < totalCount) {
      const { data: moreData, error: fetchError } = await baseFilter(supabase)
        .range(offset, offset + limit - 1);

      if (fetchError) {
        console.error(
          'Error fetching more trades in getPublicTradesForShare:',
          fetchError
        );
        break;
      }

      allRows = allRows.concat(moreData || []);
      offset += limit;
    }

    return allRows.map((row) => mapSupabaseTradeToTrade(row, params.mode));
  } catch (error) {
    console.error('Error in getPublicTradesForShare:', error);
    return [];
  }
}

/**
 * Server action wrapper used by the ShareStrategyModal.
 * Validates ownership and returns a share URL that can be copied client-side.
 */
export async function createStrategyShareAction(input: {
  strategyId: string;
  accountId: string;
  mode: ShareMode;
  startDate: string;
  endDate: string;
  userId: string;
}): Promise<{
  url: string | null;
  share: StrategyShareRow | null;
  error: string | null;
}> {
  const { shareToken, shareRow, error } = await createStrategyShare(input);

  if (error || !shareToken || !shareRow) {
    return { url: null, share: null, error };
  }

  // Build an absolute-ish path; the client can prepend origin if needed.
  const url = `/share/strategy/${shareToken}`;
  return { url, share: shareRow, error: null };
}

export async function getStrategySharesAction(input: {
  strategyId: string;
  userId: string;
  accountId?: string;
  mode?: ShareMode;
}): Promise<StrategyShareRow[]> {
  return getStrategySharesForUser(input);
}

export async function setStrategyShareActiveAction(input: {
  shareId: string;
  userId: string;
  active: boolean;
}): Promise<{ error: string | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== input.userId) {
    return { error: 'Unauthorized' };
  }

  // Use the service role client so this works even if RLS
  // on strategy_shares is misconfigured, while still
  // restricting updates to rows created by this user.
  const serviceClient = createServiceRoleClient();
  const { data, error } = await (serviceClient as any)
    .from('strategy_shares')
    .update({ active: input.active })
    .eq('id', input.shareId)
    .eq('created_by', user.id)
    .select('id, active')
    .single();

  if (error || !data) {
    console.error('Error updating strategy share active flag:', error);
    return { error: 'Failed to update share link. Please try again.' };
  }

  return { error: null };
}

export async function deleteStrategyShareAction(input: {
  shareId: string;
  userId: string;
}): Promise<{ error: string | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== input.userId) {
    return { error: 'Unauthorized' };
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await (serviceClient as any)
    .from('strategy_shares')
    .delete()
    .eq('id', input.shareId)
    .eq('created_by', user.id);

  if (error) {
    console.error('Error deleting strategy share:', error);
    return { error: 'Failed to delete share link. Please try again.' };
  }

  return { error: null };
}

