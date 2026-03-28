'use client';

// src/components/dashboard/ai-vision/AiVisionSkeleton.tsx
import { cn } from '@/lib/utils';

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-700/50', className)} />
  );
}

export function AiVisionSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Filter bar */}
      <SkeletonBox className="h-12 w-full" />

      {/* Score cards */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <SkeletonBox key={i} className="h-32" />
        ))}
      </div>

      {/* Radar chart */}
      <SkeletonBox className="h-72 w-full" />

      {/* Metric rows */}
      <div className="flex flex-col gap-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            <SkeletonBox className="h-10" />
            <SkeletonBox className="h-10" />
            <SkeletonBox className="h-10" />
            <SkeletonBox className="h-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
