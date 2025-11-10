import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/supabase';

type Mode = 'live' | 'backtesting' | 'demo';
type AccountRow = Database['public']['Tables']['account_settings']['Row'];

interface UseAccountsOptions {
  userId?: string;
  pendingMode?: Mode;
}

export function useAccounts({ userId, pendingMode }: UseAccountsOptions) {
  const queryClient = useQueryClient();
  const key = ['accounts:list', userId, pendingMode] as const;

  // If cache exists, we won’t auto-fetch.
  const cached = queryClient.getQueryData<AccountRow[]>(key);
  const shouldAutoFetch = !!userId && !!pendingMode && !cached;

  const query = useQuery<AccountRow[]>({
    queryKey: key,
    // Only auto-fetch when there is no cache yet.
    enabled: shouldAutoFetch,

    // Seed the query with cache if present (prevents an extra fetch).
    initialData: cached,

    // Never auto-refetch later — you control refresh via refetch()
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: Infinity,

    queryFn: async (): Promise<AccountRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('account_settings')
        .select('*')
        .eq('user_id', userId!)
        .eq('mode', pendingMode!)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading accounts:', error);
        return [];
      }
      return data ?? [];
    },
  });

  return {
    accounts: query.data ?? [],
    accountsLoading: query.isFetching,
    refetchAccounts: query.refetch, // manual refresh when you want
    ...query,
  };
}
