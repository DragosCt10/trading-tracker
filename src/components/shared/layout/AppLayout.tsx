"use client";

import { useRef } from 'react';
import type { AccountRow, AccountMode } from '@/lib/server/accounts';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Navbar from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import ActionBar from '@/components/shared/ActionBar';
import { CreateAccountAlertDialog } from '@/components/CreateAccountModal';

export type InitialUserDetails = { user: { id: string } | null; session: object | null };

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  initialUserDetails?: InitialUserDetails;
  initialAccountsForLive?: AccountRow[];
  initialAllAccounts?: AccountRow[];
  initialActiveAccount?: AccountRow | null;
  initialActiveAccountMode?: AccountMode;
}

export default function AppLayout({
  children,
  initialUserDetails,
  initialAccountsForLive,
  initialAllAccounts,
  initialActiveAccount,
  initialActiveAccountMode = 'live',
}: AppLayoutProps) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const userId = initialUserDetails?.user?.id;
  const showActionBar = pathname === '/strategies' || (pathname?.startsWith('/strategy/') ?? false);
  const actionBarSelectionHydratedRef = useRef(false);

  // Accounts for the initial active mode — needed so ActionBar seeds the correct
  // ['accounts:list', userId, mode] cache key. Using initialAccountsForLive when the
  // initial mode is 'backtesting'/'demo' would populate that key with [] and prevent
  // useAccounts from ever auto-fetching the real accounts for that mode.
  const accountsForInitialMode =
    initialAllAccounts?.filter((a) => a.mode === initialActiveAccountMode) ??
    initialAccountsForLive ??
    [];

  // Hydrate caches so Navbar/ActionBar and useUserDetails/useAccounts/useActionBarSelection get data on first paint (no client fetch)
  if (initialUserDetails != null && queryClient.getQueryData(['userDetails']) === undefined) {
    queryClient.setQueryData(['userDetails'], initialUserDetails);
  }
  if (userId != null && initialAccountsForLive != null && queryClient.getQueryData(['accounts:list', userId, 'live']) === undefined) {
    queryClient.setQueryData(['accounts:list', userId, 'live'], initialAccountsForLive);
  }
  if (userId != null && initialAllAccounts != null && queryClient.getQueryData(['accounts:all', userId]) === undefined) {
    queryClient.setQueryData(['accounts:all', userId], initialAllAccounts);
  }
  // Hydrate selection on first paint when cache is empty or when cached account is not in current user's
  // accounts (e.g. stale from another user after refresh — avoids showing wrong account name like "FTMO Phase 1").
  if (userId != null && initialActiveAccount !== undefined && initialAllAccounts != null && !actionBarSelectionHydratedRef.current) {
    const existing = queryClient.getQueryData<{ mode: string; activeAccount: { id?: string } | null }>(['actionBar:selection']);
    const existingAccountId = existing?.activeAccount?.id;
    const belongsToCurrentUser = existingAccountId != null && initialAllAccounts.some((a) => a.id === existingAccountId);
    if (!existing?.activeAccount || !belongsToCurrentUser) {
      queryClient.setQueryData(['actionBar:selection'], { mode: initialActiveAccountMode, activeAccount: initialActiveAccount ?? null });
    }
    actionBarSelectionHydratedRef.current = true;
  }

  return (
    <>
      <div className="mt-30 sm:mt-48 max-w-(--breakpoint-xl) mx-auto flex min-h-screen flex-col">
        <Navbar
          centerContent={
            showActionBar ? (
              <ActionBar
                showAddButton={false}
                initialData={
                  userId && initialAccountsForLive && initialAllAccounts
                    ? {
                        userDetails: initialUserDetails ?? null,
                        mode: initialActiveAccountMode,
                        activeAccount: initialActiveAccount ?? null,
                        accountsForMode: accountsForInitialMode,
                        allAccounts: initialAllAccounts,
                      }
                    : undefined
                }
              />
            ) : undefined
          }
          mobileMenuExtra={
            showActionBar ? (
              <CreateAccountAlertDialog
                triggerClassName="w-full justify-start h-9 px-3 text-sm"
              />
            ) : undefined
          }
        />
        {showActionBar && (
          <div className="hidden lg:block fixed top-20 left-1/2 z-40 w-auto max-w-[calc(100vw-2rem)] -translate-x-1/2 transform">
            <div className="inline-block mx-2 sm:mx-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 px-3 sm:px-4 py-3">
              <ActionBar
                initialData={
                  userId && initialAccountsForLive && initialAllAccounts
                    ? {
                        userDetails: initialUserDetails ?? null,
                        mode: initialActiveAccountMode,
                        activeAccount: initialActiveAccount ?? null,
                        accountsForMode: accountsForInitialMode,
                        allAccounts: initialAllAccounts,
                      }
                    : undefined
                }
              />
            </div>
          </div>
        )}
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </>
  );
}
