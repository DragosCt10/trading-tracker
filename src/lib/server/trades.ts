'use server';

import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import { Trade } from '@/types/trade';
import { getAccountsForMode } from '@/lib/server/accounts';
import { calculateRRStats } from '@/utils/calculateRMultiple';

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
    partials_taken: trade.partials_taken,
    executed: trade.executed,
    launch_hour: trade.launch_hour,
    displacement_size: trade.displacement_size,
    strategy_id: trade.strategy_id,
    trend: trade.trend ?? null,
    fvg_size: trade.fvg_size ?? null,
    confidence_at_entry: trade.confidence_at_entry ?? null,
    mind_state_at_entry: trade.mind_state_at_entry ?? null,
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
  includeNonExecuted = false,
  onlyNonExecuted = false,
  strategyId,
}: {
  userId: string;
  accountId: string;
  mode: string;
  startDate: string;
  endDate: string;
  /** When true, include trades where executed=false (e.g. for Trades page filter) */
  includeNonExecuted?: boolean;
  /** When true, return only trades where executed=false (e.g. for analytics non-executed list) */
  onlyNonExecuted?: boolean;
  /** Optional: Filter trades by strategy_id */
  strategyId?: string | null;
}): Promise<Trade[]> {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  const limit = 500;
  let offset = 0;
  let allTrades: Trade[] = [];
  let totalCount = 0;

  const baseFilter = (q: any) => {
    let query = q
      .from(`${mode}_trades`)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .gte('trade_date', startDate)
      .lte('trade_date', endDate);
    
    // Filter by strategy if provided
    if (strategyId) {
      query = query.eq('strategy_id', strategyId);
    }
    
    if (onlyNonExecuted) {
      query = query.eq('executed', false);
    } else if (!includeNonExecuted) {
      query = query.not('executed', 'eq', false);
    }
    return query.order('trade_date', { ascending: false });
  };

  try {
    const initialQuery = baseFilter(supabase).range(offset, offset + limit - 1);
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
      const paginationQuery = baseFilter(supabase).range(offset, offset + limit - 1);
      const { data: moreData, error: fetchError } = await paginationQuery;

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

/** Cached per request; use in layout + pages so data components can receive user without a second read */
export const getCachedUserSession = cache(getUserSession);

/**
 * Creates a new trade for the current user (server-side only; user_id from session).
 * Inserts into live_trades, backtesting_trades, or demo_trades based on mode.
 */
export async function createTrade(params: {
  mode: 'live' | 'backtesting' | 'demo';
  account_id: string;
  calculated_profit: number;
  pnl_percentage: number;
  trade: Omit<Trade, 'id' | 'user_id' | 'account_id' | 'calculated_profit' | 'pnl_percentage'>;
}): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: { message: 'Unauthorized' } };
  }

  // Ensure the account belongs to the session user (defense in depth)
  const userAccounts = await getAccountsForMode(user.id, params.mode);
  if (!userAccounts.some((a) => a.id === params.account_id)) {
    return { error: { message: 'Account not found or access denied' } };
  }

  const tableName = `${params.mode}_trades`;
  const row: Record<string, unknown> = {
    ...params.trade,
    user_id: user.id,
    account_id: params.account_id,
    calculated_profit: params.calculated_profit,
    pnl_percentage: params.pnl_percentage,
  };
  delete row.rr_hit_1_4; // Column removed from DB

  const { error } = await supabase.from(tableName).insert([row] as any);

  if (error) {
    console.error('Error creating trade:', error);
    return { error: { message: error.message ?? 'Failed to create trade' } };
  }
  return { error: null };
}

/**
 * Updates an existing trade. Only the owner (from session) can update.
 */
export async function updateTrade(
  tradeId: string,
  mode: 'live' | 'backtesting' | 'demo',
  updateData: Partial<Omit<Trade, 'id' | 'user_id' | 'account_id'>>
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: { message: 'Unauthorized' } };
  }

  const payload = { ...updateData } as Record<string, unknown>;
  delete payload.rr_hit_1_4; // Column removed from DB

  const tableName = `${mode}_trades`;
  const { error } = await supabase
    .from(tableName)
    .update(payload as any)
    .eq('id', tradeId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating trade:', error);
    return { error: { message: error.message ?? 'Failed to update trade' } };
  }
  return { error: null };
}

/**
 * Deletes a trade. Only the owner (from session) can delete.
 */
