"use client";

import { useRef, useState, useEffect, useTransition } from 'react';
import clsx from 'clsx';
import type { AccountRow, AccountMode } from '@/lib/server/accounts';
import type { ResolvedSubscription } from '@/types/subscription';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { initSelectionFor } from '@/hooks/useActionBarSelection';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { createPortalUrl } from '@/lib/server/subscription';
import Navbar from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import ActionBar from '@/components/shared/ActionBar';
import { CreateAccountAlertDialog } from '@/components/CreateAccountModal';
import { useSubscription } from '@/hooks/useSubscription';

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
  const router = useRouter();
  const userId = initialUserDetails?.user?.id;
  const { subscription } = useSubscription({ userId });
  const showActionBar = pathname === '/stats' || (pathname?.startsWith('/strategy/') ?? false);

  const [actionBarVisible, setActionBarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [isPortalPending, startPortalTransition] = useTransition();

  function handleUpdatePayment() {
    startPortalTransition(async () => {
      const url = await createPortalUrl();
      if (url) router.push(url);
      else router.push('/settings?tab=billing');
    });
  }

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
  if (initialUserDetails != null && queryClient.getQueryData(queryKeys.userDetails()) === undefined) {
    queryClient.setQueryData(queryKeys.userDetails(), initialUserDetails);
  }
  if (userId != null && queryClient.getQueryData(queryKeys.accounts(userId, initialActiveAccountMode)) === undefined) {
    queryClient.setQueryData(queryKeys.accounts(userId, initialActiveAccountMode), accountsForInitialMode);
  }
  if (userId != null && initialAllAccounts != null && queryClient.getQueryData(queryKeys.accountsAll(userId)) === undefined) {
    queryClient.setQueryData(queryKeys.accountsAll(userId), initialAllAccounts);
  }
  // Seed subscription cache so useSubscription() has data on first render (no loading flash).
  if (userId != null && initialSubscription != null && queryClient.getQueryData(queryKeys.subscription(userId)) === undefined) {
    queryClient.setQueryData(queryKeys.subscription(userId), initialSubscription);
  }

  // Always hydrate selection from server on first paint so client matches server (avoids hydration error
  // when persisted cache had a different mode, e.g. user was on demo then refreshed and server picked live).
  // `initSelectionFor` is a no-op when the user already has a stored selection, so it never clobbers in-session changes.
  if (userId != null && initialActiveAccount !== undefined && initialAllAccounts != null) {
    initSelectionFor(userId, {
      mode: initialActiveAccountMode,
      activeAccount: initialActiveAccount ?? null,
    });
  }

  const isPastDue = (subscription ?? initialSubscription)?.status === 'past_due';

  return (
    <>
      <div className={clsx("max-w-(--breakpoint-xl) mx-auto flex min-h-screen flex-col", isPastDue ? "pt-38 sm:pt-52" : "pt-30 sm:pt-44")}>
        {isPastDue && (
          <div className="flex items-center justify-between px-4 py-2 text-sm dark:text-rose-300 text-rose-500 gap-3 rounded-xl border mb-4 z-1 relative border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <span className="font-semibold">Payment failed.</span> Your Pro access is active during the grace period — please update your payment method to avoid interruption.
              </span>
            </div>
            <button
              onClick={handleUpdatePayment}
              disabled={isPortalPending}
              className="shrink-0 themed-btn-primary rounded-lg px-3 py-1 font-medium text-white cursor-pointer border-0 overflow-hidden flex items-center gap-1.5 disabled:opacity-70"
            >
              {isPortalPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Update payment
            </button>
          </div>
        )}
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
        <Footer constrained />
      </div>
    </>
  );
}
