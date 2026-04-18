'use client';

import { X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MODE_BADGE } from '@/constants/modeBadge';

type ModalShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  mode?: 'live' | 'backtesting' | 'demo';
  belowScrollContent?: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class. Defaults to `max-w-lg`. */
  maxWidth?: string;
  children: React.ReactNode;
};

export function ModalShell({
  open,
  onOpenChange,
  icon,
  title,
  description,
  mode,
  belowScrollContent,
  footer,
  maxWidth = 'max-w-lg',
  children,
}: ModalShellProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(
        maxWidth,
        'max-h-[90vh] flex flex-col fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl px-6 py-5'
      )}>
        {/* Gradient orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl" />
          <div className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl" />
        </div>

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Fixed header */}
        <div className="relative pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg themed-header-icon-box">
                  {icon}
                </div>
                <span>{title}</span>
              </AlertDialogTitle>
              <div className="flex items-center gap-3">
                {mode && (
                  <div
                    title={`Current mode: ${mode}`}
                    className={cn(
                      'flex items-center justify-center h-4 p-2.5 rounded-xl border pointer-events-none shrink-0',
                      'text-xs font-medium',
                      MODE_BADGE[mode]
                    )}
                  >
                    <span className="leading-none">{mode.toUpperCase()} MODE</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="cursor-pointer rounded-sm ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="relative overflow-y-auto flex-1 min-h-0 pt-4">
          {children}
        </div>

        {/* Pinned below-scroll content (e.g. active shares list) */}
        {belowScrollContent}

        {/* Footer */}
        <AlertDialogFooter className="relative flex-shrink-0 flex items-center justify-end pt-4 mt-2 border-t border-slate-200/50 dark:border-slate-700/50">
          {footer ?? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
            >
              Close
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
