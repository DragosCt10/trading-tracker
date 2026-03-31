'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { GaugeChartCard, GradientStop } from './GaugeChartCard';

interface ConsistencyScoreChartProps {
  consistencyScore: number;
  isPro?: boolean;
}

export const ConsistencyScoreChart = React.memo(function ConsistencyScoreChart({ consistencyScore: rawScore, isPro }: ConsistencyScoreChartProps) {
  const isLocked = !isPro;
  const PREVIEW_CONSISTENCY_SCORE = 72;
  const consistencyScore = isLocked ? PREVIEW_CONSISTENCY_SCORE : rawScore;
  const percentage = Math.min(consistencyScore, 100);

  const getGradientStops = (): GradientStop[] => {
    if (consistencyScore < 40) return [
      { offset: '0%', stopColor: '#ef4444', stopOpacity: 1 },
      { offset: '100%', stopColor: '#dc2626', stopOpacity: 0.9 },
    ];
    if (consistencyScore < 60) return [
      { offset: '0%', stopColor: '#f97316', stopOpacity: 1 },
      { offset: '100%', stopColor: '#ea580c', stopOpacity: 0.9 },
    ];
    if (consistencyScore < 75) return [
      { offset: '0%', stopColor: '#eab308', stopOpacity: 1 },
      { offset: '50%', stopColor: '#facc15', stopOpacity: 0.95 },
      { offset: '100%', stopColor: '#ca8a04', stopOpacity: 0.9 },
    ];
    if (consistencyScore < 90) return [
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
    if (consistencyScore < 40) return 'text-rose-600 dark:text-rose-400';
    if (consistencyScore < 60) return 'text-orange-600 dark:text-orange-400';
    if (consistencyScore < 75) return 'text-yellow-600 dark:text-yellow-400';
    if (consistencyScore < 90) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getDotColor = () => {
    if (consistencyScore < 40) return 'bg-rose-500 dark:bg-rose-400 ring-rose-200/50 dark:ring-rose-500/30';
    if (consistencyScore < 60) return 'bg-orange-500 dark:bg-orange-400 ring-orange-200/50 dark:ring-orange-500/30';
    if (consistencyScore < 75) return 'bg-yellow-500 dark:bg-yellow-400 ring-yellow-200/50 dark:ring-yellow-500/30';
    if (consistencyScore < 90) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
  };

  const infoContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Consistency Score Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', consistencyScore < 40 ? 'bg-red-50/80 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔹 0% – 39%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Low — Results are highly variable.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', consistencyScore >= 40 && consistencyScore < 60 ? 'bg-orange-100/80 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 40% – 59%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Developing — Some patterns, but still unreliable.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', consistencyScore >= 60 && consistencyScore < 75 ? 'bg-yellow-50/80 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟡 60% – 74%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Moderate — Improving, with room to refine.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', consistencyScore >= 75 && consistencyScore < 90 ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 75% – 89%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strong — Reliable performance across trades.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', consistencyScore >= 90 ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 90% – 100%</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional — Top-tier, highly repeatable results.</div>
        </div>
      </div>
    </div>
  );

  return (
    <GaugeChartCard
      title="Consistency Score"
      description="Monthly profitability rate"
      isPro={isPro}
      percentage={percentage}
      dataName="Consistency Score"
      gradientStops={getGradientStops()}
      scaleLeft="0%"
      scaleRight="100%"
      centerValue={<span className={getTextColor()}>{Math.round(consistencyScore)}%</span>}
      targetText="Target: 75%+"
      hoverLabel="Consistency Score"
      hoverValue={`${consistencyScore.toFixed(2)}%`}
      hoverValueColor={getTextColor()}
      hoverDotColor={getDotColor()}
      hoverSubtext="Percentage of profitable months"
      infoContent={infoContent}
    />
  );
});
