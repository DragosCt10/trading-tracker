'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { buildPresetRange } from '@/utils/dateRangeHelpers';

export function MyTradesSkeleton() {
  const defaultDateRange = buildPresetRange('year').dateRange;

  return (
    <div className="max-w-7xl mx-auto">
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
        activeFilter="year"
        onFilterChange={() => {}}
        isCustomRange={false}
        selectedMarket="all"
        onSelectedMarketChange={() => {}}
        markets={[]}
        selectedExecution="all"
        onSelectedExecutionChange={() => {}}
        showAllTradesOption={true}
      />

      {/* Summary cards skeleton — matches MyTradesClient summary row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={`summary-skeleton-${i}`}
            className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm"
          >
            <CardContent className="p-4 flex flex-col h-full">
              <Skeleton className="h-3 w-20 mb-3" aria-hidden />
              <Skeleton className="h-32 w-full rounded-lg" aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {/* Cards per row toolbar - skeleton for consistency with TradeCardsView */}
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

        {/* Skeleton only for trade cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <Card
              key={`skeleton-${index}`}
              className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm"
            >
              <div className="p-3">
                <Skeleton className="aspect-video w-full rounded-lg" />
              </div>
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
    </div>
  );
}
