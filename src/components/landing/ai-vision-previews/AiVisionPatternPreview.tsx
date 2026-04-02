'use client';

import { TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOCK_PATTERNS = [
  {
    type: 'strength' as const,
    icon: TrendingUp,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    titleColor: 'text-emerald-700 dark:text-emerald-400',
    title: 'Strong morning session edge',
    description: 'Win rate jumps to 78% in the 9:30–11:00 window.',
    periods: ['7d', '30d'],
  },
  {
    type: 'warning' as const,
    icon: AlertTriangle,
    iconColor: 'text-amber-500 dark:text-amber-400',
    titleColor: 'text-amber-700 dark:text-amber-400',
    title: 'Revenge trading detected',
    description: 'After a loss, next trade loses 62% of the time.',
    periods: ['30d'],
  },
  {
    type: 'insight' as const,
    icon: Lightbulb,
    iconColor: 'text-blue-500 dark:text-blue-400',
    titleColor: 'text-blue-700 dark:text-blue-400',
    title: 'NAS100 outperforms',
    description: 'Profit factor of 2.8 vs 1.4 on other instruments.',
    periods: ['7d', '30d', '90d'],
  },
];

export function AiVisionPatternPreview() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="text-sm font-semibold text-white/90">Patterns</h4>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/50">
          3 detected
        </span>
      </div>
      {MOCK_PATTERNS.map((pattern) => {
        const Icon = pattern.icon;
        return (
          <div
            key={pattern.title}
            className={cn(
              'rounded-xl border border-slate-700/50',
              'bg-slate-800/40 backdrop-blur-sm',
              'px-3.5 py-2.5',
            )}
          >
            <div className="flex items-center gap-2.5">
              <Icon className={cn('h-4 w-4 shrink-0', pattern.iconColor)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn('text-[12px] font-semibold leading-tight', pattern.titleColor)}>
                    {pattern.title}
                  </span>
                  {pattern.periods.map((p) => (
                    <span
                      key={p}
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-slate-700/50 text-slate-400"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  {pattern.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
