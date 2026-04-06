'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';

/** When 'calendar', tooltip uses same bg as TradesCalendarCard (white / slate-800/90). Default uses themed overlay in dark mode only. */
interface StatCardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  tooltipContent?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center';
  tooltipVariant?: 'default' | 'calendar';
  /** When true, blur the card content while keeping the card border sharp. */
  locked?: boolean;
  /** Optional chip rendered at top-right when `locked` is true. */
  lockedChip?: React.ReactNode;
}

const tooltipClassCalendar = 'w-72 text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100';
const tooltipClassDefault = 'w-72 text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100';
const lockedTooltipClass = 'max-w-sm text-xs rounded-2xl p-3 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50';
const lockedTooltipText = 'The data shown under the blur card is fictive and for demo purposes only.';

export const StatCard: React.FC<StatCardProps> = React.memo(({
  title,
  value,
  tooltipContent,
  className,
  align = 'center',
  tooltipVariant = 'default',
  locked = false,
  lockedChip,
}) => {
  const { isDark } = useDarkMode();
  const useCalendarTooltip = tooltipVariant === 'calendar';
  const card = (
    <Card
      className={cn(
        'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex-1 flex flex-col',
        className
      )}
    >
      {locked && lockedChip}
      {locked && (
        <div className="pointer-events-none absolute inset-0.5 z-10 rounded-xl bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
      )}

      <div
        className={cn(
          'relative p-6 flex flex-col flex-1',
          locked && 'blur-[3px] opacity-70 pointer-events-none select-none'
        )}
      >
        {align === 'center' ? (
          /* Centered: title, value stacked */
          <div className="flex flex-col items-center justify-center text-center gap-3 w-full">
            <div className="flex items-center justify-center gap-1.5">
              <CardTitle className="text-sm font-semibold tracking-wide text-slate-400 dark:text-slate-400">
                {title}
              </CardTitle>
              {tooltipContent && (
                <TooltipProvider>
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={0}
                        className="inline-flex h-4 w-4 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none shrink-0"
                        aria-label="More info"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="center"
                      className={useCalendarTooltip ? tooltipClassCalendar : tooltipClassDefault}
                      sideOffset={6}
                    >
                      {!useCalendarTooltip && isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
                      <div className="relative">{tooltipContent}</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="w-full flex justify-center">{value}</div>
          </div>
        ) : (
          /* Left align: title left, value right */
          <div className="flex flex-row items-start justify-between gap-4 w-full">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
                  {title}
                </CardTitle>
                  {tooltipContent && (
                    <TooltipProvider>
                      <Tooltip delayDuration={150}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            tabIndex={0}
                            className="inline-flex h-4 w-4 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none shrink-0"
                            aria-label="More info"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="center"
                          className={useCalendarTooltip ? tooltipClassCalendar : tooltipClassDefault}
                          sideOffset={6}
                        >
                          {!useCalendarTooltip && isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
                          <div className="relative">{tooltipContent}</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
            </div>
            <div className="flex flex-col items-end shrink-0">{value}</div>
          </div>
        )}
      </div>
    </Card>
  );

  if (!locked) {
    return card;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={120}>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={8}
          className={lockedTooltipClass}
        >
          {lockedTooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
StatCard.displayName = 'StatCard';
