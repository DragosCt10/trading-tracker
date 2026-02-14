import { getAccountsForMode } from '@/lib/server/accounts';
import type { AccountRow } from '@/lib/server/accounts';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type Mode = 'live' | 'backtesting' | 'demo';

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

    // Server-side fetch: no client Supabase call
    queryFn: async (): Promise<AccountRow[]> => {
      if (!userId || !pendingMode) return [];
      return getAccountsForMode(userId, pendingMode);
    },
  });

  return {
    accounts: query.data ?? [],
    accountsLoading: query.isFetching,
    refetchAccounts: query.refetch, // manual refresh when you want
    ...query,
  };
}
