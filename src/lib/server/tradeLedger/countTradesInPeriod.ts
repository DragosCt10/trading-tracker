'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import type { TradeLedgerMode } from '@/lib/tradeLedger/reportConfig';

export interface CountTradesInput {
  mode: TradeLedgerMode;
  accountIds: string[];
  period: { start: string; end: string };
  strategyId?: string | null;
  markets?: string[] | null;
}

export interface CountTradesResult {
  count: number;
  /** True if the query was skipped (unauthenticated or empty inputs). */
  skipped: boolean;
}

/**
 * Returns the number of trades the current user has in the given period
 * and account set. Uses the existing (user_id, account_id, trade_date, ...)
 * composite index — exact count is fine even at 20k rows.
 *
 * Intended for the Trade Ledger builder modal so we can:
 *   - disable the Generate button when the period is empty
 *   - warn before the 20k hard cap
 */
export async function countTradesInPeriod(
  input: CountTradesInput,
): Promise<CountTradesResult> {
  if (input.accountIds.length === 0) {
    return { count: 0, skipped: true };
  }

  const { user } = await getCachedUserSession();
  if (!user) return { count: 0, skipped: true };

  const supabase = await createClient();
  const tableName = `${input.mode}_trades` as const;

  let query = supabase
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('account_id', input.accountIds)
    .gte('trade_date', input.period.start)
    .lte('trade_date', input.period.end);

  if (input.strategyId) {
    query = query.eq('strategy_id', input.strategyId);
  }
  if (input.markets && input.markets.length > 0) {
    query = query.in('market', input.markets);
  }

  const { count, error } = await query;

  if (error) {
    console.error('[TradeLedger] countTradesInPeriod failed', {
      userId: user.id,
      error,
    });
    return { count: 0, skipped: true };
  }

  return { count: count ?? 0, skipped: false };
}
