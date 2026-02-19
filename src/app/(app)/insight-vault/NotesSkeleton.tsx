import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function NotesSkeleton() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Cards Grid Skeleton - matches NotesClient grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card
            key={`skeleton-${index}`}
            className="relative overflow-hidden border-slate-200/60 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm"
          >
            <CardContent className="p-6 flex flex-col h-full">
              {/* Title section - matches NoteCard title + pin structure */}
              <div className="flex items-start justify-between mb-4">
                <Skeleton className="h-6 w-full flex-1 pr-2" />
                {/* Optional pin icon skeleton - randomly show some */}
                {index % 3 === 0 && (
                  <Skeleton className="h-4 w-4 flex-shrink-0 rounded" />
                )}
              </div>
              
              {/* Preview text section - matches NoteCard preview (line-clamp-3) */}
              <div className="mb-4 flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              
              {/* Strategy and date section - matches NoteCard structure */}
              <div className="space-y-2 mb-4">
                {/* Strategy label + badges */}
                <div className="flex items-start gap-2 flex-wrap">
                  <Skeleton className="h-3 w-16 mt-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
                {/* Date */}
                <Skeleton className="h-3 w-24" />
              </div>
              
              {/* View Details button - matches NoteCard button with arrow */}
              <div className="inline-flex items-center mt-auto gap-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
