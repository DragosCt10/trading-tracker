'use client';

import { ReactNode } from 'react';
import { useThemeContext } from './ThemeProvider';

/**
 * Forces all children to re-render when theme changes.
 * Wrap your page content with this component to ensure theme-dependent styling updates.
 */
export function ThemeSync({ children }: { children: ReactNode }) {
  // Subscribe to theme changes - this forces re-render of all children
  useThemeContext();
  return <>{children}</>;
}
