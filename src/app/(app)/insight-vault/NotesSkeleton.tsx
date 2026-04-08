import { NoteCardSkeleton } from '@/components/dashboard/insight-vault/NoteCardSkeleton';

export function NotesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl shadow-sm themed-header-icon-box w-11 h-11" />
          <div className="h-9 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <NoteCardSkeleton key={`skeleton-${index}`} index={index} />
        ))}
      </div>
    </div>
  );
}
