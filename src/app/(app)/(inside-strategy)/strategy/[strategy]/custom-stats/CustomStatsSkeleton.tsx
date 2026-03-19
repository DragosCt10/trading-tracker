'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
        {[1, 2].map((i) => (
          <Card
            key={i}
            className="rounded-2xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden"
          >
            <div className="w-full flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-14 rounded-xl" />
                <Skeleton className="h-8 w-14 rounded-xl" />
              </div>
            </div>

            <div className="border-t border-slate-200/70 dark:border-slate-700/60 px-5 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-20 gap-y-6">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j}>
                    <Skeleton className="h-3 w-16 mb-1.5" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
