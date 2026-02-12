'use client';

import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export function useTheme() {
  // Initialize theme from localStorage or system preference immediately
  // This prevents flicker by reading the theme before React hydrates
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'dark';
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  // Mark as mounted after initial render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme to document (only update if theme actually changed)
  useEffect(() => {
    if (!mounted) return;
    const isDark = document.documentElement.classList.contains('dark');
    if (theme === 'dark' && !isDark) {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light' && isDark) {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme, mounted };
}
