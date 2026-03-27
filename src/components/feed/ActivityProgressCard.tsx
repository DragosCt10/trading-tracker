'use client';

import { Trophy, CheckCircle2 } from 'lucide-react';
import { FEED_CARD_SURFACE_CLASS } from './feedCardStyles';
import { useActivityProgress } from '@/hooks/useActivityProgress';
import { cn } from '@/lib/utils';

const MILESTONES = [100, 200];
const MILESTONE_LABELS = [100, 200, 300];
const GOAL = 300;

function ProgressSkeleton() {
  return (
    <div className={cn(FEED_CARD_SURFACE_CLASS, 'p-4 animate-pulse')}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full mb-3" />
      <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
}

export default function ActivityProgressCard({
  profileId,
  initialCount,
}: {
  profileId: string | null;
  initialCount?: { posts: number; comments: number; total: number };
}) {
  const { total, isLoading } = useActivityProgress(profileId, initialCount);

  if (!profileId) return null;
  if (isLoading) return <ProgressSkeleton />;

  const pct = Math.min((total / GOAL) * 100, 100);
  const isDone = total >= GOAL;

  return (
    <div className={cn(FEED_CARD_SURFACE_CLASS, 'p-4')}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shrink-0">
          <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex-1">Rank Up</p>
        {!isDone && (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            {total}/{GOAL}
          </span>
        )}
      </div>

      {isDone ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
          <span className="font-medium">Discount earned! Check your notifications.</span>
        </div>
      ) : (
        <>
          {/* Progress bar with milestone ticks */}
          <div className="relative mb-1">
            <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {MILESTONES.map((m) => (
              <div
                key={m}
                className={cn(
                  'absolute top-0 -translate-x-px w-0.5 h-2.5 rounded-full',
                  total >= m
                    ? 'bg-amber-700 dark:bg-amber-300'
                    : 'bg-slate-300 dark:bg-slate-600',
                )}
                style={{ left: `${(m / GOAL) * 100}%` }}
              />
            ))}
          </div>

          {/* Milestone labels */}
          <div className="relative h-4 mb-2">
            {MILESTONE_LABELS.map((m) => (
              <span
                key={m}
                className={cn(
                  'absolute text-[10px] text-slate-400 dark:text-slate-500',
                  m === GOAL ? 'right-0' : '-translate-x-1/2',
                )}
                style={m === GOAL ? undefined : { left: `${(m / GOAL) * 100}%` }}
              >
                {m}
              </span>
            ))}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Earn 15% off PRO at 300 posts &amp; comments
          </p>
        </>
      )}
    </div>
  );
}
