'use client';

import type { Database } from '@/types/supabase';
import type { TradingMode } from '@/types/trade';
import { useAccounts } from '@/hooks/useAccounts';
import { useStrategyClientContext } from '@/hooks/useStrategyClientContext';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

type UseStrategyDashboardContextParams = {
  initialUserId: string;
  initialMode: TradingMode;
  initialActiveAccount: { id: string; [key: string]: unknown } | null;
};

export function useStrategyDashboardContext({
  initialUserId,
  initialMode,
  initialActiveAccount,
}: UseStrategyDashboardContextParams) {
  const strategyContext = useStrategyClientContext({
    initialUserId,
    initialMode,
    initialActiveAccount: initialActiveAccount as AccountRow | null,
  });

  const { accounts: accountsForMode } = useAccounts({
    userId: strategyContext.userDetails?.user?.id ?? strategyContext.userId,
    pendingMode: strategyContext.selection.mode,
  });

  const candidateAccount = strategyContext.activeAccount;
  const resolvedAccount =
    accountsForMode.length === 0
      ? null
      : candidateAccount && accountsForMode.some((a) => a.id === candidateAccount.id)
        ? candidateAccount
        : null;

  return {
    ...strategyContext,
    accountsForMode,
    resolvedAccount,
  };
}
