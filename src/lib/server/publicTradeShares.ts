'use server';

import type { Database } from '@/types/supabase';
import { logShareError } from '@/lib/server/shareLogger';
import type { Trade, TradingMode } from '@/types/trade';
import { createClient as createSupabaseServerClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getCachedUserSession } from '@/lib/server/session';

export type TradeShareRow =
  Database['public']['Tables']['trade_shares']['Row'];

type ShareMode = TradingMode;

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

function normalizeTradeScreenTimeframes(raw: unknown): string[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return [raw[0] ?? '', raw[1] ?? '', raw[2] ?? '', raw[3] ?? ''];
  }
  return ['', '', '', ''];
}

 
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
    trade_screen_timeframes: normalizeTradeScreenTimeframes(trade.trade_screen_timeframes),
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
    // Futures fields — null on standard trades, populated on futures trades.
    num_contracts: trade.num_contracts ?? null,
    dollar_per_sl_unit_override: trade.dollar_per_sl_unit_override ?? null,
    calculated_risk_dollars: trade.calculated_risk_dollars ?? null,
    spec_source: trade.spec_source ?? null,
  };
}

const TRADE_COLUMNS = [
  'id', 'user_id', 'account_id', 'strategy_id',
  'trade_date', 'trade_time', 'day_of_week',
  'market', 'setup_type', 'liquidity', 'sl_size', 'direction', 'trade_outcome',
  'session', 'break_even', 'reentry', 'news_related', 'mss',
  'risk_reward_ratio', 'risk_reward_ratio_long', 'local_high_low',
  'risk_per_trade', 'calculated_profit', 'pnl_percentage',
  'quarter', 'evaluation', 'partials_taken', 'executed',
  'launch_hour', 'displacement_size',
  'trade_screens', 'trade_screen_timeframes',
  'notes', 'trend', 'fvg_size',
  'confidence_at_entry', 'mind_state_at_entry',
  'be_final_result',
  'news_name', 'news_intensity',
  'num_contracts', 'dollar_per_sl_unit_override',
  'calculated_risk_dollars', 'spec_source',
].join(', ');

/**
 * Shared active filter — only return shares that are not expired and still active.
 * Mirror of the strategy_shares pattern in publicShares.ts.
 */
 
function applyActiveShareFilter(query: any): any {
  return query
    .eq('active', true)
    .gt('expires_at', new Date().toISOString());
}

