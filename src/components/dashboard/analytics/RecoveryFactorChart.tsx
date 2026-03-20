'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { GaugeChartCard, GradientStop } from './GaugeChartCard';

interface RecoveryFactorChartProps {
  recoveryFactor: number;
  isPro?: boolean;
}

const MAX_SCALE = 5.0;

export const RecoveryFactorChart = React.memo(function RecoveryFactorChart({ recoveryFactor: rawFactor, isPro }: RecoveryFactorChartProps) {
  const isLocked = !isPro;
  const PREVIEW_RECOVERY_FACTOR = 1.65;
  const recoveryFactor = isLocked ? PREVIEW_RECOVERY_FACTOR : rawFactor;

  const cappedValue = Math.max(0, Math.min(recoveryFactor, MAX_SCALE));
  const percentage = (cappedValue / MAX_SCALE) * 100;

  const isEmpty = isPro && rawFactor === 0;

  const displayValue = recoveryFactor >= MAX_SCALE ? '5+' : recoveryFactor.toFixed(2);

  const getGradientStops = (): GradientStop[] => {
    if (recoveryFactor < 0.5) return [
      { offset: '0%', stopColor: '#f43f5e', stopOpacity: 1 },
      { offset: '100%', stopColor: '#e11d48', stopOpacity: 0.9 },
    ];
    if (recoveryFactor < 1.0) return [
      { offset: '0%', stopColor: '#f59e0b', stopOpacity: 1 },
      { offset: '100%', stopColor: '#d97706', stopOpacity: 0.9 },
    ];
    if (recoveryFactor < 2.0) return [
      { offset: '0%', stopColor: '#eab308', stopOpacity: 1 },
      { offset: '50%', stopColor: '#facc15', stopOpacity: 0.95 },
      { offset: '100%', stopColor: '#ca8a04', stopOpacity: 0.9 },
    ];
    if (recoveryFactor < 3.0) return [
      { offset: '0%', stopColor: '#10b981', stopOpacity: 1 },
      { offset: '50%', stopColor: '#14b8a6', stopOpacity: 0.95 },
      { offset: '100%', stopColor: '#0d9488', stopOpacity: 0.9 },
    ];
    return [
      { offset: '0%', stopColor: '#3b82f6', stopOpacity: 1 },
      { offset: '50%', stopColor: '#2563eb', stopOpacity: 0.95 },
      { offset: '100%', stopColor: '#1d4ed8', stopOpacity: 0.9 },
    ];
  };

  const getTextColor = () => {
    if (recoveryFactor < 0.5) return 'text-rose-600 dark:text-rose-400';
    if (recoveryFactor < 1.0) return 'text-amber-600 dark:text-amber-400';
    if (recoveryFactor < 2.0) return 'text-yellow-600 dark:text-yellow-400';
    if (recoveryFactor < 3.0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getDotColor = () => {
    if (recoveryFactor < 0.5) return 'bg-rose-500 dark:bg-rose-400 ring-rose-200/50 dark:ring-rose-500/30';
    if (recoveryFactor < 1.0) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    if (recoveryFactor < 2.0) return 'bg-yellow-500 dark:bg-yellow-400 ring-yellow-200/50 dark:ring-yellow-500/30';
    if (recoveryFactor < 3.0) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
  };

  const infoContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Recovery Factor Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', recoveryFactor < 0.5 ? 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔴 &lt; 0.5</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Poor — Profits barely cover drawdown risk. Strategy may not be viable long-term.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', recoveryFactor >= 0.5 && recoveryFactor < 1 ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 0.5 – 0.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Developing — Profitable but recovery from drawdowns is slow.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', recoveryFactor >= 1 && recoveryFactor < 2 ? 'bg-yellow-50/80 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟡 1.0 – 1.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Good — Net profits exceed max drawdown. Strategy recovers efficiently.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', recoveryFactor >= 2 && recoveryFactor < 3 ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 2.0 – 2.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strong — High profitability relative to risk. Drawdowns are well-controlled.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', recoveryFactor >= 3 ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 3.0+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional — Profits significantly outpace drawdowns. Highly resilient strategy.</div>
        </div>
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/40 dark:border-slate-700/30">
        Formula: Total P&amp;L% ÷ Max Drawdown%
      </div>
    </div>
  );

  return (
    <GaugeChartCard
      title="Recovery Factor"
      description="Profit vs max drawdown"
      isPro={isPro}
      isEmpty={isEmpty}
      percentage={percentage}
      dataName="Recovery Factor"
      gradientStops={getGradientStops()}
      scaleLeft="0"
      scaleRight="5.0"
      centerValue={<span className={cn('tabular-nums', getTextColor())}>{displayValue}</span>}
      targetText="Target: 1.0+"
      hoverLabel="Recovery Factor"
      hoverValue={displayValue}
      hoverValueColor={getTextColor()}
      hoverDotColor={getDotColor()}
      hoverSubtext={`${percentage.toFixed(1)}% of maximum scale`}
      infoContent={infoContent}
    />
  );
});
