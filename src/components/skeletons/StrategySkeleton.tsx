'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewModeToggle } from '@/components/dashboard/analytics/ViewModeToggle';
import { TradeFiltersBar } from '@/components/dashboard/analytics/TradeFiltersBar';
import { createInitialDateRange } from '@/utils/dateRangeHelpers';

export function StrategySkeleton() {
  const defaultDateRange = createInitialDateRange();

  return (
    <>
      <ViewModeToggle viewMode="dateRange" onViewModeChange={() => {}} />

      {/* Date Range and Filter Bar - only in dateRange mode (matches StrategyClient) */}
      <TradeFiltersBar
        dateRange={defaultDateRange}
        onDateRangeChange={() => {}}
        activeFilter="30days"
        onFilterChange={() => {}}
        isCustomRange={false}
        selectedMarket="all"
        onSelectedMarketChange={() => {}}
        markets={[]}
        selectedExecution="executed"
        onSelectedExecutionChange={() => {}}
      />

      <hr className="my-10 border-t border-slate-200 dark:border-slate-700" />

      {/* Overview & Monthly highlights */}
      <div className="flex items-center justify-between mt-8 mb-2">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Overview &amp; Monthly highlights
        </h2>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        Account balance, yearly P&amp;L, and best and worst month for the selected year.
      </p>

      {/* Account Overview Card skeleton */}
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <div className="relative p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-8 w-48" />
              </div>
              <Skeleton className="h-4 w-36 ml-[52px]" />
            </div>
            <div className="text-right space-y-3">
              <Skeleton className="h-3 w-44 ml-auto" />
              <Skeleton className="h-9 w-40 ml-auto rounded-lg" />
              <Skeleton className="h-6 w-28 ml-auto rounded-full" />
            </div>
          </div>
          <CardContent className="h-72 relative p-0">
            <Skeleton className="w-full h-full rounded-lg" />
          </CardContent>
        </div>
      </Card>

      {/* Trades Calendar */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Trades Calendar</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        See your trades and activity by calendar day and week.
      </p>
      <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-8 w-full max-w-md rounded mb-6" />
          <div className="grid grid-cols-7 gap-1 mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square max-h-10 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Core statistics */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Core statistics</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Trading statistics and performance metrics.</p>
      <div className="flex flex-col md:grid md:grid-cols-4 gap-6 w-full">
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Psychological Factors */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Psychological Factors</h2>
      <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">Confidence and mind state at entry across your trades.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-6">
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      {/* Equity Curve */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Equity Curve</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Cumulative P&L over time.</p>
      <div className="w-full mb-6">
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      {/* Consistency & drawdown */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Consistency & drawdown</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Consistency and capital preservation metrics.</p>
      <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance ratios */}
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-14 mb-2">Performance ratios</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Return and risk-adjusted metrics.</p>
      <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trade Performance Analysis */}
      <div className="my-8 mt-12">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Trade Performance Analysis
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          See your trading performance metrics and statistics.
        </p>
      </div>

      {/* Monthly Performance Chart */}
      <div className="w-full mb-8">
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6">
            <Skeleton className="h-80 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      {/* Market Stats Card */}
      <div className="my-8">
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      {/* Market Profit Stats Card */}
      <div className="my-8">
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      <hr className="col-span-full my-10 border-t border-slate-200 dark:border-slate-700" />

      {/* Time Interval */}
      <div className="my-8">
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      {/* Day Stats */}
      <div className="my-8">
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      {/* News by event */}
      <div className="my-8">
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      {/* Potential Risk/Reward & Stop Loss Size - 2-col grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 w-full [&>*]:min-w-0">
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
