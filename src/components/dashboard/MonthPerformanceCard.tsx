'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MonthPerformanceCardProps {
  title: string;           // "Best Month" / "Worst Month"
  month: string;           // e.g. "January"
  year: number;
  winRate: number;         // 0–100
  profit: number;          // numeric P&L
  currencySymbol: string;  // e.g. "$"
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
  positive = true,
  className,
}) => {
  const color = positive ? 'text-emerald-500' : 'text-red-500';

  return (
    <Card
      className={cn(
        'flex-1 border shadow-none flex flex-col items-center',
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1 flex flex-col items-center text-center">
        <p className="text-2xl font-semibold text-slate-800">
          {month} {year}
          <span className={cn('text-base font-semibold ml-1', color)}>
            ({winRate.toFixed(2)}% WR)
          </span>
        </p>
        <p className={cn('text-sm font-semibold mt-1', color)}>
          {currencySymbol}
          {profit.toFixed(2)}
        </p>
      </CardContent>
    </Card>
  );
};
