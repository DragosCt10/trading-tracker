'use client';

import { useState, useEffect } from 'react';

/**
 * Manages error state with optional auto-dismiss.
 * Replaces the repeated useState + useEffect/setTimeout pattern across modals.
 *
 * @param autoClearMs - If provided, error auto-clears after this many milliseconds.
 */
export function useProgressDialog(autoClearMs?: number) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error || !autoClearMs) return;
    const t = setTimeout(() => setError(null), autoClearMs);
    return () => clearTimeout(t);
  }, [error, autoClearMs]);

  return { error, setError, clearError: () => setError(null) };
}
