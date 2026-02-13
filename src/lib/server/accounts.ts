'use server';

import { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types/supabase';

export type AccountRow = Database['public']['Tables']['account_settings']['Row'];

export type AccountMode = 'live' | 'backtesting' | 'demo';

/**
 * Gets the active account for a given mode.
 * Prefers the account marked is_active in the DB; otherwise returns the first account (by created_at).
 * Returns null if the user has no accounts for that mode.
 */
export async function getActiveAccountForMode(
  userId: string,
  mode: AccountMode = 'live'
): Promise<AccountRow | null> {
  const supabase = await createClient();

  const { data: accounts, error } = await supabase
    .from('account_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching accounts:', error);
    return null;
  }

  if (!accounts?.length) {
    return null;
  }

  const activeAccount = accounts.find((a) => a.is_active) ?? accounts[0] ?? null;
  return activeAccount as AccountRow;
}
