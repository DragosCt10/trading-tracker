export default function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-5 animate-pulse">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-slate-200/90 dark:bg-slate-700/60 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Author row */}
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-24 rounded bg-slate-200/90 dark:bg-slate-700/60" />
            <div className="h-3 w-16 rounded bg-slate-200/70 dark:bg-slate-700/40" />
          </div>
          {/* Content lines */}
          <div className="h-3.5 w-full rounded bg-slate-200/80 dark:bg-slate-700/50" />
          <div className="h-3.5 w-4/5 rounded bg-slate-200/80 dark:bg-slate-700/50" />
          <div className="h-3.5 w-3/5 rounded bg-slate-200/70 dark:bg-slate-700/40" />
        </div>
      </div>
      {/* Action bar */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/40">
        <div className="h-7 w-14 rounded-lg bg-slate-200/80 dark:bg-slate-700/40" />
        <div className="h-7 w-14 rounded-lg bg-slate-200/80 dark:bg-slate-700/40" />
        <div className="h-7 w-10 rounded-lg bg-slate-200/80 dark:bg-slate-700/40" />
      </div>
    </div>
  );
}
