'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { GaugeChartCard, GradientStop } from './GaugeChartCard';

interface SharpeRatioChartProps {
  sharpeRatio: number;
  isPro?: boolean;
}

export const SharpeRatioChart = React.memo(function SharpeRatioChart({ sharpeRatio: rawSharpe, isPro }: SharpeRatioChartProps) {
  const isLocked = !isPro;
  const PREVIEW_SHARPE_RATIO = 1.15;
  const sharpeRatio = isLocked ? PREVIEW_SHARPE_RATIO : rawSharpe;

  const normalizedValue = Math.max(0, Math.min(sharpeRatio, 3.0));
  const percentage = (normalizedValue / 3.0) * 100;

  const isEmpty = isPro && rawSharpe === 0;

  const getGradientStops = (): GradientStop[] => {
    if (sharpeRatio < 0.2) return [
      { offset: '0%', stopColor: '#f97316', stopOpacity: 1 },
      { offset: '100%', stopColor: '#ea580c', stopOpacity: 0.9 },
    ];
    if (sharpeRatio < 0.5) return [
      { offset: '0%', stopColor: '#f59e0b', stopOpacity: 1 },
      { offset: '100%', stopColor: '#d97706', stopOpacity: 0.9 },
    ];
    if (sharpeRatio < 1.0) return [
      { offset: '0%', stopColor: '#eab308', stopOpacity: 1 },
      { offset: '50%', stopColor: '#facc15', stopOpacity: 0.95 },
      { offset: '100%', stopColor: '#ca8a04', stopOpacity: 0.9 },
    ];
    if (sharpeRatio < 2.0) return [
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
    if (sharpeRatio < 0.2) return 'text-orange-600 dark:text-orange-400';
    if (sharpeRatio < 0.5) return 'text-amber-600 dark:text-amber-400';
    if (sharpeRatio < 1.0) return 'text-yellow-600 dark:text-yellow-400';
    if (sharpeRatio < 2.0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getDotColor = () => {
    if (sharpeRatio < 0.2) return 'bg-orange-500 dark:bg-orange-400 ring-orange-200/50 dark:ring-orange-500/30';
    if (sharpeRatio < 0.5) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    if (sharpeRatio < 1.0) return 'bg-yellow-500 dark:bg-yellow-400 ring-yellow-200/50 dark:ring-yellow-500/30';
    if (sharpeRatio < 2.0) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
  };

  const infoContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Sharpe Ratio Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', sharpeRatio < 0.2 ? 'bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔹 &lt; 0.20</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High Variability — Large swings relative to returns.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', sharpeRatio >= 0.2 && sharpeRatio < 0.5 ? 'bg-orange-100/80 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 0.20 – 0.49</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Developing Stability — Profitable but uneven.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', sharpeRatio >= 0.5 && sharpeRatio < 1 ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟡 0.50 – 0.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Balanced Performance — Returns generally outweigh risk.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', sharpeRatio >= 1 && sharpeRatio < 2 ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 1.0 – 1.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strong Efficiency — Consistent returns with controlled risk.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', sharpeRatio >= 2 ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 2.0+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional Efficiency — Rare stability and optimized execution.</div>
        </div>
      </div>
    </div>
  );

  return (
    <GaugeChartCard
      title="Sharpe Ratio"
      description="Risk-adjusted return"
      isPro={isPro}
      isEmpty={isEmpty}
      percentage={percentage}
      dataName="Sharpe Ratio"
      gradientStops={getGradientStops()}
      scaleLeft="0"
      scaleRight="3.0"
      centerValue={<span className={getTextColor()}>{sharpeRatio.toFixed(1)}</span>}
      targetText="Target: 0.5+"
      hoverLabel="Sharpe Ratio"
      hoverValue={sharpeRatio.toFixed(2)}
      hoverValueColor={getTextColor()}
      hoverDotColor={getDotColor()}
      hoverSubtext={`${percentage.toFixed(1)}% of maximum scale`}
      infoContent={infoContent}
    />
  );
});
