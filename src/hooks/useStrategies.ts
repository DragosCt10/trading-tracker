import { getUserStrategies } from '@/lib/server/strategies';
import type { Strategy } from '@/types/strategy';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { STATIC_DATA } from '@/constants/queryConfig';
import { queryKeys } from '@/lib/queryKeys';

interface UseStrategiesOptions {
  userId?: string;
  accountId?: string;
}

export function useStrategies({ userId, accountId }: UseStrategiesOptions) {
  const queryClient = useQueryClient();
  const key = queryKeys.strategies(userId, accountId);

  const cached = queryClient.getQueryData<Strategy[]>(key);
  const shouldAutoFetch = !!userId && !!accountId && !cached;

  const query = useQuery<Strategy[]>({
    queryKey: key,
    enabled: shouldAutoFetch,
    initialData: cached,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...STATIC_DATA,
    queryFn: async (): Promise<Strategy[]> => {
      if (!userId || !accountId) return [];
      return getUserStrategies(userId, accountId);
    },
  });

  return {
    strategies: query.data ?? [],
    strategiesLoading: query.isFetching,
    refetchStrategies: query.refetch,
    ...query,
  };
}
