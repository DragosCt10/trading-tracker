'use client';

import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetectedPattern, PatternType } from '@/utils/detectTradingPatterns';

const TYPE_CONFIG: Record<PatternType, {
  title: string;
  icon: typeof TrendingUp;
  iconColor: string;
}> = {
  strength: {
    title: 'text-emerald-700 dark:text-emerald-400',
    icon: TrendingUp,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
  weakness: {
    title: 'text-rose-700 dark:text-rose-400',
    icon: TrendingDown,
    iconColor: 'text-rose-500 dark:text-rose-400',
  },
  insight: {
    title: 'text-blue-700 dark:text-blue-400',
    icon: Lightbulb,
    iconColor: 'text-blue-500 dark:text-blue-400',
  },
  warning: {
    title: 'text-amber-700 dark:text-amber-400',
    icon: AlertTriangle,
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
};

interface AiVisionPatternCardProps {
  pattern: DetectedPattern;
}

export function AiVisionPatternCard({ pattern }: AiVisionPatternCardProps) {
  const cfg = TYPE_CONFIG[pattern.type];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/70 dark:border-slate-700/50',
        'bg-slate-50/50 dark:bg-slate-800/30',
        'px-4 py-3',
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5 shrink-0', cfg.iconColor)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[13px] font-semibold leading-tight', cfg.title)}>
              {pattern.title}
            </span>
            {pattern.periods && pattern.periods.length > 0 && (
              <div className="flex gap-1">
                {pattern.periods.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {pattern.description}
          </p>
        </div>
      </div>
    </div>
  );
}
