'use client';

import type { Database } from '@/types/supabase';
import type { TradingMode } from '@/types/trade';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

type UseStrategyClientContextParams = {
  initialUserId: string;
  initialMode: TradingMode;
  initialActiveAccount: AccountRow | null;
};

/**
 * Shared context for strategy-scoped client components (/stats,
 * /strategy/[strategy]/* subroutes). Wraps `useActionBarSelection` and
 * `useUserDetails` so every consumer gets the same view of the active user
 * and account.
 *
 * The `initialUserId` / `initialMode` / `initialActiveAccount` props are
 * the server-resolved values at page-load time. AppLayout seeds the
 * selection store via `initSelectionFor` on first paint so selection is
 * always populated by the time these consumers read it. The hook MUST NOT
 * fall back to `initialActiveAccount` when the store's selection is null:
 * a null selection means the user just deleted the active account (or
 * some other transition), and the ActionBar auto-apply effect is about to
 * pick a fresh target. Substituting the stale `initialActiveAccount` here
 * would resurrect a deleted row.
 */
export function useStrategyClientContext({
  initialUserId,
  initialMode,
  initialActiveAccount,
}: UseStrategyClientContextParams) {
  const { data: userDetails, isLoading: userLoading } = useUserDetails();
  const { selection, setSelection, actionBarloading } = useActionBarSelection();

  const userId = userDetails?.user?.id ?? initialUserId;
  // Read selection directly from the store. No fallback to initial props —
  // those snapshots become stale after any account mutation and restoring
  // them can resurrect deleted rows.
  const mode = selection.mode;
  const activeAccount = selection.activeAccount;

  const isInitialContext =
    mode === initialMode && activeAccount?.id === initialActiveAccount?.id;

  return {
    userDetails,
    userLoading,
    selection,
    setSelection,
    actionBarloading,
    userId,
    mode,
    activeAccount,
    isInitialContext,
  };
}
