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

/**
 * Gets all accounts for a user and mode (for ActionBar dropdown, etc.).
 */
export async function getAccountsForMode(
  userId: string,
  mode: AccountMode = 'live'
): Promise<AccountRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('account_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching accounts for mode:', error);
    return [];
  }
  return (data ?? []) as AccountRow[];
}

/**
 * Creates a new account for the current user (server-side only; user_id from session).
 */
export async function createAccount(params: {
  name: string;
  account_balance: number;
  currency: string;
  mode: AccountMode;
  description: string | null;
}): Promise<{ data: AccountRow | null; error: { message: string } | null }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

  const { data, error } = await supabase
    .from('account_settings')
    .insert({
      user_id: user.id,
      name: params.name,
      account_balance: params.account_balance,
      currency: params.currency,
      mode: params.mode,
      description: params.description,
      is_active: false,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating account:', error);
    return { data: null, error: { message: error.message ?? 'Failed to create account' } };
  }
  return { data: data as AccountRow, error: null };
}
