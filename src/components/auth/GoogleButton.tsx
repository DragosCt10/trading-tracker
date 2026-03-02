'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface GoogleButtonProps {
  /** Forwarded as ?next= to the OAuth callback — must be a relative path. */
  redirectTo?: string | null;
}

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 620;

export default function GoogleButton({ redirectTo }: GoogleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const callbackUrl = new URL('/api/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('popup', '1');
    if (redirectTo && redirectTo.startsWith('/')) {
      callbackUrl.searchParams.set('next', redirectTo);
    }

    // Get the OAuth URL without triggering a full-page redirect
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      setIsLoading(false);
      return;
    }

    // Open a centered popup window pointing at the Google consent screen
    const left = window.screenX + Math.round((window.outerWidth - POPUP_WIDTH) / 2);
    const top = window.screenY + Math.round((window.outerHeight - POPUP_HEIGHT) / 2);
    const popup = window.open(
      data.url,
      'google-oauth',
      `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      // Popup was blocked — fall back to full-page redirect
      window.location.href = data.url;
      return;
    }

    const cleanup = () => {
      clearInterval(pollClosed);
      window.removeEventListener('message', handleMessage);
    };

    // Listen for the callback page to signal success or error
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { type, errorMessage } = event.data ?? {};

      if (type === 'GOOGLE_AUTH_SUCCESS') {
        cleanup();
        window.location.href = redirectTo ?? '/strategies';
      } else if (type === 'GOOGLE_AUTH_ERROR') {
        cleanup();
        // Surface the error on the login page via query param
        const url = new URL(window.location.href);
        url.searchParams.set('error', errorMessage ?? 'Google sign-in failed');
        window.location.href = url.toString();
      }
    };

    // Reset loading if the user closes the popup manually
    const pollClosed = setInterval(() => {
      if (popup.closed) {
        cleanup();
        setIsLoading(false);
      }
    }, 600);

    window.addEventListener('message', handleMessage);
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="relative w-full h-12 flex items-center justify-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 hover:bg-slate-100/70 dark:hover:bg-slate-700/40 transition-all duration-300 font-semibold text-slate-700 dark:text-slate-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 animate-spin text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Signing in with Google...
        </>
      ) : (
        <>
          {/* Official Google "G" logo */}
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </>
      )}
    </button>
  );
}
