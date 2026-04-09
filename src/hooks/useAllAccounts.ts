'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { getAllAccountsForUser, type AccountRow } from '@/lib/server/accounts';
import { STATIC_DATA } from '@/constants/queryConfig';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Reads the current user's full account list (all modes).
 *
 * This is the single entry point for `['accounts:all', userId]` — the cache
 * key the ActionBar subsystem owns. Consumers that previously called
 * `useQuery({ queryKey: ['accounts:all', userId], queryFn: ... })` should use
 * this hook instead so the queryKey stays centralised in the `queryKeys`
 * factory and so the cache preset (`STATIC_DATA`) stays consistent.
 *
 * Owner: this hook. Consumers: ActionBar, AccountModePopover,
 * EditAccountAlertDialog, CreateAccountModal, AppLayout hydration.
 *
 * AppLayout seeds the cache server-side, so the `initialData` escape hatch
 * is exposed for the first-paint path on pages that render ActionBar with
 * server-provided accounts.
 */
export function useAllAccounts(
  userId: string | undefined,
  options?: { initialData?: AccountRow[] }
) {
  return useQuery<AccountRow[]>({
    queryKey: queryKeys.accountsAll(userId),
    enabled: !!userId,
    initialData: options?.initialData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...STATIC_DATA,
    queryFn: async () => {
      if (!userId) return [];
      return getAllAccountsForUser(userId);
    },
  });
}

/**
 * Invalidate the current user's account list so the next read refetches.
 * Prefer this over calling `queryClient.invalidateQueries(...)` with a bare
 * key string so the key stays in sync with the factory.
 */
export function invalidateAllAccounts(qc: QueryClient, userId: string | undefined) {
  if (!userId) return;
  return qc.invalidateQueries({ queryKey: queryKeys.accountsAll(userId) });
}

/**
 * Patch the cached account list in place (no refetch). Used for optimistic
 * updates after a server mutation returns a canonical row.
 */
export function patchAllAccounts(
  qc: QueryClient,
  userId: string | undefined,
  updater: (rows: AccountRow[]) => AccountRow[]
) {
  if (!userId) return;
  qc.setQueryData<AccountRow[]>(queryKeys.accountsAll(userId), (prev) =>
    prev ? updater(prev) : prev
  );
}
