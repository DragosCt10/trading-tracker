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
    const mountTimer = setTimeout(() => setMounted(true), 0);
    const checkDarkMode = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Also listen for custom theme-change event (fixes Safari repaint issues)
    const handleThemeChange = () => checkDarkMode();
    window.addEventListener('theme-change', handleThemeChange);

    return () => {
      clearTimeout(mountTimer);
      observer.disconnect();
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  return { mounted, isDark };
}
