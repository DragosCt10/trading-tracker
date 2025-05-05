import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useEffect } from 'react';

async function fetchUserDetails() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  if (error) throw error;
  return { user, session };
}

export function useUserDetails() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const supabase = createClient();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear user data on sign out
        queryClient.setQueryData(['userDetails'], null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Update user data on sign in or token refresh
        queryClient.setQueryData(['userDetails'], { user: session?.user, session });
      }
    });
    
    // Clean up subscription when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['userDetails'],
    queryFn: fetchUserDetails,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1, // Only retry once on failure
  });
  
  return { data, isLoading, error };
}