'use client';

import { ReactNode, createContext, useContext } from 'react';
import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, toggleTheme, mounted } = useTheme();

  // Apply color theme from localStorage on mount (fallback for SSR)
  useEffect(() => {
    try {
      const colorTheme = localStorage.getItem('color-theme');
      if (colorTheme) {
        document.documentElement.setAttribute('data-color-theme', colorTheme);
      }
    } catch (e) {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}
