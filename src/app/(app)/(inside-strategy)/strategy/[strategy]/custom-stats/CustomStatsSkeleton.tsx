'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CustomStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card
          key={i}
          className="rounded-2xl border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden"
        >
          {/* Equity chart area */}
          <div className="h-24 w-full px-3 pt-3">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>

          {/* Card info */}
          <div className="px-4 pt-3 pb-4">
            {/* Title + chip row */}
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            {/* Stats row */}
            <div className="flex items-end justify-between gap-4 mt-2">
              <div className="flex items-center gap-4">
                <div>
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <div>
                  <Skeleton className="h-3 w-10 mb-1" />
                  <Skeleton className="h-4 w-6" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 mt-3">
              <Skeleton className="h-4 w-10 rounded-full" />
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-8 rounded-full" />
            </div>

            {/* Action row */}
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

/** @deprecated Use CustomStatsCardsSkeleton instead */
export function CustomStatsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Custom Stats
        </h1>
        <div className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
          Filter combinations for{' '}
          <Skeleton className="h-4 w-24 inline-block align-middle" />
        </div>
      </div>
      <div className="space-y-4 mt-4">
        <CustomStatsCardsSkeleton />
      </div>
    </div>
  );
}
