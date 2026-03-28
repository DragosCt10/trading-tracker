'use client';

// src/components/dashboard/ai-vision/AiVisionSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const CARD_CLASS =
  'relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm';

export function AiVisionSkeleton() {
  return (
    <>
      {/* Score cards — 3 columns */}
      <div className="grid grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <Card key={i} className={CARD_CLASS}>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-20 mx-auto rounded-lg" />
              <Skeleton className="h-5 w-16 mx-auto rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section heading — Performance vs Baseline */}
      <div className="mt-10">
        <Skeleton className="h-5 w-52 rounded" />
        <Skeleton className="h-3.5 w-96 mt-1.5 rounded" />
      </div>

      {/* Bar chart */}
      <Card className={CARD_CLASS}>
        <CardContent className="p-5">
          <div className="flex items-center justify-end gap-4 mb-4">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="h-[370px] w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Section heading — Metric Cards */}
      <div className="mt-10">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-3.5 w-64 mt-1.5 rounded" />
      </div>

      {/* Gauge cards — 4 rows of 3 */}
      <div className="flex flex-col gap-0 mt-3">
        {[0, 1, 2, 3].map((row) => (
          <div key={row}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((col) => (
                <Card key={col} className={CARD_CLASS}>
                  <CardHeader className="pb-0">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-3 rounded-full" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 pb-4 px-4 space-y-3">
                    <div className="flex justify-center">
                      <Skeleton className="h-28 w-36 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map((p) => (
                        <Skeleton key={p} className="h-12 rounded-lg" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {row < 3 && <hr className="border-slate-200/50 dark:border-slate-700/40 my-10" />}
          </div>
        ))}
      </div>
    </>
  );
}
