'use client';

import { useId } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatPercent } from '@/lib/utils';
import { SORT_BY_OPTIONS, type SortByOption } from '@/utils/strategySorting';
import { STRATEGY_CARD_SURFACE } from './constants';
import type { StrategiesAccountTotals } from '@/utils/strategiesAccountTotals';

interface StatsSortBarProps {
  sortBy: SortByOption;
  onSortChange: (value: SortByOption) => void;
  isPro: boolean;
  showAccountTotalsLoading: boolean;
  accountTotals: StrategiesAccountTotals;
}

export function StatsSortBar({
  sortBy,
  onSortChange,
  isPro,
  showAccountTotalsLoading,
  accountTotals,
}: StatsSortBarProps) {
  const sortLabelId = useId();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <label
          id={sortLabelId}
          htmlFor={`${sortLabelId}-trigger`}
          className="text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          Order by:
        </label>
        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as SortByOption)}
        >
          <SelectTrigger
            id={`${sortLabelId}-trigger`}
            aria-labelledby={sortLabelId}
            className="h-8 w-[10rem] rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 text-xs font-medium cursor-pointer transition-colors duration-200"
          >
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 cursor-pointer">
            {SORT_BY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPro ? (
        <div
          className="flex flex-wrap items-center gap-2 sm:justify-end"
          aria-label="Account-wide stats for all Stats Boards (PRO)"
        >
          {showAccountTotalsLoading ? (
            <>
              <div
                className={cn('h-8 w-[11rem] rounded-xl animate-pulse', STRATEGY_CARD_SURFACE)}
                aria-hidden="true"
              />
              <div
                className={cn('h-8 w-[9rem] rounded-xl animate-pulse', STRATEGY_CARD_SURFACE)}
                aria-hidden="true"
              />
            </>
          ) : (
            <>
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 tabular-nums',
                  STRATEGY_CARD_SURFACE
                )}
              >
                <span className="text-slate-500 dark:text-slate-400 font-normal">Total Win rate:</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {accountTotals.winRatePct != null
                    ? `${formatPercent(accountTotals.winRatePct)}%`
                    : '—'}
                </span>
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 tabular-nums',
                  STRATEGY_CARD_SURFACE
                )}
              >
                <span className="text-slate-500 dark:text-slate-400 font-normal">Total Trades:</span>
                <span className="text-slate-900 dark:text-slate-100">{accountTotals.totalTrades}</span>
              </span>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
