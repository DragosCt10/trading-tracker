'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DailyJournalSkeleton() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72 mt-2" />
      </div>

      <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-8">
        <div className="space-y-4">
          <Skeleton className="h-6 w-full max-w-md mx-auto" />
          <Skeleton className="h-6 w-full max-w-sm mx-auto" />
        </div>
      </div>
    </div>
  );
}
