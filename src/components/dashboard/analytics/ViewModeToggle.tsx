'use client';

import { cn } from '@/lib/utils';

interface ViewModeToggleProps {
  viewMode: 'yearly' | 'dateRange';
  onViewModeChange: (mode: 'yearly' | 'dateRange') => void;
  /** When true, Hide PRO switch is not shown (full PRO dashboard always). */
  isPro?: boolean;
  showProCards?: boolean;
  onShowProCardsChange?: (show: boolean) => void;
}

export function ViewModeToggle({
  viewMode,
  onViewModeChange,
  isPro,
  showProCards,
  onShowProCardsChange,
}: ViewModeToggleProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 mb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {viewMode === 'yearly' ? 'Year in Review' : 'Date Range Analytics'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {viewMode === 'yearly'
            ? 'Your yearly trading performance and statistics. Select a year to view.'
            : 'Your trading performance for the selected date range.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-6 shrink-0">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-sm font-semibold transition-all duration-300",
            viewMode === 'yearly'
              ? "text-slate-900 dark:text-slate-100"
              : "text-slate-500 dark:text-slate-400"
          )}>
            Yearly
          </span>

          <button
            type="button"
            onClick={() => onViewModeChange(viewMode === 'yearly' ? 'dateRange' : 'yearly')}
            className={cn(
              "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 themed-focus focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 shadow-md cursor-pointer",
              viewMode === 'dateRange'
                ? "themed-btn-primary"
                : "bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700"
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md border",
                viewMode === 'dateRange'
                  ? "translate-x-[24px] border-white/50"
                  : "translate-x-[4px] border-slate-200/50 dark:border-slate-600/50"
              )}
            />
          </button>

          <span className={cn(
            "text-sm font-semibold transition-all duration-300",
            viewMode === 'dateRange'
              ? "text-slate-900 dark:text-slate-100"
              : "text-slate-500 dark:text-slate-400"
          )}>
            Date Range
          </span>
        </div>

        {!isPro &&
          typeof showProCards === 'boolean' &&
          onShowProCardsChange && (
          <>
            {/* Vertical separator on desktop; full-width rule when controls wrap on small screens */}
            <div
              className="hidden sm:block h-7 w-px shrink-0 self-center bg-slate-300 dark:bg-slate-600"
              aria-hidden
            />
            <div
              className="sm:hidden w-full min-w-full basis-full shrink-0 h-px bg-slate-300 dark:bg-slate-600"
              aria-hidden
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onShowProCardsChange(!showProCards)}
                aria-label={showProCards ? 'Hide PRO statistics' : 'Show PRO statistics'}
                className={cn(
                  "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 themed-focus focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 shadow-md cursor-pointer",
                  !showProCards
                    ? "themed-btn-primary"
                    : "bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md border",
                    !showProCards
                      ? "translate-x-[24px] border-white/50"
                      : "translate-x-[4px] border-slate-200/50 dark:border-slate-600/50"
                  )}
                />
              </button>

              <span
                className={cn(
                  "text-sm font-semibold transition-all duration-300",
                  !showProCards
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                Hide PRO
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
