"use client";

import type { AccountRow } from '@/lib/server/accounts';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Navbar from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import ActionBar from '@/components/shared/ActionBar';

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
  const pathname = usePathname();
  const userId = initialUserDetails?.user?.id;
  const showActionBar = pathname === '/strategies' || (pathname?.startsWith('/strategy/') ?? false);

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
        {showActionBar && (
          <div className="fixed top-20 left-1/2 z-40 w-auto max-w-[calc(100vw-2rem)] -translate-x-1/2 transform">
            <div className="inline-block mx-2 sm:mx-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 px-2 sm:px-3 pb-2 pt-2">
              <ActionBar />
            </div>
          </div>
        )}
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </>
  );
}
