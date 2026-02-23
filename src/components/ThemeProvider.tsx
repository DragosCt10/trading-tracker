'use client';

import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize light/dark theme on mount
  useTheme();

  // Apply color theme from localStorage on mount (fallback for SSR)
  useEffect(() => {
    try {
      const colorTheme = localStorage.getItem('color-theme');
      if (colorTheme) {
        document.documentElement.setAttribute('data-color-theme', colorTheme);
      }
    } catch (e) {}
  }, []);

  return <>{children}</>;
}
