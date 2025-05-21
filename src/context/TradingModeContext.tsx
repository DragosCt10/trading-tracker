'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useUserDetails } from '@/hooks/useUserDetails';
import { createClient } from '@/utils/supabase/client';

interface AccountSetting {
  id: string;
  name: string;
  account_balance: number;
  currency: string;
  is_active: boolean;
  mode: string;
}

interface TradingModeContextType {
  mode: string;
  setMode: (mode: string) => void;
  activeAccount: AccountSetting | null;
  refreshActiveAccount: () => Promise<void>;
  isLoading: boolean;
}

const TradingModeContext = createContext<TradingModeContextType | undefined>(undefined);

export function TradingModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<string>('live');
  const queryClient = useQueryClient();
  const { data: userDetails } = useUserDetails();
  const supabase = createClient();

  // Query for active account (still via FastAPI)
  const { data: activeAccount, isLoading, isFetching } = useQuery({
    queryKey: ['activeAccount', userDetails?.user?.id],
    queryFn: async () => {
      if (!userDetails?.user) return null;
      const { data, error } = await supabase
        .from('account_settings')
        .select('*')
        .eq('user_id', userDetails.user.id)
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') { // ignore "no rows" error
        throw new Error('Failed to fetch active account: ' + error.message);
      }
      return data || null;
    },
    enabled: !!userDetails?.user?.id,
  });

  // Mutation for setting mode and updating active account
  const setModeMutation = useMutation({
    mutationFn: async (newMode: string) => {
      if (!userDetails?.user) return;

      // PATCH logic: Use Supabase client directly
      // 1. Deactivate all accounts for the user
      await supabase
        .from('account_settings')
        .update({ is_active: false })
        .eq('user_id', userDetails.user.id);

      // 2. Find the most recent account for the new mode
      const { data: accounts, error } = await supabase
        .from('account_settings')
        .select('*')
        .eq('user_id', userDetails.user.id)
        .eq('mode', newMode)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching accounts:', error);
        return;
      }

      // 3. Activate the most recent account for the new mode
      if (accounts && accounts.length > 0) {
        await supabase
          .from('account_settings')
          .update({ is_active: true })
          .eq('id', accounts[0].id);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch active account
      queryClient.invalidateQueries({ queryKey: ['activeAccount'] });
      localStorage.removeItem(`new-trade-draft-${mode}`);
    }
  });

  const setMode = async (newMode: string) => {
    setModeState(newMode);
    await setModeMutation.mutateAsync(newMode);
  };

  const refreshActiveAccount = async () => {
    await queryClient.invalidateQueries({ queryKey: ['activeAccount'] });
    localStorage.removeItem(`new-trade-draft-${mode}`);
  };

  return (
    <TradingModeContext.Provider value={{ 
      mode: mode || 'live', // Provide a fallback value for the mode
      setMode, 
      activeAccount: activeAccount || null,
      refreshActiveAccount,
      isLoading: isLoading || isFetching || setModeMutation.isPending
    }}>
      {children}
    </TradingModeContext.Provider>
  );
}

export function useTradingMode() {
  const context = useContext(TradingModeContext);
  if (context === undefined) {
    throw new Error('useTradingMode must be used within a TradingModeProvider');
  }
  return context;
} 