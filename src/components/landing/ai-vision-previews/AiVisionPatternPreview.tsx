'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, ShieldCheck, Clock, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Pattern {
  type: 'strength' | 'warning' | 'insight';
  icon: typeof TrendingUp;
  iconColor: string;
  titleColor: string;
  title: string;
  description: string;
  periods: string[];
}

const PATTERN_SETS: Pattern[][] = [
  // Set 1: Time edge + revenge trading + market profit factor
  [
    {
      type: 'strength',
      icon: TrendingUp,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      titleColor: 'text-emerald-700 dark:text-emerald-400',
      title: 'Best window: 08:00–09:59',
      description: '78.3% win rate during 08:00–09:59 (42 trades).',
      periods: ['7d', '30d'],
    },
    {
      type: 'warning',
      icon: AlertTriangle,
      iconColor: 'text-amber-500 dark:text-amber-400',
      titleColor: 'text-amber-700 dark:text-amber-400',
      title: 'Revenge trading detected',
      description: 'After a loss, the next trade loses 62% of the time (38 sequences).',
      periods: ['30d'],
    },
    {
      type: 'insight',
      icon: Lightbulb,
      iconColor: 'text-blue-500 dark:text-blue-400',
      titleColor: 'text-blue-700 dark:text-blue-400',
      title: 'NAS100 outperforms',
      description: 'Profit factor of 2.8 vs 1.4 avg on other instruments.',
      periods: ['7d', '30d', '90d'],
    },
  ],
  // Set 2: Risk trend + day weakness + market consistency
  [
    {
      type: 'strength',
      icon: ShieldCheck,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      titleColor: 'text-emerald-700 dark:text-emerald-400',
      title: 'Risk management improving',
      description: 'Average risk per trade: 2.0% (90d) → 1.2% (30d) → 0.8% (7d).',
      periods: ['30d', '90d'],
    },
    {
      type: 'warning',
      icon: TrendingDown,
      iconColor: 'text-red-500 dark:text-red-400',
      titleColor: 'text-red-700 dark:text-red-400',
      title: 'Weakest day: Friday',
      description: '38.5% win rate across 26 trades.',
      periods: ['7d', '30d'],
    },
    {
      type: 'insight',
      icon: Lightbulb,
      iconColor: 'text-blue-500 dark:text-blue-400',
      titleColor: 'text-blue-700 dark:text-blue-400',
      title: 'EUR/USD consistency leader',
      description: '82% consistency score — your most reliable instrument.',
      periods: ['30d', '90d'],
    },
  ],
  // Set 3: Overtrading after losses + setup PF + direction bias
  [
    {
      type: 'warning',
      icon: Repeat,
      iconColor: 'text-amber-500 dark:text-amber-400',
      titleColor: 'text-amber-700 dark:text-amber-400',
      title: 'Overtrading on red days',
      description: 'You take 3.2x more trades after a losing day (6.4 vs 2.0 avg).',
      periods: ['7d', '30d'],
    },
    {
      type: 'strength',
      icon: TrendingUp,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      titleColor: 'text-emerald-700 dark:text-emerald-400',
      title: 'Breakout setups excelling',
      description: 'Breakout entries yield 3.4 profit factor (18 trades).',
      periods: ['30d'],
    },
    {
      type: 'insight',
      icon: Lightbulb,
      iconColor: 'text-blue-500 dark:text-blue-400',
      titleColor: 'text-blue-700 dark:text-blue-400',
      title: 'Long trades outperform',
      description: 'Longs win at 71.2% vs 54.8% for shorts (16pp gap).',
      periods: ['7d', '30d', '90d'],
    },
  ],
  // Set 4: Sharpe trend + drawdown cluster + time weakness
  [
    {
      type: 'strength',
      icon: TrendingUp,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      titleColor: 'text-emerald-700 dark:text-emerald-400',
      title: 'Sharpe ratio consistently improving',
      description: '0.82 (90d) → 1.45 (30d) → 2.10 (7d).',
      periods: ['30d', '90d'],
    },
    {
      type: 'warning',
      icon: AlertTriangle,
      iconColor: 'text-amber-500 dark:text-amber-400',
      titleColor: 'text-amber-700 dark:text-amber-400',
      title: 'Large drawdown cluster',
      description: '3 drawdowns > 5% detected — unusual spike in volatility.',
      periods: ['7d'],
    },
    {
      type: 'insight',
      icon: Clock,
      iconColor: 'text-blue-500 dark:text-blue-400',
      titleColor: 'text-blue-700 dark:text-blue-400',
      title: 'Weakest window: 14:00–15:59',
      description: '38.9% win rate during 14:00–15:59 (18 trades).',
      periods: ['7d', '30d'],
    },
  ],
];

export function AiVisionPatternPreview() {
  const [activeSet, setActiveSet] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveSet((i) => (i + 1) % PATTERN_SETS.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const patterns = PATTERN_SETS[activeSet];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="text-sm font-semibold text-white/90">Patterns</h4>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/50 transition-opacity duration-300"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          {patterns.length} detected
        </span>
        {/* Progress dots */}
        <div className="flex items-center gap-1 ml-auto">
          {PATTERN_SETS.map((_, i) => (
            <div
              key={i}
              className="h-0.5 rounded-full transition-all duration-300"
              style={{
                width: i === activeSet ? 14 : 4,
                backgroundColor: i === activeSet
                  ? 'var(--tc-primary, #a855f7)'
                  : 'rgba(100, 116, 139, 0.3)',
              }}
            />
          ))}
        </div>
      </div>
      {patterns.map((pattern, idx) => {
        const Icon = pattern.icon;
        return (
          <div
            key={`${activeSet}-${idx}`}
            className={cn(
              'rounded-xl border border-slate-700/50',
              'bg-slate-800/40 backdrop-blur-sm',
              'px-3.5 py-2.5',
              'transition-all duration-500 ease-out',
            )}
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? 'translateY(6px)' : 'translateY(0)',
              transitionDelay: `${idx * 80}ms`,
            }}
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
