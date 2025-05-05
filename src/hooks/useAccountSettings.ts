import { AccountSettings } from "@/types/account-settings";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

interface UseAccountSettingsOptions {
  userId: string | null | undefined;
  accessToken?: string;
  mode?: string;
}

export function useAccountSettings({ userId, mode = 'live' }: UseAccountSettingsOptions) {
  const fetchAccountSettings = async (): Promise<AccountSettings[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('account_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('mode', mode)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch account settings: ${error.message}`);
    }

    return data || [];
  };

  const { 
    data: accountSettings, 
    isLoading: loading, 
    error 
  } = useQuery<AccountSettings[], Error>({
    queryKey: ['accountSettings', userId, mode],
    queryFn: fetchAccountSettings,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return { 
    accountSettings: accountSettings || [], 
    loading, 
    error: error ? error.message : null 
  };
}