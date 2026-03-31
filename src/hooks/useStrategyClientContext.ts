'use client';

import { useEffect } from 'react';
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

export function useStrategyClientContext({
  initialUserId,
  initialMode,
  initialActiveAccount,
}: UseStrategyClientContextParams) {
  const { data: userDetails, isLoading: userLoading } = useUserDetails();
  const { selection, setSelection, actionBarloading } = useActionBarSelection();

  const userId = userDetails?.user?.id ?? initialUserId;
  const mode = selection.mode ?? initialMode;
  const activeAccount = selection.activeAccount ?? initialActiveAccount;

  useEffect(() => {
    if (initialActiveAccount && !selection.activeAccount && initialMode) {
      setSelection({ mode: initialMode, activeAccount: initialActiveAccount });
    }
  }, [initialActiveAccount, initialMode, selection.activeAccount, setSelection]);

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
