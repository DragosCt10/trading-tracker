'use client';

// src/hooks/useThemeColors.ts
// Reactive theme color reader — watches data-color-theme attribute changes.
// For the theme SETTER (localStorage + DOM), see useColorTheme.ts.

import { useState, useEffect } from 'react';
import { COLOR_THEMES, DEFAULT_THEME_COLORS, type ColorThemeId } from '@/constants/colorThemes';

export function useThemeColors() {
  const [colors, setColors] = useState(DEFAULT_THEME_COLORS);

  useEffect(() => {
    const read = () => {
      const id = document.documentElement.getAttribute('data-color-theme') as ColorThemeId | null;
      setColors(COLOR_THEMES.find((t) => t.id === id)?.colors ?? DEFAULT_THEME_COLORS);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-theme'] });
    return () => mo.disconnect();
  }, []);

  return colors;
}
