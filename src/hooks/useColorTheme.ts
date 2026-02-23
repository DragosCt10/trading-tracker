'use client';

import { useState, useEffect } from 'react';
import { type ColorThemeId } from '@/constants/colorThemes';

function applyColorTheme(themeId: ColorThemeId | null) {
  if (themeId) {
    document.documentElement.setAttribute('data-color-theme', themeId);
  } else {
    document.documentElement.removeAttribute('data-color-theme');
  }
}

export function useColorTheme() {
  const [colorTheme, setColorTheme] = useState<ColorThemeId | null>(() => {
    if (typeof window === 'undefined') return null;
    return (localStorage.getItem('color-theme') as ColorThemeId | null) ?? null;
  });

  useEffect(() => {
    const stored = localStorage.getItem('color-theme') as ColorThemeId | null;
    setColorTheme(stored);
    applyColorTheme(stored);
  }, []);

  const changeColorTheme = (id: ColorThemeId) => {
    applyColorTheme(id);
    localStorage.setItem('color-theme', id);
    setColorTheme(id);
  };

  return { colorTheme, changeColorTheme };
}
