import React from 'react';
import { cn } from '@/lib/utils';

interface SectionBadgeProps {
  label: string;
  /** Extra Tailwind classes (e.g. mb-5 instead of default mb-6) */
  className?: string;
  /** Delay for scroll-reveal animation */
  revealDelay?: string;
  /** Accent dot color — defaults to var(--tc-accent) */
  dotColor?: string;
}

export function SectionBadge({
  label,
  className,
  revealDelay = '0ms',
  dotColor = 'var(--tc-accent)',
}: SectionBadgeProps) {
  return (
    <div
      className={cn(
        'scroll-reveal inline-flex items-center gap-2 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none px-4 py-1.5 backdrop-blur-sm mb-6',
        className,
      )}
      style={{ '--reveal-delay': revealDelay } as React.CSSProperties}
    >
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
