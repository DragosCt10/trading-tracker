// hooks/useDashboardSelection.ts
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/types/supabase';
import type { TradingMode } from '@/types/trade';
import { useCallback } from 'react';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

type Selection = {
  mode: TradingMode;
  activeAccount: AccountRow | null;
  description?: string;
  name?: string;
};

const KEY = ['actionBar:selection'] as const;

export function useActionBarSelection() {
  const queryClient = useQueryClient();

  // cache-first, never auto-fetch
  const { data, isLoading } = useQuery<Selection>({
    queryKey: KEY,
    queryFn: () => Promise.reject("cache only"),
    enabled: false,
    initialData: () =>
      (queryClient.getQueryData(KEY) as Selection) ??
      { mode: 'live', activeAccount: null },
  });

  const setSelection = useCallback((next: Selection) => {
    queryClient.setQueryData(KEY, next);
  }, [queryClient]);

  return {
    selection: data!,
    setSelection,
    key: KEY,
    actionBarloading: isLoading,
  };
}
