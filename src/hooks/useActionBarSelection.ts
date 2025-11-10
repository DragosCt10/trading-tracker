// hooks/useDashboardSelection.ts
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AccountSettings } from '@/types/account-settings';

type Mode = 'live' | 'backtesting' | 'demo';

type Selection = {
  mode: Mode;
  activeAccount: AccountSettings | null; // include anything you need (balance, currency, etc.)
  description?: string;
  name?: string;
};

const KEY = ['ui', 'actionBarSelection'];

export function useActionBarSelection() {
  const queryClient = useQueryClient();

  // cache-first, never auto-fetch
  const { data } = useQuery<Selection>({
    queryKey: KEY,
    queryFn: () => Promise.reject("cache only"),
    enabled: false,
    initialData: { mode: 'live', activeAccount: null, description: '', name: ''},
  });

  const setSelection = (sel: Selection) => {
    queryClient.setQueryData(KEY, sel);
  };

  return {
    selection: data!,      // { mode, activeAccount }
    setSelection,          // writer
    key: KEY,              // (optional) exported key
  };
}
