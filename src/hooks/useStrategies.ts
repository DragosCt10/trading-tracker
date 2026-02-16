import { getUserStrategies } from '@/lib/server/strategies';
import type { Strategy } from '@/types/strategy';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface UseStrategiesOptions {
  userId?: string;
}

export function useStrategies({ userId }: UseStrategiesOptions) {
  const queryClient = useQueryClient();
  const key = ['strategies:list', userId] as const;

  // If cache exists, we won't auto-fetch.
  const cached = queryClient.getQueryData<Strategy[]>(key);
  const shouldAutoFetch = !!userId && !cached;

  const query = useQuery<Strategy[]>({
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
    queryFn: async (): Promise<Strategy[]> => {
      if (!userId) return [];
      return getUserStrategies(userId);
    },
  });

  return {
    strategies: query.data ?? [],
    strategiesLoading: query.isFetching,
    refetchStrategies: query.refetch, // manual refresh when you want
    ...query,
  };
}
