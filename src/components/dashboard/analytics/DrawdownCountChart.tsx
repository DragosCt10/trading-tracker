'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { GaugeChartCard, GradientStop } from './GaugeChartCard';

interface DrawdownCountChartProps {
  drawdownCount: number;
  isPro?: boolean;
}

const MAX_SCALE = 20;

export const DrawdownCountChart = React.memo(function DrawdownCountChart({ drawdownCount: rawCount, isPro }: DrawdownCountChartProps) {
  const isLocked = !isPro;
  const PREVIEW_DRAWDOWN_COUNT = 7;
  const drawdownCount = isLocked ? PREVIEW_DRAWDOWN_COUNT : rawCount;

  const cappedValue = Math.max(0, Math.min(drawdownCount, MAX_SCALE));
  const percentage = (cappedValue / MAX_SCALE) * 100;

  const isEmpty = isPro && rawCount === 0;

  const displayValue = drawdownCount >= MAX_SCALE ? '20+' : String(drawdownCount);

  const getGradientStops = (): GradientStop[] => {
    if (drawdownCount <= 2) return [
      { offset: '0%', stopColor: '#3b82f6', stopOpacity: 1 },
      { offset: '50%', stopColor: '#2563eb', stopOpacity: 0.95 },
      { offset: '100%', stopColor: '#1d4ed8', stopOpacity: 0.9 },
    ];
    if (drawdownCount <= 5) return [
      { offset: '0%', stopColor: '#10b981', stopOpacity: 1 },
      { offset: '50%', stopColor: '#14b8a6', stopOpacity: 0.95 },
      { offset: '100%', stopColor: '#0d9488', stopOpacity: 0.9 },
    ];
    if (drawdownCount <= 9) return [
      { offset: '0%', stopColor: '#eab308', stopOpacity: 1 },
      { offset: '50%', stopColor: '#facc15', stopOpacity: 0.95 },
      { offset: '100%', stopColor: '#ca8a04', stopOpacity: 0.9 },
    ];
    if (drawdownCount <= 14) return [
      { offset: '0%', stopColor: '#f59e0b', stopOpacity: 1 },
      { offset: '100%', stopColor: '#d97706', stopOpacity: 0.9 },
    ];
    return [
      { offset: '0%', stopColor: '#f43f5e', stopOpacity: 1 },
      { offset: '100%', stopColor: '#e11d48', stopOpacity: 0.9 },
    ];
  };

  const getTextColor = () => {
    if (drawdownCount <= 2) return 'text-blue-600 dark:text-blue-400';
    if (drawdownCount <= 5) return 'text-emerald-600 dark:text-emerald-400';
    if (drawdownCount <= 9) return 'text-yellow-600 dark:text-yellow-400';
    if (drawdownCount <= 14) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getDotColor = () => {
    if (drawdownCount <= 2) return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
    if (drawdownCount <= 5) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    if (drawdownCount <= 9) return 'bg-yellow-500 dark:bg-yellow-400 ring-yellow-200/50 dark:ring-yellow-500/30';
    if (drawdownCount <= 14) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    return 'bg-rose-500 dark:bg-rose-400 ring-rose-200/50 dark:ring-rose-500/30';
  };

  const infoContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Drawdown Periods Interpretation
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Counts how many times your equity dropped below its peak and had to recover. Fewer periods indicate a smoother, more consistent equity curve.
      </p>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownCount <= 2 ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 0 – 2</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional — Very smooth equity curve. Drawdowns are rare and brief.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownCount >= 3 && drawdownCount <= 5 ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 3 – 5</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strong — Consistent performance with few losing streaks.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownCount >= 6 && drawdownCount <= 9 ? 'bg-yellow-50/80 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟡 6 – 9</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Moderate — Normal for active traders. Review loss clustering patterns.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownCount >= 10 && drawdownCount <= 14 ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 10 – 14</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High Frequency — Equity is volatile. Consider tighter drawdown rules.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownCount >= 15 ? 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔴 15+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Very Choppy — Frequent equity swings. Strategy consistency needs attention.</div>
        </div>
      </div>
    </div>
  );

  return (
    <GaugeChartCard
      title="Drawdown Periods"
      description="Number of equity dips below peak"
      isPro={isPro}
      isEmpty={isEmpty}
      percentage={percentage}
      dataName="Drawdown Periods"
      gradientStops={getGradientStops()}
      scaleLeft="0"
      scaleRight="20"
      centerValue={<span className={cn('tabular-nums', getTextColor())}>{displayValue}</span>}
      targetText="Target: < 5"
      hoverLabel="Drawdown Periods"
      hoverValue={displayValue}
      hoverValueColor={getTextColor()}
      hoverDotColor={getDotColor()}
      hoverSubtext={`${percentage.toFixed(1)}% of maximum scale`}
      infoContent={infoContent}
    />
  );
});
