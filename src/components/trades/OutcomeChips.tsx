'use client';

import type { Trade } from '@/types/trade';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type OutcomeChipsProps = {
  trade: Trade;
  className?: string;
};

export function OutcomeChips({ trade, className }: OutcomeChipsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {trade.break_even || trade.trade_outcome === 'BE' ? (
        <>
          <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600 text-white">
            BE
          </Badge>
          {trade.be_final_result && (
            <Badge
              className={cn(
                'shadow-none border-none outline-none ring-0',
                trade.be_final_result === 'Win'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                  : 'bg-gradient-to-br from-rose-500 to-rose-300 text-white'
              )}
            >
              {trade.be_final_result}
            </Badge>
          )}
        </>
      ) : (
        <Badge
          className={cn(
            'shadow-none border-none outline-none ring-0',
            trade.trade_outcome === 'Win'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
              : 'bg-gradient-to-br from-rose-500 to-rose-300 text-white'
          )}
        >
          {trade.trade_outcome}
        </Badge>
      )}

      {!trade.executed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="size-4"
              >
                <line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="18"
                  y1="6"
                  x2="6"
                  y2="18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </Badge>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl"
          >
            <div className="text-slate-600 dark:text-slate-300">Not executed trade</div>
          </TooltipContent>
        </Tooltip>
      )}

      {trade.launch_hour && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4"
              >
                <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  d="M12 8v4l2 2"
                />
                <rect x="11" y="2" width="2" height="3" rx="1" fill="currentColor" />
                <rect x="11" y="19" width="2" height="3" rx="1" fill="currentColor" />
              </svg>
            </Badge>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl"
          >
            <div className="text-slate-600 dark:text-slate-300">Lunch Hour trade</div>
          </TooltipContent>
        </Tooltip>
      )}

      {trade.partials_taken && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-blue-400 to-blue-600 text-white cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z"
                />
              </svg>
            </Badge>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-2.5"
          >
            <div className="text-sm font-medium">Partial profits taken</div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

