'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from './supabaseAdmin';
import { Trade } from '@/types/trade';
import type { ParsedTrade } from '@/utils/tradeImportParser';
import { getAccountsForMode } from '@/lib/server/accounts';
import { getCachedUserSession } from '@/lib/server/session';
import { calculateRRStats } from '@/utils/calculateRMultiple';
import { ensureOfferNotification, checkTradeMilestones } from '@/lib/server/feedNotifications';
import { validateTradeFields } from '@/utils/validateTradeFields';
import { getRemainingTrades } from '@/lib/server/subscription';

/**
 * Normalizes trade_screens from DB. Falls back to legacy trade_link / liquidity_taken
 * columns for rows not yet migrated.
 */
function normalizeTradeScreens(raw: unknown, fallbackLink?: string, fallbackLiq?: string): string[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return [raw[0] ?? '', raw[1] ?? '', raw[2] ?? '', raw[3] ?? ''];
  }
  return [fallbackLink ?? '', fallbackLiq ?? '', '', ''];
}

/** Normalizes per-screen timeframe metadata to 4 slots. */
function normalizeTradeScreenTimeframes(raw: unknown): string[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return [raw[0] ?? '', raw[1] ?? '', raw[2] ?? '', raw[3] ?? ''];
  }
  return ['', '', '', ''];
}

/**
 * Maps Supabase trade data to Trade type
 */
function mapSupabaseTradeToTrade(trade: any, mode: 'live' | 'backtesting' | 'demo'): Trade {
  return {
    id: trade.id,
    user_id: trade.user_id,
    account_id: trade.account_id,
    mode: mode,
    trade_screens: normalizeTradeScreens(trade.trade_screens, trade.trade_link, trade.liquidity_taken),
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
    tags: trade.tags ?? [],
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
  /** Optional: override page size (default 500). Calendar uses a higher value to reduce round-trips for heavy months (audit 2.2). */
  limit: limitParam,
}: {
  userId: string;
  accountId: string;
  mode: 'live' | 'backtesting' | 'demo';
  startDate: string;
  endDate: string;
  /** When true, include trades where executed=false (e.g. for Trades page filter) */
  includeNonExecuted?: boolean;
  /** When true, return only trades where executed=false (e.g. for analytics non-executed list) */
  onlyNonExecuted?: boolean;
  /** Optional: Filter trades by strategy_id */
  strategyId?: string | null;
  /** Optional: page size for pagination (default 500, max 2000) */
  limit?: number;
}): Promise<Trade[]> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) throw new Error('Unauthorized');

  const supabase = await createClient();
  // Default to 2000 (max) so large datasets need fewer round-trips.
  const limit = Math.min(Math.max(limitParam ?? 2000, 1), 2000);

  const buildQuery = (q: any) => {
    let query = q
      .from(`${mode}_trades`)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .gte('trade_date', startDate)
      .lte('trade_date', endDate);

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
    // Fetch first page and total count in a single request.
    const { data: firstPage, error, count } = await buildQuery(supabase).range(0, limit - 1);
    if (error) throw error;

    const totalCount = count || 0;
    const firstPageData: any[] = firstPage || [];

    // All trades fit in the first page — done.
    if (totalCount <= limit) {
      return firstPageData.map((t) => mapSupabaseTradeToTrade(t, mode));
    }

    // Fetch all remaining pages concurrently instead of sequentially.
    // Sequential: 20 requests × 250 ms = 5 s for 10k trades.
    // Concurrent: max ~4 requests in parallel ≈ 250 ms total.
    const remainingOffsets: number[] = [];
    for (let offset = limit; offset < totalCount; offset += limit) {
      remainingOffsets.push(offset);
    }

    const remainingResults = await Promise.all(
      remainingOffsets.map((offset) =>
        buildQuery(supabase).range(offset, offset + limit - 1)
      )
    );

    const allRaw = [
      ...firstPageData,
      ...remainingResults.flatMap((r) => r.data || []),
    ];

    return allRaw.map((t) => mapSupabaseTradeToTrade(t, mode));
  } catch (error) {
    console.error('Error in getFilteredTrades:', error);
    return [];
  }
}

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
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };

  const supabase = await createClient();
  // Ensure the account belongs to the session user (defense in depth)
  const userAccounts = await getAccountsForMode(user.id, params.mode);
  if (!userAccounts.some((a) => a.id === params.account_id)) {
    return { error: { message: 'Account not found or access denied' } };
  }

  const remaining = await getRemainingTrades(user.id, params.mode);
  if (remaining === 0) {
    return { error: { message: 'TRADE_LIMIT_REACHED' } };
  }

  const tableName = `${params.mode}_trades`;
  const row: Record<string, unknown> = {
    ...params.trade,
    user_id: user.id,
    account_id: params.account_id,
    calculated_profit: params.calculated_profit,
    pnl_percentage: params.pnl_percentage,
  };
  // Omit columns not present in DB schema (add migration if you add trade_executed_at to DB)
  delete row.trade_executed_at;
  // Remove legacy URL columns (superseded by trade_screens JSONB)
  delete row.trade_link;
  delete row.liquidity_taken;

  const fieldError = validateTradeFields(row);
  if (fieldError) {
    return { error: { message: fieldError } };
  }

  const { error } = await supabase.from(tableName).insert([row] as any);

  if (error) {
    console.error('Error creating trade:', error);
    return { error: { message: error.message ?? 'Failed to create trade' } };
  }

  if (params.trade.executed) {
    void triggerOfferNotifications(user.id, params.account_id, params.mode);
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
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };

  const supabase = await createClient();
  const payload = { ...updateData } as Record<string, unknown>;
  delete payload.rr_hit_1_4; // Column removed from DB
  delete payload.trade_executed_at; // Omit if column not in DB schema
  delete payload.trade_link; // Superseded by trade_screens
  delete payload.liquidity_taken; // Superseded by trade_screens

  const fieldError = validateTradeFields(payload);
  if (fieldError) {
    return { error: { message: fieldError } };
  }

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
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };

  const supabase = await createClient();
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
export async function moveTradestoStrategy(
  tradeIds: string[],
  newStrategyId: string,
  mode: 'live' | 'backtesting' | 'demo'
): Promise<{ error: { message: string } | null }> {
  if (tradeIds.length === 0) return { error: null };
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };

  const supabase = await createClient();
  const { error } = await supabase.rpc('move_trades_to_strategy', {
    p_trade_ids: tradeIds,
    p_new_strategy_id: newStrategyId,
    p_mode: mode,
    p_user_id: user.id,
  });

  if (error) {
    console.error('Error moving trades to strategy:', error);
    return { error: { message: error.message ?? 'Failed to move trades' } };
  }
  return { error: null };
}

