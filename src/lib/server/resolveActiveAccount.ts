'use server';

import { getCachedAllAccountsForUser } from '@/lib/server/accounts';
import type { AccountRow, AccountMode } from '@/lib/server/accounts';
import { cookies } from 'next/headers';
import { LAST_ACCOUNT_MODE_COOKIE, LAST_ACCOUNT_INDEX_COOKIE } from '@/constants/lastAccountCookie';

const VALID_MODES: AccountMode[] = ['live', 'demo', 'backtesting'];

export interface ResolvedAccount {
  account: AccountRow | null;
  mode: AccountMode;
}

/**
 * Resolves the active account for a user based on cookie preference,
 * falling back to the first live → demo → backtesting account.
 *
 * Uses React cache() via getCachedAllAccountsForUser — safe to call from
 * both layout.tsx and page.tsx within the same request without extra fetches.
 */
export async function resolveActiveAccount(userId: string): Promise<ResolvedAccount> {
  const allAccounts = await getCachedAllAccountsForUser(userId);

  let account: AccountRow | null = null;
  let mode: AccountMode = 'live';

  // Prefer last selection from cookie (mode + index only, no ids)
  const cookieStore = await cookies();
  const lastMode = cookieStore.get(LAST_ACCOUNT_MODE_COOKIE)?.value;
  const lastIndexStr = cookieStore.get(LAST_ACCOUNT_INDEX_COOKIE)?.value;
  if (lastMode && VALID_MODES.includes(lastMode as AccountMode)) {
    const accountsForMode = allAccounts.filter((a) => a.mode === lastMode);
    const idx = lastIndexStr != null ? parseInt(lastIndexStr, 10) : 0;
    if (!Number.isNaN(idx) && idx >= 0 && idx < accountsForMode.length) {
      account = accountsForMode[idx];
      mode = lastMode as AccountMode;
    }
  }

  // Fallback: live → demo → backtesting
  if (!account) {
    const fallbackOrder: AccountMode[] = ['live', 'demo', 'backtesting'];
    for (const fallbackMode of fallbackOrder) {
      const found =
        allAccounts.find((a) => a.mode === fallbackMode && a.is_active) ??
        allAccounts.find((a) => a.mode === fallbackMode);
      if (found) {
        account = found;
        mode = fallbackMode;
        break;
      }
    }
  }

  return { account, mode };
}
