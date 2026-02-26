'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Returns the number of trades for an account. Used to decide if account balance
 * can be edited (balance is locked once the account has trades).
 */
export async function getTradeCountForAccount(
  accountId: string,
  mode: 'live' | 'backtesting' | 'demo'
): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return 0;

  const { count, error } = await supabase
    .from(`${mode}_trades`)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('account_id', accountId);

  if (error) return 0;
  return count ?? 0;
}
