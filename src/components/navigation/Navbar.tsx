'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Bars3Icon,
  ChartBarIcon,
  DocumentTextIcon,
  PlusCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQueryClient } from '@tanstack/react-query';
import ActionBar from '../shared/ActionBar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { CreateAccountAlertDialog } from '../CreateAccountModal';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useAccounts } from '@/hooks/useAccounts';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: userData, isLoading: userLoading } = useUserDetails();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (userData?.user) setIsSigningOut(false);
  }, [userData?.user]);

   const { selection, setSelection } = useActionBarSelection();

    // 👇 useAccounts here ONLY to get refetch; same key as ActionBar
    const { refetch: refetchAccounts } = useAccounts({
      userId: userData?.user?.id,
      pendingMode: selection.mode,
    });

    useEffect(() => {
      if (userData?.user) setIsSigningOut(false);
    }, [userData?.user]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
    <nav className="fixed top-4 left-0 right-0 z-50 mx-auto w-full max-w-(--breakpoint-xl)">
      <div className="mx-4 sm:mx-0 rounded-xl border bg-background">
        <div className="flex items-center px-3 py-2">
          <Link
            href="/"
            className="ml-1 mr-2 flex items-center gap-2 font-semibold"
          >
            {/* Consider next/image if you prefer */}
            <div className="grid h-10 w-10 place-content-center rounded-xl bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 border border-slate-300">
              {/* Candlestick chart icon for trading (custom SVG) */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                className="h-6 w-6"
              >
                <rect x="5" y="6" width="3" height="12" rx="1" className="fill-slate-500" />
                <rect x="12.5" y="3" width="3" height="18" rx="1" className="fill-slate-600" />
                <rect x="20" y="10" width="3" height="8" rx="1" className="fill-slate-400" />
                {/* Top wicks */}
                <rect x="6.25" y="4" width="0.5" height="2" rx="0.25" className="fill-slate-400" />
                <rect x="13.75" y="1" width="0.5" height="2" rx="0.25" className="fill-slate-400" />
                <rect x="21.25" y="8" width="0.5" height="2" rx="0.25" className="fill-slate-300" />
                {/* Bottom wicks */}
                <rect x="6.25" y="18" width="0.5" height="2" rx="0.25" className="fill-slate-400" />
                <rect x="13.75" y="21" width="0.5" height="2" rx="0.25" className="fill-slate-400" />
                <rect x="21.25" y="18" width="0.5" height="2" rx="0.25" className="fill-slate-300" />
              </svg>
            </div>
            <span className="hidden sm:inline">Trading Tracker</span>
          </Link>

          <Separator orientation="vertical" className="mx-3 hidden h-6 lg:flex" />

          {/* Desktop nav */}
          <div className="hidden lg:block">
            <ul className="flex items-center gap-1">
              <li>
                <Button
                  variant={isActive('/analytics') ? 'secondary' : 'ghost'}
                  asChild
                  size="sm"
                  className={cn('gap-2')}
                >
                  <Link href="/analytics">
                    <ChartBarIcon className="h-4 w-4" />
                    <span>Analytics</span>
                  </Link>
                </Button>
              </li>
              <li>
                <Button
                  variant={isActive('/trades/new') ? 'secondary' : 'ghost'}
                  asChild
                  size="sm"
                  className="gap-2"
                >
                  <Link href="/trades/new">
                    <PlusCircleIcon className="h-4 w-4" />
                    <span>New Trade</span>
                  </Link>
                </Button>
              </li>
              <li>
                <Button
                  variant={isActive('/trades') ? 'secondary' : 'ghost'}
                  asChild
                  size="sm"
                  className="gap-2"
                >
                  <Link href="/trades">
                    <DocumentTextIcon className="h-4 w-4" />
                    <span>My Trades</span>
                  </Link>
                </Button>
              </li>
            </ul>
          </div>

          {/* Right actions */}
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <CreateAccountAlertDialog
                onCreated={async (created) => {
                  // refresh accounts list used by ActionBar
                  await refetchAccounts();
                }}
              />

            <Button
              variant="destructive"
              size="sm"
              className="text-white"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing out...
                </span>
              ) : (
                'Sign Out'
              )}
            </Button>
          </div>

          {/* Mobile: sheet trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto lg:hidden"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-5 w-5" />
                ) : (
                  <Bars3Icon className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-2">
                <Button
                  variant={isActive('/analytics') ? 'secondary' : 'ghost'}
                  asChild
                  className="w-full justify-start gap-2"
                >
                  <Link href="/analytics" onClick={() => setMobileMenuOpen(false)}>
                    <ChartBarIcon className="h-4 w-4" />
                    Analytics
                  </Link>
                </Button>

                <Button
                  variant={isActive('/trades/new') ? 'secondary' : 'ghost'}
                  asChild
                  className="w-full justify-start gap-2"
                >
                  <Link href="/trades/new" onClick={() => setMobileMenuOpen(false)}>
                    <PlusCircleIcon className="h-4 w-4" />
                    New Trade
                  </Link>
                </Button>

                <Button
                  variant={isActive('/trades') ? 'secondary' : 'ghost'}
                  asChild
                  className="w-full justify-start gap-2"
                >
                  <Link href="/trades" onClick={() => setMobileMenuOpen(false)}>
                    <DocumentTextIcon className="h-4 w-4" />
                    My Trades
                  </Link>
                </Button>

                <Separator className="my-2" />

                <CreateAccountAlertDialog
                  onCreated={async (created) => {
                    await queryClient.invalidateQueries({
                      predicate: (q) => q.queryKey[0] === 'accounts', // or your exact key
                    });
                  }}
                />

                <Button
                  variant="destructive"
                  className="w-full text-white"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await handleSignOut();
                  }}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Signing out…' : 'Sign Out'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 w-auto">
      <div className="inline-block mx-4 bg-background border rounded-xl px-3 pb-2 pt-2">
        <ActionBar />
      </div>
    </div>
  </>
  );
}
