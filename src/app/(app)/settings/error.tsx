'use client';

/**
 * Settings-scoped error boundary. Catches errors from the lazy-loaded tab panels
 * (chunk download failures, render-time exceptions) so users see a recoverable
 * retry UI instead of an infinite <PanelSkeleton />.
 *
 * Created as part of the Fix 5 lazy-load rollout — addresses the critical gap
 * flagged in /Users/dragos/.claude/plans/deep-greeting-snowglobe.md where a
 * failed chunk load would otherwise leave the user stuck on a skeleton forever.
 */
export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-0">
      <div className="rounded-2xl border border-rose-300/40 dark:border-rose-700/50 bg-gradient-to-br from-rose-50/60 via-white/30 to-rose-50/60 dark:from-rose-900/20 dark:via-slate-900/20 dark:to-rose-900/20 shadow-lg shadow-rose-200/40 dark:shadow-none backdrop-blur-sm p-6">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
          Couldn&apos;t load this section
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          {error.message?.includes('ChunkLoadError') || error.name === 'ChunkLoadError'
            ? 'The page failed to download a required piece. This usually happens after a deploy — refresh or click retry.'
            : 'Something went wrong while loading this settings section. Please try again.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-slate-50 dark:text-slate-900 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Refresh page
          </button>
        </div>
      </div>
    </div>
  );
}