async function createTradeShare(params: {
  tradeId: string;
  accountId: string;
  mode: ShareMode;
  strategyId: string | null;
  userId: string;
}): Promise<{
  shareToken: string | null;
  shareRow: TradeShareRow | null;
  error: string | null;
}> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== params.userId) {
    return { shareToken: null, shareRow: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const tableName = `${params.mode}_trades` as const;

  // Ownership check + fetch the labels we'll denormalize onto trade_shares.
  // Also gives defence-in-depth on top of RLS.
  // Cast through `any` to sidestep "Type instantiation is excessively deep"
  // on the union of three trade tables (live / demo / backtesting).
  const { data: tradeRow, error: tradeError } = await (supabase.from(tableName) as any)
    .select('id, user_id, market, direction, trade_date')
    .eq('id', params.tradeId)
    .eq('user_id', user.id)
    .single();

  if (tradeError || !tradeRow) {
    return {
      shareToken: null,
      shareRow: null,
      error: 'Trade not found or access denied',
    };
  }

  const typedTradeRow = tradeRow as {
    market: string | null;
    direction: string | null;
    trade_date: string | null;
  };

  // Dedup: reuse existing active+non-expired share for the same trade.
  const { data: existingShares, error: existingError } = await supabase
    .from('trade_shares')
    .select('*')
    .eq('trade_id', params.tradeId)
    .eq('created_by', user.id)
    .eq('active', true)
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (!existingError && existingShares && existingShares.length > 0) {
    const existing = existingShares[0] as TradeShareRow;
    return {
      shareToken: existing.share_token,
      shareRow: existing,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from('trade_shares')
    .insert({
      trade_id: params.tradeId,
      account_id: params.accountId,
      mode: params.mode,
      strategy_id: params.strategyId,
      created_by: user.id,
      active: true,
      trade_market: typedTradeRow.market,
      trade_direction: typedTradeRow.direction,
      trade_date: typedTradeRow.trade_date,
    })
    .select('*')
    .single();

  if (error || !data) {
    logShareError({ route: 'createTradeShare' }, 'Error creating trade share', error);
    return {
      shareToken: null,
      shareRow: null,
      error: 'Failed to generate share link. Please try again.',
    };
  }

  const newShare = data as TradeShareRow;
  return {
    shareToken: newShare.share_token,
    shareRow: newShare,
    error: null,
  };
}

export async function getTradeShareByToken(
  token: string
): Promise<TradeShareRow | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await applyActiveShareFilter(
     
    (supabase as any).from('trade_shares').select('*').eq('share_token', token)
  ).single();

  if (error) {
     
    if ((error as any).code === 'PGRST116') {
      return null;
    }
    logShareError({ route: 'getTradeShareByToken', token }, 'Error fetching trade share by token', error);
    return null;
  }

  return data as TradeShareRow;
}

/**
 * Fetches a single trade for the public share page.
 * Uses the service-role client so it bypasses RLS — the token + active filter is
 * the auth gate (see getTradeShareByToken before calling this).
 */
export async function getPublicTradeForShare(params: {
  tradeId: string;
  accountId: string;
  mode: ShareMode;
}): Promise<Trade | null> {
  const supabase = createServiceRoleClient();
  const tableName = `${params.mode}_trades` as const;

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(TRADE_COLUMNS)
      .eq('id', params.tradeId)
       
      .eq('account_id' as any, params.accountId)
      .single();

    if (error || !data) {
      logShareError(
        { route: 'getPublicTradeForShare' },
        'Error fetching public trade for share',
        error
      );
      return null;
    }

    return mapSupabaseTradeToTrade(data, params.mode);
  } catch (err) {
    logShareError({ route: 'getPublicTradeForShare' }, 'Unexpected error', err);
    return null;
  }
}

async function getTradeSharesForUser(userId: string): Promise<TradeShareRow[]> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('trade_shares')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    logShareError({ route: 'getTradeSharesForUser' }, 'Error fetching user trade shares', error);
    return [];
  }

  return (data ?? []) as TradeShareRow[];
}

export async function createTradeShareAction(input: {
  tradeId: string;
  accountId: string;
  mode: ShareMode;
  strategyId: string | null;
  userId: string;
}): Promise<{
  url: string | null;
  share: TradeShareRow | null;
  error: string | null;
}> {
  const { shareToken, shareRow, error } = await createTradeShare(input);

  if (error || !shareToken || !shareRow) {
    return { url: null, share: null, error };
  }

  const url = `/share/trade/${shareToken}`;
  return { url, share: shareRow, error: null };
}

export async function getUserTradeSharesAction(input: {
  userId: string;
}): Promise<TradeShareRow[]> {
  return getTradeSharesForUser(input.userId);
}

export async function setTradeShareActiveAction(input: {
  shareId: string;
  userId: string;
  active: boolean;
}): Promise<{ error: string | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== input.userId) {
    return { error: 'Unauthorized' };
  }

  const serviceClient = createServiceRoleClient();
   
  const { data, error } = await (serviceClient as any)
    .from('trade_shares')
    .update({ active: input.active })
    .eq('id', input.shareId)
    .eq('created_by', user.id)
    .select('id, active')
    .single();

  if (error || !data) {
    logShareError({ route: 'setTradeShareActiveAction', shareId: input.shareId }, 'Error updating trade share active flag', error);
    return { error: 'Failed to update share link. Please try again.' };
  }

  return { error: null };
}

export async function deleteTradeShareAction(input: {
  shareId: string;
  userId: string;
}): Promise<{ error: string | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== input.userId) {
    return { error: 'Unauthorized' };
  }

  const serviceClient = createServiceRoleClient();
   
  const { error } = await (serviceClient as any)
    .from('trade_shares')
    .delete()
    .eq('id', input.shareId)
    .eq('created_by', user.id);

  if (error) {
    logShareError({ route: 'deleteTradeShareAction', shareId: input.shareId }, 'Error deleting trade share', error);
    return { error: 'Failed to delete share link. Please try again.' };
  }

  return { error: null };
}