export async function deleteTrade(
  tradeId: string,
  mode: 'live' | 'backtesting' | 'demo'
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: { message: 'Unauthorized' } };
  }

  const tableName = `${mode}_trades`;
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', tradeId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting trade:', error);
    return { error: { message: error.message ?? 'Failed to delete trade' } };
  }
  return { error: null };
}

/**
 * Deletes multiple trades by id. Only the owner (from session) can delete.
 * Pass non-empty array of trade ids; no-op if empty.
 */
export async function deleteTrades(
  tradeIds: string[],
  mode: 'live' | 'backtesting' | 'demo'
): Promise<{ error: { message: string } | null }> {
  if (tradeIds.length === 0) {
    return { error: null };
  }
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: { message: 'Unauthorized' } };
  }

  const tableName = `${mode}_trades`;
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('user_id', user.id)
    .in('id', tradeIds);

  if (error) {
    console.error('Error bulk deleting trades:', error);
    return { error: { message: error.message ?? 'Failed to delete trades' } };
  }
  return { error: null };
}

/**
 * Bulk-imports an array of trades for the current user.
 * Validates ownership, normalizes markets, and batch-inserts in chunks of 100.
 */
export async function importTrades(params: {
  mode: 'live' | 'backtesting' | 'demo';
  account_id: string;
  strategy_id: string | null;
  trades: Array<Omit<Trade, 'id' | 'user_id' | 'account_id'>>;
}): Promise<{
  inserted: number;
  failed: Array<{ row: number; reason: string }>;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const userAccounts = await getAccountsForMode(user.id, params.mode);
  if (!userAccounts.some((a) => a.id === params.account_id)) {
    throw new Error('Account not found or access denied');
  }

  const tableName = `${params.mode}_trades`;
  const CHUNK_SIZE = 100;
  let inserted = 0;
  const failed: Array<{ row: number; reason: string }> = [];

  // Use trades as-is (no market validation or normalization)
  const validRows: { index: number; row: Record<string, unknown> }[] = [];
  params.trades.forEach((trade, index) => {
    const row: Record<string, unknown> = {
      ...trade,
      user_id: user.id,
      account_id: params.account_id,
      strategy_id: params.strategy_id,
    };
    delete row.rr_hit_1_4; // Column removed from DB
    validRows.push({ index, row });
  });

  // Batch insert in chunks
  for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
    const chunk = validRows.slice(i, i + CHUNK_SIZE).map((v) => v.row);
    const { error } = await supabase.from(tableName).insert(chunk as any);
    if (error) {
      validRows.slice(i, i + CHUNK_SIZE).forEach((v) => {
        failed.push({ row: v.index + 1, reason: error.message });
      });
    } else {
      inserted += chunk.length;
    }
  }

  return { inserted, failed };
}

/**
 * Aggregates statistics from trades table efficiently using SQL aggregation.
 * This handles thousands of trades by fetching only necessary fields and processing in batches.
 * Returns winrate, total trades count, and average RR for a specific strategy.
 * The table queried depends on the mode: live_trades, backtesting_trades, or demo_trades.
 */
export async function getStrategyStatsFromTrades({
  userId,
  accountId,
  strategyId,
  mode,
}: {
  userId: string;
  accountId: string;
  strategyId: string;
  mode: 'live' | 'backtesting' | 'demo';
}): Promise<{
  totalTrades: number;
  winRate: number;
  avgRR: number;
  totalRR: number;
} | null> {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  try {
    // Determine table name based on mode
    const tableName = `${mode}_trades`;
    
    // Base query builder
    const baseQuery = supabase
      .from(tableName)
      .select('trade_outcome, break_even, risk_reward_ratio')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('strategy_id', strategyId)
      .not('executed', 'eq', false); // Only executed trades

    // Fetch in batches to handle thousands of trades efficiently
    const batchSize = 500;
    let offset = 0;
    let allStats: Array<{ trade_outcome: string; break_even: boolean | null; risk_reward_ratio: number | null }> = [];
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error } = await baseQuery
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching strategy stats batch:', error);
        break;
      }

      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }

      allStats = allStats.concat(batch);
      offset += batchSize;

      // If we got fewer results than batch size, we've reached the end
      if (batch.length < batchSize) {
        hasMore = false;
      }
    }

    if (allStats.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        avgRR: 0,
        totalRR: 0,
      };
    }

    // Calculate winrate (excluding break-even trades) and RR Multiple via shared util
    let nonBEWins = 0;
    let nonBELosses = 0;
    const validRRs: number[] = [];

    allStats.forEach((trade) => {
      if (!trade.break_even) {
        if (trade.trade_outcome === 'Win') {
          nonBEWins++;
        } else if (trade.trade_outcome === 'Lose') {
          nonBELosses++;
        }
      }
      if (trade.risk_reward_ratio != null && trade.risk_reward_ratio > 0) {
        validRRs.push(trade.risk_reward_ratio);
      }
    });

    const totalTrades = allStats.length;
    const denomExBE = nonBEWins + nonBELosses;
    const winRate = denomExBE > 0 ? (nonBEWins / denomExBE) * 100 : 0;
    const avgRR = validRRs.length > 0 ? validRRs.reduce((a, b) => a + b, 0) / validRRs.length : 0;
    const totalRR = calculateRRStats(allStats);

    return {
      totalTrades,
      winRate,
      avgRR,
      totalRR,
    };
  } catch (error) {
    console.error('Error in getStrategyStatsFromTrades:', error);
    return null;
  }
}

