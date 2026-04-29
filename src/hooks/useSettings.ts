import { getSettings } from '@/lib/server/settings';
import type { SettingsRow } from '@/lib/server/settings';
import { useQuery } from '@tanstack/react-query';
import { STATIC_DATA } from '@/constants/queryConfig';
import { queryKeys } from '@/lib/queryKeys';

interface UseSettingsOptions {
  userId?: string;
}

const DEFAULT_SETTINGS: SettingsRow = {
  saved_news: [],
  saved_markets: [],
  newsletter_subscribed: true,
  custom_futures_specs: [],
  feature_flags: {},
};

export function useSettings({ userId }: UseSettingsOptions) {
  const query = useQuery<SettingsRow>({
    queryKey: queryKeys.settings(userId),
    enabled: !!userId,

    // staleTime: Infinity + refetchOnMount: false prevent auto-refetch on remount.
    // Invalidation still works because the query stays enabled.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...STATIC_DATA,

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