export async function deleteTrades(
  tradeIds: string[],
  mode: 'live' | 'backtesting' | 'demo'
): Promise<{ error: { message: string } | null }> {
  if (tradeIds.length === 0) {
    return { error: null };
  }
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };

  const supabase = await createClient();
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
  trades: ParsedTrade[];
}): Promise<{
  inserted: number;
  failed: Array<{ row: number; reason: string }>;
}> {
  const { user } = await getCachedUserSession();
  if (!user) throw new Error('Unauthorized');

  const userAccounts = await getAccountsForMode(user.id, params.mode);
  if (!userAccounts.some((a) => a.id === params.account_id)) {
    throw new Error('Account not found or access denied');
  }

  // Check monthly trade limit and cap import to remaining capacity
  const remaining = await getRemainingTrades(user.id, params.mode);
  if (remaining === 0) {
    return {
      inserted: 0,
      failed: params.trades.map((_, i) => ({
        row: i + 1,
        reason: 'Monthly trade limit reached. Upgrade to PRO for unlimited trades.',
      })),
    };
  }

  const supabase = await createClient();
  const tableName = `${params.mode}_trades`;
  const CHUNK_SIZE = 100;
  let inserted = 0;
  const failed: Array<{ row: number; reason: string }> = [];

  // Validate and prepare rows for insertion
  const validRows: { index: number; row: Record<string, unknown> }[] = [];
  params.trades.forEach((trade, index) => {
    const row: Record<string, unknown> = {
      ...trade,
      user_id: user.id,
      account_id: params.account_id,
      strategy_id: params.strategy_id,
    };
    delete row.trade_executed_at; // Omit if column not in DB schema
    delete row.trade_link; // Superseded by trade_screens
    delete row.liquidity_taken; // Superseded by trade_screens

    const fieldError = validateTradeFields(row);
    if (fieldError) {
      failed.push({ row: index + 1, reason: fieldError });
      return;
    }
    validRows.push({ index, row });
  });

  // Cap to remaining monthly capacity (if limited)
  if (remaining !== null && validRows.length > remaining) {
    const excess = validRows.splice(remaining);
    excess.forEach((v) => {
      failed.push({ row: v.index + 1, reason: 'Monthly trade limit reached. Upgrade to PRO for unlimited trades.' });
    });
  }

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

  const hasExecuted = params.trades.some((t) => t.executed);
  if (hasExecuted && inserted > 0) {
    void triggerOfferNotifications(user.id, params.account_id, params.mode);
  }

  return { inserted, failed };
}

