import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function NoteCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <Card
      className="relative overflow-hidden border-slate-200/60 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm"
    >
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-6 w-full flex-1 pr-2" />
          {index % 3 === 0 && (
            <Skeleton className="h-4 w-4 flex-shrink-0 rounded" />
          )}
        </div>

        <div className="mb-4 flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2 flex-wrap">
            <Skeleton className="h-3 w-16 mt-0.5" />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-3 w-24" />
        </div>

        <div className="inline-flex items-center mt-auto gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
