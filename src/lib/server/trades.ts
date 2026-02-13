'use server';

import { createClient } from '@/utils/supabase/server';
import { Trade } from '@/types/trade';

/**
 * Fetches all rows from a Supabase query with pagination
 */
async function fetchAllRows<T>(baseQuery: any, limit = 500): Promise<T[]> {
  let offset = 0;
  let total = 0;
  let rows: T[] = [];

  const { data: first, error: e1, count } = await baseQuery
    .select('*', { count: 'exact' })
    .order('trade_date', { ascending: false })
    .range(0, limit - 1);

  if (e1) throw e1;
  total = count ?? 0;
  rows = (first ?? []) as T[];

  offset = limit;
  while (offset < total) {
    const { data: more, error: eMore } = await baseQuery
      .select('*')
      .order('trade_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (eMore) throw eMore;
    rows = rows.concat((more ?? []) as T[]);
    offset += limit;
  }
  return rows;
}

/**
 * Maps Supabase trade data to Trade type
 */
function mapSupabaseTradeToTrade(trade: any, mode: string): Trade {
  return {
    id: trade.id,
    user_id: trade.user_id,
    account_id: trade.account_id,
    mode: mode,
    trade_link: trade.trade_link,
    liquidity_taken: trade.liquidity_taken,
    trade_time: trade.trade_time,
    trade_date: trade.trade_date,
    day_of_week: trade.day_of_week,
    market: trade.market,
    setup_type: trade.setup_type,
    liquidity: trade.liquidity,
    sl_size: trade.sl_size,
    direction: trade.direction,
    trade_outcome: trade.trade_outcome,
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
    rr_hit_1_4: trade.rr_hit_1_4,
    partials_taken: trade.partials_taken,
    executed: trade.executed,
    launch_hour: trade.launch_hour,
    displacement_size: trade.displacement_size,
  };
}

/**
 * Server-side function to fetch filtered trades
 * This enforces user_id server-side for security
 */
export async function getFilteredTrades({
  userId,
  accountId,
  mode,
  startDate,
  endDate,
}: {
  userId: string;
  accountId: string;
  mode: string;
  startDate: string;
  endDate: string;
}): Promise<Trade[]> {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  const limit = 500;
  let offset = 0;
  let allTrades: any[] = [];
  let totalCount = 0;

  try {
    const initialQuery = supabase
      .from(`${mode}_trades`)
      .select('*', { count: 'exact' })
      .eq('user_id', userId) // Server-enforced
      .eq('account_id', accountId)
      .gte('trade_date', startDate)
      .lte('trade_date', endDate)
      .not('executed', 'eq', false)
      .order('trade_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: initialData, error: initialError, count } = await initialQuery;

    if (initialError) {
      console.error('Supabase error:', initialError);
      throw initialError;
    }

    totalCount = count || 0;
    allTrades = initialData || [];

    // Manual pagination
    offset += limit;
    while (offset < totalCount) {
      const { data: moreData, error: fetchError } = await supabase
        .from(`${mode}_trades`)
        .select('*')
        .eq('user_id', userId) // Server-enforced
        .eq('account_id', accountId)
        .gte('trade_date', startDate)
        .lte('trade_date', endDate)
        .not('executed', 'eq', false)
        .order('trade_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (fetchError) {
        console.error('Error fetching more data:', fetchError);
        break;
      }

      allTrades = allTrades.concat(moreData || []);
      offset += limit;
    }

    return allTrades.map((trade) => mapSupabaseTradeToTrade(trade, mode));
  } catch (error) {
    console.error('Error in getFilteredTrades:', error);
    return [];
  }
}

/**
 * Server-side function to get user session and account info
 */
export async function getUserSession() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (userError || sessionError) {
    return { user: null, session: null };
  }
  
  return { user, session };
}
