'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  tooltipContent?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center';
}

export const StatCard: React.FC<StatCardProps> = React.memo(({
  title,
  value,
  tooltipContent,
  className,
  align = 'center',
}) => {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex-1 flex flex-col',
        className
      )}
    >
      <div className="relative p-6 flex flex-col flex-1">
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
                      className="w-72 text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100"
                      sideOffset={6}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-fuchsia-500/5 rounded-2xl" />
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
                          className="w-72 text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100"
                          sideOffset={6}
                        >
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-fuchsia-500/5 rounded-2xl" />
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
});
