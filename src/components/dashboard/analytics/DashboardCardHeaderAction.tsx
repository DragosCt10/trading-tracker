'use client';

import type { ReactNode } from 'react';

/** PRO hide/expand control — absolutely positioned top-right inside dashboard stat cards */
export function DashboardCardHeaderAction({ children }: { children?: ReactNode }) {
  if (children == null) return null;
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-30">
      <div className="pointer-events-auto">{children}</div>
    </div>
  );
}
