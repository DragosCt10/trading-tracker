'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useSubscription } from '@/hooks/useSubscription';
import type { SocialProfile } from '@/types/social';
import type { ResolvedSubscription } from '@/types/subscription';

interface SocialUserContextValue {
  userId: string | undefined;
  ownProfile: SocialProfile | null | undefined;
  subscription: ResolvedSubscription | undefined;
}

const SocialUserContext = createContext<SocialUserContextValue | null>(null);

export function SocialUserProvider({ children }: { children: ReactNode }) {
  const { data: userData } = useUserDetails();
  const userId = userData?.user?.id;
  const { data: ownProfile } = useSocialProfile(userId);
  const { subscription } = useSubscription({ userId });

  return (
    <SocialUserContext.Provider value={{ userId, ownProfile, subscription }}>
      {children}
    </SocialUserContext.Provider>
  );
}

export function useSocialUser(): SocialUserContextValue {
  const ctx = useContext(SocialUserContext);
  if (!ctx) throw new Error('useSocialUser must be used inside SocialUserProvider');
  return ctx;
}