/** Lightweight trade list for linking insights to trades (e.g. in Insight Vault). */
export type TradeForNoteLinking = {
  id: string;
  mode: 'live' | 'backtesting' | 'demo';
  trade_date: string;
  market: string;
  direction: string;
  trade_outcome: string;
  strategy_id: string | null;
  strategy_name: string | null;
};

const TRADES_FOR_NOTE_LINKING_PAGE_SIZE = 50;

export type GetTradesForNoteLinkingResult = {
  trades: TradeForNoteLinking[];
  nextOffset: number | undefined;
};

export async function getTradesForNoteLinking(
  userId: string,
  mode: 'live' | 'backtesting' | 'demo',
  options?: {
    strategyIds?: string[];
    accountId?: string | null;
    limit?: number;
    offset?: number;
  }
): Promise<GetTradesForNoteLinkingResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  if (options?.accountId) {
    const { getAccountsForMode } = await import('@/lib/server/accounts');
    const accounts = await getAccountsForMode(userId, mode);
    if (!accounts.some((a) => a.id === options.accountId)) {
      return { trades: [], nextOffset: undefined };
    }
  }

  const pageSize = Math.min(options?.limit ?? TRADES_FOR_NOTE_LINKING_PAGE_SIZE, 100);
  const offset = options?.offset ?? 0;
  const tableName = `${mode}_trades`;

  // Fetch one extra to know if there are more
  let query = supabase
    .from(tableName)
    .select(`
      id,
      trade_date,
      market,
      direction,
      trade_outcome,
      strategy_id,
      strategy:strategies(name)
    `)
    .eq('user_id', userId)
    .order('trade_date', { ascending: false })
    .range(offset, offset + pageSize); // request pageSize+1 items

  if (options?.accountId) {
    query = query.eq('account_id', options.accountId);
  }
  if (options?.strategyIds && options.strategyIds.length > 0) {
    query = query.in('strategy_id', options.strategyIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error in getTradesForNoteLinking:', error);
    return { trades: [], nextOffset: undefined };
  }

  const rows = data || [];
  const hasMore = rows.length > pageSize;
  const trades = (hasMore ? rows.slice(0, pageSize) : rows).map((row: any) => ({
    id: row.id,
    mode,
    trade_date: row.trade_date,
    market: row.market,
    direction: row.direction,
    trade_outcome: row.trade_outcome ?? '',
    strategy_id: row.strategy_id ?? null,
    strategy_name: row.strategy?.name ?? null,
  }));

  return {
    trades,
    nextOffset: hasMore ? offset + pageSize : undefined,
  };
}

/** Fetch full Trade rows by (id, mode) refs. Used for note list (hover + modal) and getNoteById. */
export async function getFullTradesByRefs(
  userId: string,
  refs: Array<{ id: string; mode: 'live' | 'backtesting' | 'demo' }>
): Promise<Trade[]> {
  if (refs.length === 0) return [];
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  const byMode = new Map<string, Array<{ id: string; mode: 'live' | 'backtesting' | 'demo' }>>();
  for (const r of refs) {
    const key = r.mode;
    if (!byMode.has(key)) byMode.set(key, []);
    byMode.get(key)!.push(r);
  }

  type Ref = { id: string; mode: 'live' | 'backtesting' | 'demo' };
  const results: Trade[] = [];
  for (const [mode, refList] of Array.from(byMode.entries())) {
    const ids = refList.map((r: Ref) => r.id);
    const tableName = `${mode}_trades`;
    const { data } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .in('id', ids);

    if (data) {
      for (const row of data as any[]) {
        results.push(mapSupabaseTradeToTrade(row, mode));
      }
    }
  }
  return results;
}
