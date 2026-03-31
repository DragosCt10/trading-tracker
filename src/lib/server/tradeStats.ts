'use server';

import { createAdminClient } from './supabaseAdmin';

/**
 * Counts total executed trades across all 3 mode tables for a user.
 * Uses admin client to bypass RLS.
 */
export async function getTotalExecutedTradeCount(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const tables = ['live_trades', 'demo_trades', 'backtesting_trades'] as const;

  const counts = await Promise.all(
    tables.map(async (table) => {
      const { count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('executed', false);
      return count ?? 0;
    }),
  );

  return counts[0] + counts[1] + counts[2];
}
