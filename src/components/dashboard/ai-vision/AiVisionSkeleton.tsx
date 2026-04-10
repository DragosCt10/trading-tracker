'use client';

import { Skeleton } from '@/components/ui/skeleton';

const SURFACE =
  'rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm';

/* ── Individual skeleton pieces (used in AiVisionClient when header/filters are already static) ── */

export function AiVisionPatternsSkeleton() {
  return (
    <section aria-label="AI Detected Patterns">
      {/* Filter pills */}
      <div className="flex items-center gap-1.5 mt-4 mb-4 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-1 w-fit">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-lg" />
        ))}
      </div>
      {/* Pattern cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${SURFACE} p-4 space-y-2`}>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="h-5 w-20 mt-1 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function AiVisionScoreCardsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${SURFACE} overflow-hidden`}>
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-1">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-3 w-36 rounded" />
          </div>
          <div className="flex justify-center px-4">
            <Skeleton className="h-36 w-44 rounded-full" />
          </div>
          <div className="flex justify-center pb-4">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AiVisionMetricRowsSkeleton() {
  return (
    <div className="flex flex-col gap-6 mt-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`${SURFACE} overflow-hidden`}>
          <div className="flex flex-col lg:flex-row">
            {/* Left: gauge + period pills */}
            <div className="flex flex-col lg:w-[420px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/50 dark:border-slate-700/40">
              <div className="flex items-center justify-between px-7 pt-6 pb-0">
                <Skeleton className="h-6 w-32 rounded" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div className="flex justify-center px-8 py-4">
                <Skeleton className="h-36 w-44 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-3 px-7 pb-6 pt-2">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 border border-slate-200/60 dark:border-slate-700/40">
                    <Skeleton className="h-3 w-8 rounded" />
                    <Skeleton className="h-5 w-12 rounded" />
                  </div>
                ))}
              </div>
            </div>
            {/* Right: bar chart + trendline */}
            <div className="flex flex-col sm:flex-row lg:flex-col flex-1 min-w-0 divide-y sm:divide-y-0 sm:divide-x lg:divide-x-0 lg:divide-y divide-slate-200/50 dark:divide-slate-700/40">
              <div className="flex-1 px-6 pt-4 pb-4">
                <Skeleton className="h-3 w-40 mb-3 rounded" />
                <Skeleton className="h-[140px] w-full rounded-lg" />
              </div>
              <div className="flex-1 px-6 pt-4 pb-4">
                <Skeleton className="h-3 w-28 mb-3 rounded" />
                <Skeleton className="h-[140px] w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Full-page skeleton (used as Suspense fallback when nothing is rendered yet) ── */

export function AiVisionSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <Skeleton className="h-7 w-32 rounded" />
        <Skeleton className="h-4 w-72 mt-2 rounded" />
      </div>

      {/* ── Filters row ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-1">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-lg" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
      </div>

      {/* ── Patterns ───────────────────────────────────────────────────── */}
      <AiVisionPatternsSkeleton />

      {/* ── Composite Health Score heading ──────────────────────────────── */}
      <div className="mt-10">
        <Skeleton className="h-6 w-52 rounded" />
        <Skeleton className="h-4 w-96 mt-2 rounded" />
      </div>

      {/* ── Score cards ────────────────────────────────────────────────── */}
      <AiVisionScoreCardsSkeleton />

      {/* ── Performance Metrics heading ─────────────────────────────────── */}
      <div className="mt-14">
        <Skeleton className="h-6 w-44 rounded" />
        <Skeleton className="h-4 w-96 mt-2 rounded" />
      </div>

      {/* ── Metric rows ────────────────────────────────────────────────── */}
      <AiVisionMetricRowsSkeleton />
    </div>
  );
}
