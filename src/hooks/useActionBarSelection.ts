// hooks/useDashboardSelection.ts
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/types/supabase';

type Mode = 'live' | 'backtesting' | 'demo';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

type Selection = {
  mode: Mode;
  activeAccount: AccountRow | null;
  description?: string;
  name?: string;
};

const KEY = ['ui', 'actionBarSelection'];

export function useActionBarSelection() {
  const queryClient = useQueryClient();

  // cache-first, never auto-fetch
  const { data, isLoading } = useQuery<Selection>({
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
    actionBarloading: isLoading,    // loading state
  };
}
