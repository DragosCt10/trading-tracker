'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import {
  Menu,
  X,
  LogOut,
  Target,
  Lightbulb,
  Palette,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
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
import Logo from '../shared/Logo';
import { ThemePickerModal } from './ThemePickerModal';
import { clearLastAccountPreference } from '@/utils/lastAccountCookie';

interface NavbarProps {
  /** Rendered in the navbar center on responsive (< lg); e.g. ActionBar */
  centerContent?: ReactNode;
  /** Rendered inside the mobile lateral menu (e.g. Add account button). */
  mobileMenuExtra?: ReactNode;
}

export default function Navbar({ centerContent, mobileMenuExtra }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: userData } = useUserDetails();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const queryClient = useQueryClient();
  const { theme, toggleTheme, mounted } = useTheme();

  useEffect(() => {
    if (userData?.user) setIsSigningOut(false);
  }, [userData?.user]);

  const handleSignOut = useCallback(async () => {
    try {
      setIsSigningOut(true);

      queryClient.clear();

      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('new-trade-draft-') || key.startsWith('trade-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));

        // Clear last-account cookies so a new login doesn't inherit the previous selection.
        clearLastAccountPreference();
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  }, [queryClient, router]);

  const isActive = useCallback((path: string) => {
    if (path === '/strategies') return pathname.startsWith('/strategies');
    if (path === '/insight-vault') return pathname.startsWith('/insight-vault');
    return pathname === path;
  }, [pathname]);

  const navButtonClass = useCallback((active: boolean) => cn(
    'gap-2 rounded-xl border transition-all duration-200',
    'bg-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-slate-300/70',
    'dark:text-slate-200 dark:hover:text-slate-50 dark:hover:bg-slate-800/70 dark:hover:border-slate-700/70',
    active && 'themed-nav-active'
  ), []);

  const openThemePicker = useCallback(() => setThemePickerOpen(true), []);
  const closeThemePicker = useCallback(() => setThemePickerOpen(false), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const openThemePickerAndCloseMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setThemePickerOpen(true);
  }, []);

  const handleSignOutMobile = useCallback(async () => {
    setMobileMenuOpen(false);
    await handleSignOut();
  }, [handleSignOut]);

  const isStrategiesActive = useMemo(() => isActive('/strategies'), [isActive]);
  const isInsightVaultActive = useMemo(() => isActive('/insight-vault'), [isActive]);

  return (
    <>
      <nav className="fixed top-4 left-0 right-0 z-50 mx-auto w-full max-w-(--breakpoint-xl) px-4 sm:px-0">
        <div className="relative rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40">
          <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="relative flex items-center px-3 py-2 sm:px-4 sm:py-2.5">
            <Link
              href="/"
              className="flex items-center font-semibold text-slate-900 dark:text-slate-50"
            >
              <Logo className="absolute top-2.5 lg:w-9 lg:h-9 w-12 h-12" />
              <span className="hidden lg:inline text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50 ml-9">
                AlphaStats
              </span>
            </Link>

          <Separator orientation="vertical" className="mx-3 hidden h-6 lg:flex" />

          {/* Desktop nav */}
          <div className="hidden lg:block">
            <ul className="flex items-center gap-2">
              <li>
                <Button
                  variant="ghost"
                  asChild
                  size="sm"
                  className={navButtonClass(isStrategiesActive)}
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
                  className={navButtonClass(isInsightVaultActive)}
                >
                  <Link href="/insight-vault">
                    <Lightbulb className="h-4 w-4" />
                    <span>Insight Vault</span>
                  </Link>
                </Button>
              </li>
            </ul>
          </div>

          {/* Responsive: center slot (e.g. ActionBar) — only on < lg; py allows button shadow space */}
          {centerContent ? (
            <div className="flex-1 flex justify-center items-center min-w-0 px-2 py-1.5 lg:hidden">
              {centerContent}
            </div>
          ) : null}

          {/* Right actions — same style as Edit btn (EditAccountAlertDialog), icon only */}
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={openThemePicker}
              className="cursor-pointer h-8 w-8 rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 p-0 flex items-center justify-center transition-colors duration-200"
              aria-label="Color theme"
            >
              <Palette className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={toggleTheme}
              className="cursor-pointer h-8 w-8 rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 p-0 flex items-center justify-center transition-colors duration-200 group"
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
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 transition-all duration-300"
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
                  className={cn('w-full justify-start', navButtonClass(isStrategiesActive))}
                >
                  <Link href="/strategies" onClick={closeMobileMenu}>
                    <Target className="h-4 w-4" />
                    My Strategies
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  asChild
                  className={cn('w-full justify-start', navButtonClass(isInsightVaultActive))}
                >
                  <Link href="/insight-vault" onClick={closeMobileMenu}>
                    <Lightbulb className="h-4 w-4" />
                    Insight Vault
                  </Link>
                </Button>

                <Separator className="my-2" />

                {mobileMenuExtra ? (
                  <div className="w-full">{mobileMenuExtra}</div>
                ) : null}

                {mobileMenuExtra ? <Separator className="my-2" /> : null}

                {/* Mobile color theme picker */}
                <button
                  onClick={openThemePickerAndCloseMenu}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/60 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all"
                >
                  <Palette className="h-4 w-4" />
                  <span>Color Theme</span>
                </button>

                {/* Mobile theme toggle — same style as Edit btn, icon only */}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={toggleTheme}
                  className="w-full cursor-pointer h-9 rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 p-0 flex items-center justify-center transition-colors duration-200 group"
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
                </Button>

                <Button
                  variant="destructive"
                  className="relative h-9 px-4 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60"
                  onClick={handleSignOutMobile}
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

      <ThemePickerModal open={themePickerOpen} onClose={closeThemePicker} />
    </>
  );
}
