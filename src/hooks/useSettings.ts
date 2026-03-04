import { getSettings } from '@/lib/server/settings';
import type { SettingsRow } from '@/lib/server/settings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { STATIC_DATA } from '@/constants/queryConfig';
import { queryKeys } from '@/lib/queryKeys';

interface UseSettingsOptions {
  userId?: string;
}

const DEFAULT_SETTINGS: SettingsRow = {
  saved_news: [],
  saved_markets: [],
};

export function useSettings({ userId }: UseSettingsOptions) {
  const queryClient = useQueryClient();
  const key = queryKeys.settings(userId);

  // If cache exists, we won't auto-fetch.
  const cached = queryClient.getQueryData<SettingsRow>(key);
  const shouldAutoFetch = !!userId && !cached;

  const query = useQuery<SettingsRow>({
    queryKey: key,
    // Only auto-fetch when there is no cache yet.
    enabled: shouldAutoFetch,

    // Seed the query with cache if present (prevents an extra fetch).
    initialData: cached,

    // Never auto-refetch later — you control refresh via refetch()
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...STATIC_DATA,

    // Server-side fetch: no client Supabase call
    queryFn: async (): Promise<SettingsRow> => {
      if (!userId) return DEFAULT_SETTINGS;
      return getSettings(userId);
    },
  });

  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    settingsLoading: query.isFetching,
    refetchSettings: query.refetch, // manual refresh when you want
    ...query,
  };
}
