'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { createAllTimeRange } from '@/utils/dateRangeHelpers';

export function MyTradesSkeleton() {
  const defaultDateRange = createAllTimeRange();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header - real content */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          My Trades
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Browse your trading history with visual cards
        </p>
      </div>

      {/* Trade Filters Bar - real content (event handlers are no-ops, defined in client) */}
      <TradeFiltersBar
        dateRange={defaultDateRange}
        onDateRangeChange={() => {}}
        activeFilter="all"
        onFilterChange={() => {}}
        isCustomRange={false}
        selectedMarket="all"
        onSelectedMarketChange={() => {}}
        markets={[]}
        selectedExecution="all"
        onSelectedExecutionChange={() => {}}
      />

      {/* Cards per row toolbar - skeleton for consistency with TradeCardsView */}
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center justify-end gap-1">
            <span className="text-sm text-slate-500 dark:text-slate-400 mr-2 whitespace-nowrap">
              Cards per row:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-0.5 gap-0.5">
              <Skeleton className="h-8 w-8 rounded-md shrink-0" aria-hidden />
              <Skeleton className="h-8 w-8 rounded-md shrink-0 bg-slate-200/80 dark:bg-slate-600/50" aria-hidden />
              <Skeleton className="h-8 w-8 rounded-md shrink-0" aria-hidden />
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton only for trade cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <Card key={`skeleton-${index}`} className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
            {/* Image container with padding */}
            <div className="p-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
            </div>
            {/* Content area */}
            <CardContent className="px-5 pb-5 pt-0">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="space-y-2.5 mb-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
