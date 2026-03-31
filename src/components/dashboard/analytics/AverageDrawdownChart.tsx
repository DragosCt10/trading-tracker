'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { GaugeChartCard, GradientStop } from './GaugeChartCard';

interface AverageDrawdownChartProps {
  averageDrawdown: number;
  isPro?: boolean;
}

export const AverageDrawdownChart = React.memo(function AverageDrawdownChart({ averageDrawdown: rawDrawdown, isPro }: AverageDrawdownChartProps) {
  const isLocked = !isPro;
  const PREVIEW_AVERAGE_DRAWDOWN = 4.8;
  const averageDrawdown = isLocked ? PREVIEW_AVERAGE_DRAWDOWN : rawDrawdown;

  const normalizedValue = Math.max(0, Math.min(averageDrawdown, 20));
  const percentage = (normalizedValue / 20) * 100;

  const getGradientStops = (): GradientStop[] => {
    if (averageDrawdown <= 2) return [
      { offset: '0%', stopColor: '#3b82f6', stopOpacity: 1 },
      { offset: '100%', stopColor: '#2563eb', stopOpacity: 0.9 },
    ];
    if (averageDrawdown <= 5) return [
      { offset: '0%', stopColor: '#10b981', stopOpacity: 1 },
      { offset: '50%', stopColor: '#14b8a6', stopOpacity: 0.95 },
      { offset: '100%', stopColor: '#0d9488', stopOpacity: 0.9 },
    ];
    if (averageDrawdown <= 10) return [
      { offset: '0%', stopColor: '#f59e0b', stopOpacity: 1 },
      { offset: '100%', stopColor: '#d97706', stopOpacity: 0.9 },
    ];
    if (averageDrawdown <= 15) return [
      { offset: '0%', stopColor: '#f97316', stopOpacity: 1 },
      { offset: '100%', stopColor: '#ea580c', stopOpacity: 0.9 },
    ];
    return [
      { offset: '0%', stopColor: '#ef4444', stopOpacity: 1 },
      { offset: '100%', stopColor: '#dc2626', stopOpacity: 0.9 },
    ];
  };

  const getTextColor = () => {
    if (averageDrawdown <= 2) return 'text-blue-600 dark:text-blue-400';
    if (averageDrawdown <= 5) return 'text-emerald-600 dark:text-emerald-400';
    if (averageDrawdown <= 10) return 'text-amber-600 dark:text-amber-400';
    if (averageDrawdown <= 15) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getDotColor = () => {
    if (averageDrawdown <= 2) return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
    if (averageDrawdown <= 5) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    if (averageDrawdown <= 10) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    if (averageDrawdown <= 15) return 'bg-orange-500 dark:bg-orange-400 ring-orange-200/50 dark:ring-orange-500/30';
    return 'bg-red-500 dark:bg-red-400 ring-red-200/50 dark:ring-red-500/30';
  };

  const infoContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Average Drawdown Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', averageDrawdown <= 2 ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔹 0% – 2%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Excellent — Very low average drawdown, consistent performance.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', averageDrawdown > 2 && averageDrawdown <= 5 ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">✅ 2% – 5%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Healthy — Acceptable average drawdown for most strategies.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', averageDrawdown > 5 && averageDrawdown <= 10 ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">⚠️ 5% – 10%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Moderate — Higher average drawdown, monitor risk management.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', averageDrawdown > 10 && averageDrawdown <= 15 ? 'bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">❗ 10% – 15%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High Risk — Significant average drawdown exposure.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', averageDrawdown > 15 ? 'bg-red-50/80 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🚫 15%+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Danger Zone — Extreme average drawdown, immediate review required.</div>
        </div>
      </div>
    </div>
  );

  return (
    <GaugeChartCard
      title="Average Drawdown"
      description="Mean drawdown percentage"
      isPro={isPro}
      percentage={percentage}
      dataName="Average Drawdown"
      gradientStops={getGradientStops()}
      scaleLeft="0%"
      scaleRight="20%"
      centerValue={<span className={getTextColor()}>{averageDrawdown.toFixed(2)}%</span>}
      targetText="Target: < 5%"
      hoverLabel="Average Drawdown"
      hoverValue={`${averageDrawdown.toFixed(2)}%`}
      hoverValueColor={getTextColor()}
      hoverDotColor={getDotColor()}
      hoverSubtext={`${percentage.toFixed(1)}% of maximum scale`}
      infoContent={infoContent}
    />
  );
});
