'use server';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getCachedUserSession } from '@/lib/server/session';
import { canAddAccount } from '@/lib/server/subscription';
import type { Database } from '@/types/supabase';
import type { SavedNewsItem } from '@/types/account-settings';
import {
  lastAccountModeCookieName,
  lastAccountIndexCookieName,
} from '@/constants/lastAccountCookie';

export type AccountRow = Database['public']['Tables']['account_settings']['Row'];

import type { TradingMode } from '@/types/trade';

export type AccountMode = TradingMode;

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

  // If mode or balance is changing, check if account has trades (immutable after first trade)
  const { data: existing } = await supabase
    .from('account_settings')
    .select('mode, account_balance')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single();

  if (existing && (params.mode !== existing.mode || params.account_balance !== existing.account_balance)) {
    const { count: tradeCount } = await supabase
      .from(`${existing.mode}_trades`)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('account_id', accountId);

    if ((tradeCount ?? 0) > 0) {
      return { data: null, error: { message: 'Cannot change mode or balance when trades exist.' } };
    }
  }

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
 * The last account cannot be deleted — users must always have at least one account.
 */
export async function deleteAccount(
  accountId: string
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };
  const supabase = await createClient();

  // Guard: prevent deleting the user's last account (must always have at least one)
  const { count: totalCount } = await supabase
    .from('account_settings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if ((totalCount ?? 0) <= 1) {
    return { error: { message: 'You must keep at least one account.' } };
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
 * Ensures a specific user has at least one account across all modes.
 * If they have none, creates a default "Account Name" demo account.
 */
export async function ensureDefaultAccountForUserId(userId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { count, error } = await supabase
    .from('account_settings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error || (count ?? 0) > 0) return;

  await supabase.from('account_settings').insert({
    user_id: userId,
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
 *
 * Explicit column list instead of SELECT * — declare what the consumers read
 * so the query stays stable as the schema grows. The dashboard-publishing
 * columns (`dashboard_hash`, `is_dashboard_public`) are omitted because
 * ActionBar and its downstream modals never touch them; they are fetched
 * separately by the dashboard-sharing flow.
 */
const ACCOUNT_SELECTOR_COLUMNS =
  'id, user_id, name, mode, currency, account_balance, is_active, description, created_at, updated_at';

export async function getAllAccountsForUser(userId: string): Promise<AccountRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('account_settings')
    .select(ACCOUNT_SELECTOR_COLUMNS)
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
 * Reads the userId-scoped `tt_last_mode_<userId>` + `tt_last_index_<userId>`
 * cookies so a different user signing in on the same device does not inherit
 * the previous user's selection (multi-tenancy fix 2026-04-09).
 *
 * Uses getCachedAllAccountsForUser — no extra DB call when layout already fetched it.
 */
export async function resolveActiveAccountFromCookies(
  userId: string,
): Promise<{ mode: AccountMode; activeAccount: AccountRow | null }> {
  const allAccounts = await getCachedAllAccountsForUser(userId);

  const cookieStore = await cookies();
  const lastMode = cookieStore.get(lastAccountModeCookieName(userId))?.value;
  const lastIndexStr = cookieStore.get(lastAccountIndexCookieName(userId))?.value;

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
 * Sets the active account for a mode.
 *
 * Backed by the `account_settings_exclusive_active_trg` BEFORE UPDATE trigger
 * and the `account_active_per_user_mode` partial unique index added in the
 * 20260409160000 migration. The trigger clears sibling `is_active` rows in the
 * same (user_id, mode) slice; the partial unique index prevents concurrent
 * double-active rows.
 *
 * Critical: the `.eq('user_id', user.id)` clause is part of the UPDATE's WHERE,
 * gating ANY write on the caller owning the target row. This fixes the prior
 * authorization-ordering bug where a 2-step clear-then-set could wipe the
 * caller's active flag even when the set step failed on a forged accountId.
 *
 * Passing `accountId = null` explicitly clears all is_active flags for the
 * caller in this mode (used when deleting the currently active account).
 */
export async function setActiveAccount(
  mode: AccountMode,
  accountId: string | null
): Promise<{ data: AccountRow | null; error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { data: null, error: { message: 'Unauthorized' } };
  const supabase = await createClient();

  if (!accountId) {
    // Explicit deactivation path — narrowed to caller's own rows.
    const { error } = await supabase
      .from('account_settings')
      .update({ is_active: false } as never)
      .eq('user_id', user.id)
      .eq('mode', mode);
    if (error) {
      console.error('Error clearing active account:', error);
      return { data: null, error: { message: error.message ?? 'Failed to clear active account' } };
    }
    return { data: null, error: null };
  }

  // Single atomic UPDATE. The trigger clears siblings; the WHERE clause gates
  // the write on the caller's user_id so a forged accountId simply matches 0
  // rows and leaves the state untouched.
  const { data, error } = await supabase
    .from('account_settings')
    .update({ is_active: true } as never)
    .eq('id', accountId)
    .eq('user_id', user.id)
    .eq('mode', mode)
    .select('*')
    .single();

  if (error) {
    console.error('Error setting active account:', error);
    return { data: null, error: { message: error.message ?? 'Failed to set active account' } };
  }

  return { data: data as AccountRow, error: null };
}
