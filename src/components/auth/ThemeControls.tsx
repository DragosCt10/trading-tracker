'use client';

import { useState } from 'react';
import { Palette, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { ThemePickerModal } from '@/components/shared/ThemePickerModal';

/**
 * Absolute-positioned theme controls (color palette + dark/light toggle) used
 * in the top-right corner of every auth page. Fully self-contained — owns its
 * own theme picker modal state.
 */
export function ThemeControls() {
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <>
      <div className="absolute top-6 right-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setThemePickerOpen(true)}
          className="p-3 rounded-xl bg-muted/50 border border-border backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-foreground"
          aria-label="Color theme"
        >
          <Palette className="w-5 h-5" style={{ color: 'var(--tc-primary)' }} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="p-3 rounded-xl bg-muted/50 border border-border backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group text-foreground"
          aria-label="Toggle theme"
        >
          {!mounted || theme !== 'dark' ? (
            <Moon
              className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500"
              aria-hidden="true"
            />
          ) : (
            <Sun
              className="w-5 h-5 text-amber-400 group-hover:rotate-180 transition-transform duration-500"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
      <ThemePickerModal open={themePickerOpen} onClose={() => setThemePickerOpen(false)} />
    </>
  );
}
