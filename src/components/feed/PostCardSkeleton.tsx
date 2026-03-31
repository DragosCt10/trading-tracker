import { FEED_CARD_SKELETON_SURFACE_CLASS } from './feedCardStyles';

export default function PostCardSkeleton() {
  return (
    <div className={`${FEED_CARD_SKELETON_SURFACE_CLASS} p-5 mb-6`}>
      {/* Author header */}
      <div className="mb-6 flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-slate-200/80 dark:bg-slate-700/60 shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Name + tier badge */}
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-24 rounded bg-slate-200/80 dark:bg-slate-700/60" />
            <div className="h-5 w-10 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />
          </div>
          {/* Handle */}
          <div className="h-3 w-20 rounded bg-slate-200/70 dark:bg-slate-700/40" />
        </div>
        {/* Timestamp + follow button */}
        <div className="ml-auto pl-2 flex items-center gap-2 shrink-0">
          <div className="h-3 w-16 rounded bg-slate-200/70 dark:bg-slate-700/40" />
          <div className="h-3 w-px rounded-full bg-slate-200/70 dark:bg-slate-700/40" />
          <div className="h-7 w-16 rounded-xl bg-slate-200/80 dark:bg-slate-700/60" />
        </div>
      </div>

      {/* Content lines */}
      <div className="space-y-2 mb-4">
        <div className="h-3.5 w-full rounded bg-slate-200/80 dark:bg-slate-700/50" />
        <div className="h-3.5 w-4/5 rounded bg-slate-200/80 dark:bg-slate-700/50" />
        <div className="h-3.5 w-3/5 rounded bg-slate-200/70 dark:bg-slate-700/40" />
      </div>

      {/* Action bar: heart + comment left, ... right */}
      <div className="flex items-center gap-1 pt-3 border-t border-slate-200/80 dark:border-slate-700/40">
        <div className="h-8 w-10 rounded-xl bg-slate-200/80 dark:bg-slate-700/50" />
        <div className="h-8 w-10 rounded-xl bg-slate-200/80 dark:bg-slate-700/50" />
        <div className="h-8 w-8 rounded-xl bg-slate-200/80 dark:bg-slate-700/50 ml-auto" />
      </div>
    </div>
  );
}
