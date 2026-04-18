'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import type { TradeLedgerMode } from '@/lib/tradeLedger/reportConfig';

export interface GetUserMarketsInput {
  mode: TradeLedgerMode;
  accountIds: string[];
  period: { start: string; end: string };
  strategyId?: string | null;
}

/**
 * Returns distinct `market` values the user has traded within the given
 * scope. Used by the Trade Ledger builder to populate the market filter
 * without forcing users to pick from the full `ALLOWED_MARKETS` list.
 *
 * Falls back to an empty array on any error — the picker then just shows
 * "No markets in this period".
 */
export async function getUserMarkets(
  input: GetUserMarketsInput,
): Promise<string[]> {
  if (input.accountIds.length === 0) return [];

  const { user } = await getCachedUserSession();
  if (!user) return [];

  const supabase = await createClient();
  const tableName = `${input.mode}_trades` as const;

  let query = supabase
    .from(tableName)
    .select('market')
    .eq('user_id', user.id)
    .in('account_id', input.accountIds)
    .gte('trade_date', input.period.start)
    .lte('trade_date', input.period.end)
    .not('market', 'is', null);

  if (input.strategyId) {
    query = query.eq('strategy_id', input.strategyId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[TradeLedger] getUserMarkets failed', {
      userId: user.id,
      error,
    });
    return [];
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    const m = (row as { market: string | null }).market;
    if (m) set.add(m);
  }
  return [...set].sort();
}