async function triggerOfferNotifications(
  userId: string,
  accountId: string,
  mode: 'live' | 'demo' | 'backtesting',
): Promise<void> {
  try {
    const supabase = await createClient();

    // social_profiles.id ≠ auth.users.id — must resolve via user_id FK
    const { data: profileRow } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profileRow) return;

    const profileId = (profileRow as { id: string }).id;

    // pro_3mo_discount: fires on first executed trade ever (ensureOfferNotification is idempotent)
    void ensureOfferNotification(profileId, 'pro_3mo_discount');

    // trade_milestone_10: fires once when (account, mode) executed count hits 10
    const table = `${mode}_trades` as const;
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .neq('executed', false);
    if ((count ?? 0) >= 10) {
      void ensureOfferNotification(profileId, 'trade_milestone_10');
    }
    if ((count ?? 0) >= 15) {
      void ensureOfferNotification(profileId, 'ai_vision_ready');
    }

    // Trade milestone badges (100, 200, 500, 750, 1000+)
    void checkTradeMilestones(profileId, userId);
  } catch {
    // Fire-and-forget — never throw
  }
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
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) throw new Error('Unauthorized');

  const supabase = await createClient();
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
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) throw new Error('Unauthorized');

  if (options?.accountId) {
    const { getAccountsForMode } = await import('@/lib/server/accounts');
    const accounts = await getAccountsForMode(userId, mode);
    if (!accounts.some((a) => a.id === options.accountId)) {
      return { trades: [], nextOffset: undefined };
    }
  }

  const supabase = await createClient();
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
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) throw new Error('Unauthorized');

  const supabase = await createClient();
  const byMode = new Map<'live' | 'backtesting' | 'demo', Array<{ id: string; mode: 'live' | 'backtesting' | 'demo' }>>();
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

/**
 * Returns the number of trades for an account. Used to decide if account balance
 * can be edited (balance is locked once the account has trades).
 */
export async function getTradeCountForAccount(
  accountId: string,
  mode: 'live' | 'backtesting' | 'demo'
): Promise<number> {
  const { user } = await getCachedUserSession();
  if (!user) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from(`${mode}_trades`)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('account_id', accountId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Bulk-updates tags on a set of trades (add and/or remove) for the current user.
 * Tags are normalized (lowercase + trim) before applying.
 */
export async function bulkUpdateTradeTags(params: {
  tradeIds: string[];
  tagsToAdd: string[];
  tagsToRemove: string[];
  accountId: string;
  mode: 'live' | 'backtesting' | 'demo';
}): Promise<{ error: { message: string } | null }> {
  if (params.tradeIds.length === 0) return { error: null };

  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };

  const normalizedAdd = params.tagsToAdd.map(t => t.toLowerCase().trim()).filter(Boolean);
  const normalizedRemove = params.tagsToRemove.map(t => t.toLowerCase().trim()).filter(Boolean);

  const supabase = await createClient();
  const tableName = `${params.mode}_trades`;

  // Fetch current tags for the selected trades
  const { data: rows, error: fetchError } = await supabase
    .from(tableName)
    .select('id, tags')
    .in('id', params.tradeIds)
    .eq('user_id', user.id)
    .eq('account_id', params.accountId) as any;

  if (fetchError) {
    console.error('Error fetching trades for bulk tag update:', fetchError);
    return { error: { message: fetchError.message ?? 'Failed to fetch trades' } };
  }

  const updates = (rows ?? []).map((row: { id: string; tags: string[] | null }) => {
    let current: string[] = row.tags ?? [];
    // Apply adds (deduplicated)
    for (const tag of normalizedAdd) {
      if (!current.includes(tag)) current = [...current, tag];
    }
    // Apply removes
    current = current.filter(t => !normalizedRemove.includes(t));
    return { id: row.id, tags: current };
  });

  // Upsert each trade's tags individually (Supabase doesn't support per-row updates in bulk)
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ tags: update.tags, updated_at: new Date().toISOString() })
      .eq('id', update.id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating trade tags in bulk:', updateError);
      return { error: { message: updateError.message ?? 'Failed to update trade tags' } };
    }
  }

  return { error: null };
}
