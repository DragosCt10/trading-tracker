'use client';

import { useEffect, useRef } from 'react';
import { persistNewsletterPreference } from '@/lib/server/settings';

const STORAGE_KEY = 'newsletter_preference';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Reads the newsletter preference from localStorage (set on the signup page)
 * after a Google OAuth redirect completes, and persists it to the database.
 *
 * Mount in AppLayout so it fires once after every authenticated page load.
 * Short-circuits immediately if no localStorage key exists (99.9% of loads).
 */
export function useNewsletterOAuthSync() {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    // Optimistic cleanup: remove immediately to prevent multi-tab double-fire
    localStorage.removeItem(STORAGE_KEY);

    try {
      const { subscribed, ts } = JSON.parse(raw) as { subscribed: boolean; ts: number };
      if (Date.now() - ts > TTL_MS) return; // Stale — ignore
      persistNewsletterPreference(subscribed).catch(() => {
        // Best-effort: if it fails, DB default (true) applies
      });
    } catch {
      // Malformed localStorage value — ignore
    }
  }, []);
}
