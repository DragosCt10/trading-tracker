import { useState, useEffect } from 'react';

/**
 * Returns `{ mounted, isDark }` where `isDark` tracks whether the `dark` class
 * is present on `document.documentElement`. Updates reactively via MutationObserver.
 * Use `mounted` to avoid hydration mismatches (SSR-safe).
 */
export function useDarkMode(): { mounted: boolean; isDark: boolean } {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkDarkMode = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return { mounted, isDark };
}
