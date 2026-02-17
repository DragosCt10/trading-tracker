'use client';

import * as React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MonthPerformanceCardProps {
  title: string;           // "Best Month" / "Worst Month"
  month: string;           // e.g. "January"
  year: number;
  winRate: number;         // 0–100
  profit: number;          // numeric P&L
  currencySymbol: string;  // e.g. "$"
  /** P&L as percentage of account balance (e.g. 5.25 for +5.25%) */
  profitPercent?: number;
  positive?: boolean;      // true for best, false for worst
  className?: string;
}

export const MonthPerformanceCard: React.FC<MonthPerformanceCardProps> = ({
  title,
  month,
  year,
  winRate,
  profit,
  currencySymbol,
  profitPercent,
  positive = true,
  className,
}) => {
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex-1 flex flex-col',
        className
      )}
    >
      <div className="relative p-6 flex flex-col flex-1">
        {/* One row: left = title/month, right = Win rate + P&L aligned on same line */}
        <div className="flex flex-row items-start justify-between gap-4 w-full">
          {/* Left: title, then month + year under */}
          <div className="flex flex-col gap-1 min-w-0">
            <CardTitle className="text-sm font-semibold tracking-wide text-slate-400 dark:text-slate-400">
              {title}
            </CardTitle>
            <p className="text-xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              {month} {year}
            </p>
          </div>

          {/* Right: Win rate and P&L — same baseline, both right-aligned with consistent width */}
          <div className="flex flex-row gap-8 items-start shrink-0">
            {/* Win rate */}
            <div className="flex flex-col gap-1.5 items-end text-right min-w-[7rem]">
              <div className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500 w-full">
                Win rate
              </div>
              <div
                className={cn(
                  'inline-flex items-center justify-end gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold',
                  positive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                )}
              >
                <TrendIcon className="w-4 h-4 shrink-0" />
                {winRate.toFixed(1)}%
              </div>
            </div>

            {/* P&L */}
            <div className="flex flex-col gap-1.5 items-end text-right min-w-[7rem]">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 w-full">
                P&L
              </div>
              <div
                className={cn(
                  'text-xl font-bold tracking-tight leading-tight',
                  positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {positive && profit >= 0 ? '+' : ''}
                {currencySymbol}
                {profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {profitPercent != null && (
                <div
                  className={cn(
                    'text-xs font-semibold',
                    positive ? 'text-emerald-600/90 dark:text-emerald-400/90' : 'text-rose-600/90 dark:text-rose-400/90'
                  )}
                >
                  {profitPercent >= 0 ? '+' : ''}
                  {profitPercent.toFixed(2)}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
