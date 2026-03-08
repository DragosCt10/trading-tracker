import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useEffect } from 'react';
import { USER_DATA } from '@/constants/queryConfig';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Single auth call (getUser only) to match server and reduce Supabase auth requests (audit 1.5).
 * Returns session-shaped { user, session } so consumers keep working.
 */
async function fetchUserDetails() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return { user: user ?? null, session: user ? { user } : null };
}

export function useUserDetails() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const supabase = createClient();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear user data on sign out
        queryClient.setQueryData(queryKeys.userDetails(), null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Update user data on sign in or token refresh
        queryClient.setQueryData(queryKeys.userDetails(), { user: session?.user, session });
      }
    });
    
    // Clean up subscription when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);
  
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.userDetails(),
    queryFn: fetchUserDetails,
    ...USER_DATA,
    retry: 1, // Only retry once on failure
  });
  
  return { data, isLoading, error };
}