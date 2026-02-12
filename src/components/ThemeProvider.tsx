'use client';

import { useTheme } from '@/hooks/useTheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme on mount - this applies the theme to the document
  // The toggle function is only available through Navbar via useTheme hook
  useTheme();

  return <>{children}</>;
}
