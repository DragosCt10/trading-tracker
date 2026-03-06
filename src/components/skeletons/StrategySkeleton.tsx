import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BouncePulse } from '@/components/ui/bounce-pulse';

export function StrategySkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header: Yearly Stats + year dropdown */}
      <div className="flex justify-between items-center my-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="w-28">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Account Overview card (large chart + balance) */}
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
            <div className="w-full h-full flex items-center justify-center">
              <BouncePulse size="md" />
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Month stats row: Best Month + Worst Month */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <Card className="flex-1 relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
        <Card className="flex-1 relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
      </div>

      {/* Stat cards grid: row 1 (Profit Factor, Consistency Score, Average Monthly Trades) + row 2 (Average Monthly Profit, Sharpe Ratio, Non-Executed Trades) */}
      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 pb-8 w-full">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
