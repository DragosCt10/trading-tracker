import { ArrowLeft } from 'lucide-react';
import PostCardSkeleton from '@/components/feed/PostCardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

function CommentRowSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-slate-700/60 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </div>
  );
}

export default function PostDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-0 py-6 space-y-4">
      {/* Back link placeholder */}
      <div className="inline-flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </div>

      {/* Post card skeleton */}
      <PostCardSkeleton />

      {/* Comments section skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-4 space-y-1 divide-y divide-slate-200/80 dark:divide-slate-700/40">
          {Array.from({ length: 4 }).map((_, i) => (
            <CommentRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
