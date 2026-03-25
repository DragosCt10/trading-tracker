import { FEED_CARD_SKELETON_SURFACE_CLASS } from './feedCardStyles';

/** Matches expanded `InlineCreatePostCard`: avatar, name + tier, textarea, Attach Trade + Post. */
export default function CreatePostCardSkeleton() {
  return (
    <div className={FEED_CARD_SKELETON_SURFACE_CLASS}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200/80 dark:bg-slate-700/60 shrink-0" />
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-3.5 w-28 rounded bg-slate-200/80 dark:bg-slate-700/60" />
              <div className="h-5 w-14 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />
            </div>
            <div className="min-h-[4.5rem] w-full rounded-lg bg-slate-200/60 dark:bg-slate-700/40" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-200/80 dark:border-slate-700/40 pt-3">
          <div className="h-9 w-[7.5rem] rounded-xl bg-slate-200/80 dark:bg-slate-700/50" />
          <div className="h-9 w-[5.25rem] rounded-xl bg-slate-200/80 dark:bg-slate-700/60" />
        </div>
      </div>
    </div>
  );
}
