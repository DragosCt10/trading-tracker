'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EARLY_BIRD_LIMIT,
  EARLY_BIRD_MONTHLY_PRICE,
} from '@/constants/earlyBird';

interface EarlyBirdBannerProps {
  slotsUsed: number;
  className?: string;
}

export function EarlyBirdBanner({ slotsUsed, className }: EarlyBirdBannerProps) {
  if (slotsUsed >= EARLY_BIRD_LIMIT) return null;

  const percentClaimed = Math.min(
    100,
    Math.max(0, Math.round((slotsUsed / EARLY_BIRD_LIMIT) * 100)),
  );

  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/60 bg-white/60 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/30 dark:shadow-none sm:p-5',
        className,
      )}
    >
      <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white"
            style={{
              background:
                'linear-gradient(135deg, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
              Launch offer — ${EARLY_BIRD_MONTHLY_PRICE}/mo
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Locked in for as long as you stay subscribed. Applies to monthly and annual.
            </p>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300"
          aria-hidden="true"
        >
          {percentClaimed}% claimed
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Early bird slots claimed"
        aria-valuenow={percentClaimed}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/50"
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{
            width: `${percentClaimed}%`,
            background:
              'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
          }}
        />
      </div>
    </div>
  );
}
