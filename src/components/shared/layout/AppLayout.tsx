"use client";

import { useRef, useState, useEffect } from 'react';
import clsx from 'clsx';
import type { AccountRow, AccountMode } from '@/lib/server/accounts';
import type { ResolvedSubscription } from '@/types/subscription';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
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
  initialAllAccounts?: AccountRow[];
  initialActiveAccount?: AccountRow | null;
  initialActiveAccountMode?: AccountMode;
  initialSubscription?: ResolvedSubscription;
}

export default function AppLayout({
  children,
  initialUserDetails,
  initialAllAccounts,
  initialActiveAccount,
  initialActiveAccountMode = 'live',
  initialSubscription,
}: AppLayoutProps) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const userId = initialUserDetails?.user?.id;
  const showActionBar = pathname === '/strategies' || (pathname?.startsWith('/strategy/') ?? false);

  const [actionBarVisible, setActionBarVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!showActionBar) return;
    const handleScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;
      if (diff > 6) setActionBarVisible(false);
      else if (diff < -6) setActionBarVisible(true);
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showActionBar]);

  // Accounts for the initial active mode — seeds ['accounts:list', userId, mode] so useAccounts doesn't client-fetch on first paint
  const accountsForInitialMode =
    initialAllAccounts?.filter((a) => a.mode === initialActiveAccountMode) ?? [];

  // Hydrate caches so Navbar/ActionBar and useUserDetails/useAccounts/useActionBarSelection get data on first paint (no client fetch)
  if (initialUserDetails != null && queryClient.getQueryData(['userDetails']) === undefined) {
    queryClient.setQueryData(['userDetails'], initialUserDetails);
  }
  if (userId != null && queryClient.getQueryData(['accounts:list', userId, initialActiveAccountMode]) === undefined) {
    queryClient.setQueryData(['accounts:list', userId, initialActiveAccountMode], accountsForInitialMode);
  }
  if (userId != null && initialAllAccounts != null && queryClient.getQueryData(['accounts:all', userId]) === undefined) {
    queryClient.setQueryData(['accounts:all', userId], initialAllAccounts);
  }
  // Seed subscription cache so useSubscription() has data on first render (no loading flash).
  if (userId != null && initialSubscription != null && queryClient.getQueryData(queryKeys.subscription(userId)) === undefined) {
    queryClient.setQueryData(queryKeys.subscription(userId), initialSubscription);
  }

  // Always hydrate selection from server on first paint so client matches server (avoids hydration error
  // when persisted cache had a different mode, e.g. user was on demo then refreshed and server picked live).
  if (userId != null && initialActiveAccount !== undefined && initialAllAccounts != null && queryClient.getQueryData(['actionBar:selection']) === undefined) {
    queryClient.setQueryData(['actionBar:selection'], { mode: initialActiveAccountMode, activeAccount: initialActiveAccount ?? null });
  }

  return (
    <>
      <div className="pt-30 sm:pt-44 max-w-(--breakpoint-xl) mx-auto flex min-h-screen flex-col">
        <Navbar
          centerContent={
            showActionBar ? (
              <ActionBar
                showAddButton={false}
                initialData={
                  userId && initialAllAccounts != null
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
          <div className={clsx(
            "hidden lg:block fixed top-20 left-1/2 z-40 w-auto max-w-[calc(100vw-2rem)] -translate-x-1/2",
            "transition-all duration-300 ease-in-out",
            actionBarVisible
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-3 pointer-events-none"
          )}>
            <div className="inline-block mx-2 sm:mx-4 rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 px-3 sm:px-4 py-3">
              <ActionBar
                initialData={
                  userId && initialAllAccounts != null
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
