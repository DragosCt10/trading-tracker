import { Card } from '@/components/ui/card';

/**
 * Skeleton placeholder that mirrors the anatomy of `StrategyCard` — header,
 * equity chart area, metrics column, total trades line, extra stats pills,
 * and the action-buttons footer. Kept pixel-faithful so the real card swaps
 * in without a visual jump.
 */
export function StrategyCardSkeleton() {
  return (
    <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm">
      <div className="relative p-6 flex flex-col h-full">
        {/* Header: name + % badge + share button */}
        <div className="flex items-start justify-between mb-2 gap-3">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 animate-pulse" />
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-5 w-14 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Chart */}
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4 animate-pulse" />

        {/* Metrics: Win rate (left) | Total RR / Avg RR / Profit (right) */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-1.5">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-14 animate-pulse" />
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-10 animate-pulse" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-baseline gap-2">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-14 animate-pulse" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-10 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-12 animate-pulse" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-10 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-10 animate-pulse" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Total trades */}
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4 animate-pulse" />

        {/* Extra stats cards section */}
        <div className="mb-4">
          <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-1.5 animate-pulse" />
          <div className="flex flex-wrap gap-1">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
            <div className="h-5 w-28 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Action buttons: Edit + Analytics | Delete */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          </div>
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </Card>
  );
}
