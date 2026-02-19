'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Menu,
  X,
  LogOut,
  Target,
  BookOpen,
  Home,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
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
import Logo from '../shared/Logo';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: userData } = useUserDetails();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const queryClient = useQueryClient();
  const { theme, toggleTheme, mounted } = useTheme();

  const { selection } = useActionBarSelection();

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
      
      // ✅ Clear all queries from cache to ensure no user data persists after logout
      queryClient.clear();
      
      // Clear any localStorage items related to trades/drafts and analytics
      if (typeof window !== 'undefined') {
        // Clear trade draft data
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('new-trade-draft-') || key.startsWith('trade-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        // Clear analytics strategy slug
        localStorage.removeItem('last-analytics-strategy');
      }
      
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  const isActive = (path: string) => {
    // For home, check exact match
    if (path === '/') {
      return pathname === '/';
    }
    // For strategies, check if pathname starts with /strategies (to handle dynamic routes)
    if (path === '/strategies') {
      return pathname.startsWith('/strategies');
    }
    if (path === '/insight-vault') {
      return pathname.startsWith('/insight-vault');
    }
    return pathname === path;
  };
  const navButtonClass = (active: boolean) =>
    cn(
      'gap-2 rounded-xl border transition-all duration-200',
      'bg-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-slate-300/70',
      'dark:text-slate-200 dark:hover:text-slate-50 dark:hover:bg-slate-800/70 dark:hover:border-slate-700/70',
      active &&
        'bg-purple-500/5 border-purple-500/30 text-purple-700 hover:bg-purple-500/15 hover:border-purple-500/40 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-400/25'
    );

  return (
    <>
      <nav className="fixed top-4 left-0 right-0 z-50 mx-auto w-full max-w-(--breakpoint-xl) px-4 sm:px-0">
        <div className="relative rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-fuchsia-500/5" />
          <div className="relative flex items-center px-3 py-2 sm:px-4 sm:py-2.5">
            <Link
              href="/"
              className="mr-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-50"
            >
              <Logo width={35} height={35} />
              <span className="hidden sm:inline text-sm font-semibold tracking-tight">
                QuantifyX
              </span>
            </Link>

          <Separator orientation="vertical" className="mx-3 hidden h-6 lg:flex" />

          {/* Desktop nav */}
          <div className="hidden lg:block">
            <ul className="flex items-center gap-1">
              <li>
                <Button
                  variant="ghost"
                  asChild
                  size="sm"
                  className={navButtonClass(isActive('/'))}
                >
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </Button>
              </li>
              <li>
                <Button
                  variant="ghost"
                  asChild
                  size="sm"
                  className={navButtonClass(isActive('/strategies'))}
                >
                  <Link href="/strategies">
                    <Target className="h-4 w-4" />
                    <span>My Strategies</span>
                  </Link>
                </Button>
              </li>
              <li>
                <Button
                  variant="ghost"
                  asChild
                  size="sm"
                  className={navButtonClass(isActive('/insight-vault'))}
                >
                  <Link href="/insight-vault">
                    <BookOpen className="h-4 w-4" />
                    <span>Insight Vault</span>
                  </Link>
                </Button>
              </li>
            </ul>
          </div>

          {/* Right actions */}
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100/70 border border-slate-200/80 text-slate-700 hover:bg-slate-200/80 hover:border-slate-300/80 dark:bg-slate-800/70 dark:border-slate-700/80 dark:text-slate-100 dark:hover:bg-slate-700/80 dark:hover:border-slate-600/80 shadow-sm transition-all duration-300 hover:shadow-md group"
              aria-label="Toggle theme"
            >
              {!mounted ? (
                <svg
                  className="h-4 w-4 text-slate-700 dark:text-slate-100 group-hover:rotate-180 transition-transform duration-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : theme === 'dark' ? (
                <svg
                  className="h-4 w-4 text-amber-400 group-hover:rotate-180 transition-transform duration-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4 text-slate-700 dark:text-slate-100 group-hover:rotate-180 transition-transform duration-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <CreateAccountAlertDialog
              onCreated={async () => {
                // refresh accounts list used by ActionBar
                await refetchAccounts();
              }}
            />

            <Button
              variant="destructive"
              size="sm"
              className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isSigningOut ? (
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
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </div>

          {/* Mobile: sheet trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto lg:hidden rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-100/50 dark:bg-slate-800/40 hover:bg-slate-200/60 dark:hover:bg-slate-700/50"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-2">
                <Button
                  variant="ghost"
                  asChild
                  className={cn('w-full justify-start', navButtonClass(isActive('/')))}
                >
                  <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                    <Home className="h-4 w-4" />
                    Home
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  asChild
                  className={cn('w-full justify-start', navButtonClass(isActive('/strategies')))}
                >
                  <Link href="/strategies" onClick={() => setMobileMenuOpen(false)}>
                    <Target className="h-4 w-4" />
                    My Strategies
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  asChild
                  className={cn('w-full justify-start', navButtonClass(isActive('/insight-vault')))}
                >
                  <Link href="/insight-vault" onClick={() => setMobileMenuOpen(false)}>
                    <BookOpen className="h-4 w-4" />
                    Insight Vault
                  </Link>
                </Button>

                <Separator className="my-2" />

                {/* Mobile theme toggle */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 px-3 py-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Appearance
                  </span>
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl bg-slate-100/70 border border-slate-200/80 text-slate-700 hover:bg-slate-200/80 hover:border-slate-300/80 dark:bg-slate-800/70 dark:border-slate-700/80 dark:text-slate-100 dark:hover:bg-slate-700/80 dark:hover:border-slate-600/80 shadow-sm transition-all duration-300 hover:shadow-md group"
                    aria-label="Toggle theme"
                  >
                    {!mounted ? (
                      <svg
                        className="h-4 w-4 text-slate-700 dark:text-slate-100 group-hover:rotate-180 transition-transform duration-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                      </svg>
                    ) : theme === 'dark' ? (
                      <svg
                        className="h-4 w-4 text-amber-400 group-hover:rotate-180 transition-transform duration-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4 text-slate-700 dark:text-slate-100 group-hover:rotate-180 transition-transform duration-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                      </svg>
                    )}
                  </button>
                </div>

                <CreateAccountAlertDialog
                  onCreated={async () => {
                    await queryClient.invalidateQueries({
                      predicate: (q) => q.queryKey[0] === 'accounts', // or your exact key
                    });
                  }}
                />

                <Button
                  variant="destructive"
                  className="relative h-9 px-4 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await handleSignOut();
                  }}
                  disabled={isSigningOut}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSigningOut ? (
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
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    <span>{isSigningOut ? 'Signing out…' : 'Sign Out'}</span>
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      </nav>
      
      {/* ActionBar - Under Navbar */}
      <div className="fixed top-20 left-1/2 z-40 w-auto -translate-x-1/2 transform">
        <div className="inline-block mx-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 px-3 pb-2 pt-2">
          <ActionBar />
        </div>
      </div>

    </>
  );
}
