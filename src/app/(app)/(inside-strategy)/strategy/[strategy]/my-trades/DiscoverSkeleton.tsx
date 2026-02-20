'use client';

import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

function getDefaultDateRange() {
  const today = new Date();
  return {
    startDate: fmt(startOfMonth(today)),
    endDate: fmt(endOfMonth(today)),
  };
}

export function DiscoverSkeleton() {
  const defaultDateRange = getDefaultDateRange();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header - real content */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Discover Trades
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Browse your trading history with visual cards
        </p>
      </div>

      {/* Trade Filters Bar - real content (event handlers are no-ops, defined in client) */}
      <TradeFiltersBar
        dateRange={defaultDateRange}
        onDateRangeChange={() => {}}
        activeFilter="month"
        onFilterChange={() => {}}
        isCustomRange={false}
        selectedMarket="all"
        onSelectedMarketChange={() => {}}
        markets={[]}
        selectedExecution="executed"
        onSelectedExecutionChange={() => {}}
      />

      {/* Skeleton only for trade cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
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
