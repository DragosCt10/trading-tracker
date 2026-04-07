'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'cookie-consent';

function updateGtagConsent(granted: boolean) {
  if (typeof window === 'undefined' || !('gtag' in window)) return;
  (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('consent', 'update', {
    ad_storage: granted ? 'granted' : 'denied',
    analytics_storage: granted ? 'granted' : 'denied',
  });

  // Some GTM tags listen for this custom event to trigger on consent update, so we need to dispatch it manually.
  // window.dataLayer?.push({ event: 'consent_update' });
}

export function CookieBanner() {
  // Lazy initializer: runs on the client only; safe to read localStorage here.
  // typeof window guard makes SSR safe (Next.js renders client components on the server too).
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !localStorage.getItem(CONSENT_KEY);
    } catch {
      return false;
    }
  });

  // Re-fire gtag consent update if the user already accepted in a previous session.
  useEffect(() => {
    try {
      if (localStorage.getItem(CONSENT_KEY) === 'accepted') {
        updateGtagConsent(true);
      }
    } catch {}
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {}
    updateGtagConsent(true);
    setVisible(false);
  };

  const reject = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'rejected');
    } catch {}
    updateGtagConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-2xl rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 px-5 py-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Cookie className="mt-0.5 size-5 shrink-0 text-slate-400 dark:text-slate-500" />
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We use cookies and similar technologies to analyse traffic and improve your experience.
            By clicking <strong className="text-slate-900 dark:text-white font-medium">Accept All</strong>, you consent
            to our use of analytics and advertising cookies. See our{' '}
            <a
              href="/privacy-policy"
              className="text-slate-900 dark:text-white underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
          <Button size="sm" onClick={accept} className="flex-1 sm:flex-none sm:w-28">
            Accept All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={reject}
            className="flex-1 sm:flex-none sm:w-28"
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
