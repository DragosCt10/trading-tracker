'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { buildPresetRange } from '@/utils/dateRangeHelpers';
import { cn } from '@/lib/utils';
import { CARD_BASE_CLASSES } from '@/constants/styles';

export function CustomStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <Card
          key={i}
          className={cn(CARD_BASE_CLASSES, 'overflow-hidden')}
        >
          <div className="h-30 w-full px-3 pt-3">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
          <div className="px-4 pt-3 pb-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-end justify-between gap-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-10 mb-1" />
                  <Skeleton className="h-4 w-6" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <Skeleton className="h-4 w-10 rounded-full" />
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-8 rounded-full" />
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-xl" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function CustomStatsSkeleton() {
  const defaultDateRange = buildPresetRange('year').dateRange;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Custom Stats
        </h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-slate-500 dark:text-slate-400">Custom filter combinations for</span>
          <Skeleton className="h-4 w-24 inline-block" />
        </div>
      </div>

      <TradeFiltersBar
        dateRange={defaultDateRange}
        onDateRangeChange={() => {}}
        activeFilter="year"
        onFilterChange={() => {}}
        isCustomRange={false}
        selectedMarket="all"
        onSelectedMarketChange={() => {}}
        markets={[]}
        selectedExecution="all"
        onSelectedExecutionChange={() => {}}
        showAllTradesOption={true}
        hideMarket
        hideExecution
      />

      <div className="space-y-6 mt-6">
        <CustomStatsCardsSkeleton />
      </div>
    </div>
  );
}
