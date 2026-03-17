'use server';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import { canAddAccount } from '@/lib/server/subscription';
import type { Database } from '@/types/supabase';
import type { SavedNewsItem } from '@/types/account-settings';
import {
  LAST_ACCOUNT_MODE_COOKIE,
  LAST_ACCOUNT_INDEX_COOKIE,
} from '@/constants/lastAccountCookie';

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

/** Request-scoped cache for getAccountsForMode (audit 2.3). */
export const getCachedAccountsForMode = cache(getAccountsForMode);

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
  const { user } = await getCachedUserSession();
  if (!user) return { data: null, error: { message: 'Unauthorized' } };

  const supabase = await createClient();

  const { count: currentCount } = await supabase
    .from('account_settings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const allowed = await canAddAccount(user.id, currentCount ?? 0);
  if (!allowed) {
    return { data: null, error: { message: 'Account limit reached. Upgrade to PRO to create more accounts.' } };
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

/**
 * Updates an account. Only the owner (from session) can update.
 */
export async function updateAccount(
  accountId: string,
  params: {
    name: string;
    account_balance: number;
    currency: string;
    mode: AccountMode;
    description: string | null;
  }
): Promise<{ data: AccountRow | null; error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { data: null, error: { message: 'Unauthorized' } };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('account_settings')
    .update({
      name: params.name,
      account_balance: params.account_balance,
      currency: params.currency,
      mode: params.mode,
      description: params.description,
    })
    .eq('id', accountId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating account:', error);
    return { data: null, error: { message: error.message ?? 'Failed to update account' } };
  }
  return { data: data as AccountRow, error: null };
}

/**
 * Deletes an account. Only the owner (from session) can delete.
 * The last demo account cannot be deleted — users must always have at least one demo account.
 */
export async function deleteAccount(
  accountId: string
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };
  const supabase = await createClient();

  // Guard: prevent deleting the last demo account
  const { data: accountToDelete } = await supabase
    .from('account_settings')
    .select('mode')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single();

  if (accountToDelete?.mode === 'demo') {
    const { count } = await supabase
      .from('account_settings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('mode', 'demo');

    if ((count ?? 0) <= 1) {
      return { error: { message: 'You must keep at least one demo account.' } };
    }
  }

  const { error } = await supabase
    .from('account_settings')
    .delete()
    .eq('id', accountId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting account:', error);
    return { error: { message: error.message ?? 'Failed to delete account' } };
  }
  return { error: null };
}

/**
 * Ensures the user has at least one account across all modes.
 * If they have none, creates a default "Account Name" demo account.
 * Safe to call on every login/signup — no-ops when accounts already exist.
 */
export async function ensureDefaultAccount(): Promise<void> {
  const { user } = await getCachedUserSession();
  if (!user) return;
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('account_settings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error || (count ?? 0) > 0) return;

  await supabase.from('account_settings').insert({
    user_id: user.id,
    name: 'Account Name',
    account_balance: 10000,
    currency: 'USD',
    mode: 'demo',
    description: null,
    is_active: true,
  });
}

/**
 * Gets all accounts for a user across all modes (for the ActionBar grouped dropdown).
 */
export async function getAllAccountsForUser(userId: string): Promise<AccountRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('account_settings')
    .select('*')
    .eq('user_id', userId)
    .order('mode', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching all accounts:', error);
    return [];
  }
  return (data ?? []) as AccountRow[];
}

/** Request-scoped cache for getAllAccountsForUser (audit 2.3). */
export const getCachedAllAccountsForUser = cache(getAllAccountsForUser);

const VALID_MODES: AccountMode[] = ['live', 'demo', 'backtesting'];

/**
 * Resolves the active account and mode for server-side data prefetching.
 * Reads `tt_last_mode` + `tt_last_index` cookies (same logic as AppLayout) so
 * Data fetchers respect the user's selected mode instead of hardcoding 'live'.
 *
 * Uses getCachedAllAccountsForUser — no extra DB call when layout already fetched it.
 */
export async function resolveActiveAccountFromCookies(
  userId: string,
): Promise<{ mode: AccountMode; activeAccount: AccountRow | null }> {
  const allAccounts = await getCachedAllAccountsForUser(userId);

  const cookieStore = await cookies();
  const lastMode = cookieStore.get(LAST_ACCOUNT_MODE_COOKIE)?.value;
  const lastIndexStr = cookieStore.get(LAST_ACCOUNT_INDEX_COOKIE)?.value;

  if (lastMode && VALID_MODES.includes(lastMode as AccountMode)) {
    const accountsForMode = allAccounts.filter((a) => a.mode === lastMode);
    const idx = lastIndexStr != null ? parseInt(lastIndexStr, 10) : 0;
    if (!Number.isNaN(idx) && idx >= 0 && idx < accountsForMode.length) {
      return { mode: lastMode as AccountMode, activeAccount: accountsForMode[idx] };
    }
  }

  // Fallback: live → demo → backtesting
  const fallbackOrder: AccountMode[] = ['live', 'demo', 'backtesting'];
  for (const mode of fallbackOrder) {
    const found =
      allAccounts.find((a) => a.mode === mode && a.is_active) ??
      allAccounts.find((a) => a.mode === mode);
    if (found) return { mode, activeAccount: found };
  }

  return { mode: 'live', activeAccount: null };
}

/**
 * Updates the saved_news JSONB column for an account.
 * Only the owner (from session) can update.
 */
export async function updateAccountSavedNews(
  accountId: string,
  savedNews: SavedNewsItem[]
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };
  const supabase = await createClient();

  const { error } = await supabase
    .from('account_settings')
    .update({ saved_news: savedNews as any })
    .eq('id', accountId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating saved news:', error);
    return { error: { message: error.message ?? 'Failed to update saved news' } };
  }
  return { error: null };
}

/**
 * Sets the active account for a mode (server-side only). Replaces client-side
 * account_settings updates so security does not depend on RLS alone.
 */
export async function setActiveAccount(
  mode: AccountMode,
  accountId: string | null
): Promise<{ data: AccountRow | null; error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { data: null, error: { message: 'Unauthorized' } };
  const supabase = await createClient();

  // Clear active flag for all user's accounts in this mode
  const { error: clearError } = await supabase
    .from('account_settings')
    .update({ is_active: false } as never)
    .eq('user_id', user.id)
    .eq('mode', mode);

  if (clearError) {
    console.error('Error clearing active account:', clearError);
    return { data: null, error: { message: clearError.message ?? 'Failed to set active account' } };
  }

  if (!accountId) {
    return { data: null, error: null };
  }

  // Set the selected account as active (only if it belongs to this user)
  const { data: updated, error: setError } = await supabase
    .from('account_settings')
    .update({ is_active: true } as never)
    .eq('id', accountId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (setError) {
    console.error('Error setting active account:', setError);
    return { data: null, error: { message: setError.message ?? 'Failed to set active account' } };
  }

  return { data: updated as AccountRow, error: null };
}
