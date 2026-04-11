'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Palette, Settings } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemePickerModal } from '@/components/shared/ThemePickerModal';
import NotificationBell from '@/components/feed/NotificationBell';
import { useQueryClient } from '@tanstack/react-query';
import { clearLastAccountPreference } from '@/utils/lastAccountCookie';

interface SocialNavActionsProps {
  userId: string | null;
  initialUnreadCount?: number;
}

export default function SocialNavActions({ userId, initialUnreadCount }: SocialNavActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, toggleTheme, mounted } = useTheme();
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

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
        clearLastAccountPreference(userId ?? undefined);
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
      router.replace('/feed');
    } catch {
      setIsSigningOut(false);
      setSignOutError(true);
      setTimeout(() => setSignOutError(false), 4000);
    }
  }, [queryClient, router, userId]);

  const iconBtnClass =
    'cursor-pointer h-8 w-8 rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 p-0 flex items-center justify-center transition-colors duration-200 group';

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {signOutError ? 'Sign out failed. Please try again.' : isSigningOut ? 'Signing out…' : ''}
      </div>
      <div className="flex items-center gap-2">
        {/* Palette — always visible */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setThemePickerOpen(true)}
          className={iconBtnClass}
          aria-label="Color theme"
        >
          <Palette className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
        </Button>

        {/* Dark/light toggle — always visible */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={toggleTheme}
          className={iconBtnClass}
          aria-label="Toggle theme"
        >
          {!mounted ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : theme === 'dark' ? (
            <svg className="h-4 w-4 text-amber-400 group-hover:rotate-180 transition-transform duration-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </Button>

        {/* Auth-only icons */}
        {userId && (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <NotificationBell userId={userId} initialUnreadCount={initialUnreadCount} />
            <Button
              variant="ghost"
              size="icon"
              className={`${iconBtnClass} border border-slate-200/80 dark:border-slate-700/80`}
              aria-label="Settings"
              asChild
            >
              <Link href="/settings?tab=billing" className="group flex items-center justify-center">
                <Settings className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="relative cursor-pointer h-8 w-8 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 transition-all duration-300 p-0 flex items-center justify-center"
              onClick={handleSignOut}
              disabled={isSigningOut}
              aria-label={isSigningOut ? 'Signing out' : 'Sign out'}
            >
              <span className="relative z-10 flex items-center justify-center">
                {isSigningOut ? (
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                )}
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </>
        )}
      </div>

      <ThemePickerModal open={themePickerOpen} onClose={() => setThemePickerOpen(false)} />
    </>
  );
}
