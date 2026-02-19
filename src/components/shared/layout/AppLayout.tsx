"use client";

import type { AccountRow } from '@/lib/server/accounts';
import { useQueryClient } from '@tanstack/react-query';
import { ReactNode } from 'react';
import Navbar from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';

export type InitialUserDetails = { user: { id: string } | null; session: object | null };

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  initialUserDetails?: InitialUserDetails;
  initialAccountsForLive?: AccountRow[];
  initialActiveAccountForLive?: AccountRow | null;
}

export default function AppLayout({
  children,
  initialUserDetails,
  initialAccountsForLive,
  initialActiveAccountForLive,
}: AppLayoutProps) {
  const queryClient = useQueryClient();
  const userId = initialUserDetails?.user?.id;

  // Hydrate caches so Navbar/ActionBar and useUserDetails/useAccounts/useActionBarSelection get data on first paint (no client fetch)
  if (initialUserDetails != null && queryClient.getQueryData(['userDetails']) === undefined) {
    queryClient.setQueryData(['userDetails'], initialUserDetails);
  }
  if (userId != null && initialAccountsForLive != null && queryClient.getQueryData(['accounts:list', userId, 'live']) === undefined) {
    queryClient.setQueryData(['accounts:list', userId, 'live'], initialAccountsForLive);
  }
  if (userId != null && initialActiveAccountForLive !== undefined && queryClient.getQueryData(['actionBar:selection']) === undefined) {
    queryClient.setQueryData(['actionBar:selection'], { mode: 'live' as const, activeAccount: initialActiveAccountForLive ?? null });
  }

  return (
    <>
      <div className="mt-48 max-w-(--breakpoint-xl) mx-auto flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </>
  );
}
