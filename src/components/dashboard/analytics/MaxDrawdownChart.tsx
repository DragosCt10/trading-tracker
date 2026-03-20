'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { GaugeChartCard, GradientStop } from './GaugeChartCard';

interface MaxDrawdownChartProps {
  maxDrawdown: number | null | undefined;
  isPro?: boolean;
}

export const MaxDrawdownChart = React.memo(function MaxDrawdownChart({ maxDrawdown: rawMaxDrawdown, isPro }: MaxDrawdownChartProps) {
  const isLocked = !isPro;
  const PREVIEW_MAX_DRAWDOWN = 6.2;
  const maxDrawdown = isLocked ? PREVIEW_MAX_DRAWDOWN : rawMaxDrawdown;

  const drawdownValue = maxDrawdown ?? 0;
  const normalizedValue = Math.max(0, Math.min(drawdownValue, 20));
  const percentage = (normalizedValue / 20) * 100;

  const getGradientStops = (): GradientStop[] => {
    if (drawdownValue <= 2) return [
      { offset: '0%', stopColor: '#3b82f6', stopOpacity: 1 },
      { offset: '100%', stopColor: '#2563eb', stopOpacity: 0.9 },
    ];
    if (drawdownValue <= 5) return [
      { offset: '0%', stopColor: '#10b981', stopOpacity: 1 },
      { offset: '50%', stopColor: '#14b8a6', stopOpacity: 0.95 },
      { offset: '100%', stopColor: '#0d9488', stopOpacity: 0.9 },
    ];
    if (drawdownValue <= 10) return [
      { offset: '0%', stopColor: '#f59e0b', stopOpacity: 1 },
      { offset: '100%', stopColor: '#d97706', stopOpacity: 0.9 },
    ];
    if (drawdownValue <= 20) return [
      { offset: '0%', stopColor: '#f97316', stopOpacity: 1 },
      { offset: '100%', stopColor: '#ea580c', stopOpacity: 0.9 },
    ];
    return [
      { offset: '0%', stopColor: '#ef4444', stopOpacity: 1 },
      { offset: '100%', stopColor: '#dc2626', stopOpacity: 0.9 },
    ];
  };

  const getTextColor = () => {
    if (drawdownValue <= 2) return 'text-blue-600 dark:text-blue-400';
    if (drawdownValue <= 5) return 'text-emerald-600 dark:text-emerald-400';
    if (drawdownValue <= 10) return 'text-amber-600 dark:text-amber-400';
    if (drawdownValue <= 20) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getDotColor = () => {
    if (drawdownValue <= 2) return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
    if (drawdownValue <= 5) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    if (drawdownValue <= 10) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    if (drawdownValue <= 20) return 'bg-orange-500 dark:bg-orange-400 ring-orange-200/50 dark:ring-orange-500/30';
    return 'bg-red-500 dark:bg-red-400 ring-red-200/50 dark:ring-red-500/30';
  };

  const displayValue = maxDrawdown !== null && maxDrawdown !== undefined
    ? `${maxDrawdown.toFixed(2)}%`
    : '—';

  const infoContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Max Drawdown Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownValue <= 2 ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔹 0% – 2%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Excellent — Very low risk with minimal drawdown exposure.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownValue > 2 && drawdownValue <= 5 ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">✅ 2% – 5%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Healthy/Moderate — Acceptable risk level for most strategies.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownValue > 5 && drawdownValue <= 10 ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">⚠️ 5% – 10%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Aggressive but Acceptable — Higher risk, monitor closely.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownValue > 10 && drawdownValue <= 20 ? 'bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">❗ 10% – 20%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High Risk — Significant drawdown exposure, consider risk management.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownValue > 20 ? 'bg-red-50/80 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🚫 20%+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Danger Zone — Extreme risk level, immediate review required.</div>
        </div>
      </div>
    </div>
  );

  return (
    <GaugeChartCard
      title="Max Drawdown"
      description="Maximum drawdown percentage"
      isPro={isPro}
      percentage={percentage}
      dataName="Max Drawdown"
      gradientStops={getGradientStops()}
      scaleLeft="0%"
      scaleRight="20%"
      centerValue={<span className={getTextColor()}>{displayValue}</span>}
      targetText="Target: < 5%"
      hoverLabel="Max Drawdown"
      hoverValue={displayValue}
      hoverValueColor={getTextColor()}
      hoverDotColor={getDotColor()}
      hoverSubtext={`${percentage.toFixed(1)}% of maximum scale`}
      infoContent={infoContent}
    />
  );
});
