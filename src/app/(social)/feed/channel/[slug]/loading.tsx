import { Skeleton } from '@/components/ui/skeleton';
import PostCardSkeleton from '@/components/feed/PostCardSkeleton';

export default function ChannelLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-0 py-6 space-y-4">
      {/* Back link */}
      <Skeleton className="h-4 w-24 rounded" />

      {/* Channel header */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
            <div className="space-y-2 min-w-0">
              <Skeleton className="h-8 w-48 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
          </div>
          <Skeleton className="h-8 w-16 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
