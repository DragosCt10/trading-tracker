/**
 * Skeleton placeholder shown while a lazily-loaded settings tab panel chunk
 * downloads. Matches the visual footprint (border + gradient card) of the real
 * panels so tab switches don't cause Cumulative Layout Shift.
 *
 * Rendered via `next/dynamic({ loading: PanelSkeleton })` in SettingsClient.tsx.
 */
export function PanelSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading settings section"
      className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6 min-h-[420px]"
    >
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-40 rounded bg-slate-200/70 dark:bg-slate-700/50" />
        <div className="h-3 w-64 rounded bg-slate-200/60 dark:bg-slate-700/40" />
        <div className="mt-6 space-y-3">
          <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
          <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
          <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-slate-200/70 dark:bg-slate-700/50" />
      </div>
    </div>
  );
}
