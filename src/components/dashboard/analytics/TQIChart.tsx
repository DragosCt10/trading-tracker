'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { calculateTradeQualityIndex } from '@/utils/analyticsCalculations';
import { buildPreviewTrade } from '@/utils/previewTrades';
import { GaugeChartCard, GradientStop } from './GaugeChartCard';

interface TQIChartProps {
  tradesToUse: Trade[];
  isPro?: boolean;
}

export const TQIChart = React.memo(function TQIChart({ tradesToUse: rawTrades, isPro }: TQIChartProps) {
  const isLocked = !isPro;

  const previewTrades = useMemo<Trade[]>(
    () => [
      buildPreviewTrade({ id: 'preview-tqi-win', trade_outcome: 'Win', break_even: false, risk_reward_ratio: 2 }),
      buildPreviewTrade({ id: 'preview-tqi-loss', trade_outcome: 'Lose', break_even: false, risk_reward_ratio: 2 }),
    ],
    []
  );

  const tradesToUse = useMemo(() => (isLocked ? previewTrades : rawTrades), [isLocked, previewTrades, rawTrades]);
  const tradeQualityIndex = useMemo(() => calculateTradeQualityIndex(tradesToUse), [tradesToUse]);

  const isEmpty = isPro && rawTrades.length === 0;

  const tqiValue = tradeQualityIndex ?? 0;
  const normalizedValue = Math.max(0, Math.min(tqiValue, 1));
  const percentage = normalizedValue * 100;

  const getGradientStops = (): GradientStop[] => {
    if (tqiValue < 0.20) return [
      { offset: '0%', stopColor: '#f97316', stopOpacity: 1 },
      { offset: '100%', stopColor: '#ea580c', stopOpacity: 0.9 },
    ];
    if (tqiValue < 0.30) return [
      { offset: '0%', stopColor: '#fb923c', stopOpacity: 1 },
      { offset: '100%', stopColor: '#f97316', stopOpacity: 0.9 },
    ];
    if (tqiValue < 0.40) return [
      { offset: '0%', stopColor: '#f59e0b', stopOpacity: 1 },
      { offset: '100%', stopColor: '#d97706', stopOpacity: 0.9 },
    ];
    if (tqiValue < 0.55) return [
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
    if (tqiValue < 0.20) return 'text-orange-600 dark:text-orange-400';
    if (tqiValue < 0.30) return 'text-orange-500 dark:text-orange-400';
    if (tqiValue < 0.40) return 'text-amber-600 dark:text-amber-400';
    if (tqiValue < 0.55) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getDotColor = () => {
    if (tqiValue < 0.20) return 'bg-orange-500 dark:bg-orange-400 ring-orange-200/50 dark:ring-orange-500/30';
    if (tqiValue < 0.30) return 'bg-orange-400 dark:bg-orange-400 ring-orange-200/50 dark:ring-orange-500/30';
    if (tqiValue < 0.40) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    if (tqiValue < 0.55) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
  };

  const displayValue = tradeQualityIndex !== null && tradeQualityIndex !== undefined
    ? tradeQualityIndex.toFixed(2)
    : '—';

  const infoContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        TQI (Trade Quality Index) Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', tqiValue < 0.20 ? 'bg-orange-50/80 dark:bg-orange-900/40 border border-orange-300/60 dark:border-orange-600/50 ring-1 ring-orange-200/40 dark:ring-orange-700/40' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔸 &lt; 0.20</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Needs Development — Limited consistency so far. Strategy may need work or more data.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', tqiValue >= 0.20 && tqiValue < 0.30 ? 'bg-orange-100/80 dark:bg-orange-900/40 border border-orange-300/60 dark:border-orange-600/50 ring-1 ring-orange-200/40 dark:ring-orange-700/40' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 0.20 – 0.29</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Early Stage Consistency — Some positive signs, but outcomes are still variable. Keep refining.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', tqiValue >= 0.30 && tqiValue < 0.40 ? 'bg-amber-50/80 dark:bg-amber-900/40 border border-amber-300/60 dark:border-amber-600/50 ring-1 ring-amber-200/40 dark:ring-amber-700/40' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟡 0.30 – 0.39</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Moderate Stability — Shows repeatable elements and more robustness. Keep improving.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', tqiValue >= 0.40 && tqiValue < 0.55 ? 'bg-emerald-50/80 dark:bg-emerald-900/40 border border-emerald-300/60 dark:border-emerald-600/50 ring-1 ring-emerald-200/40 dark:ring-emerald-700/40' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 0.40 – 0.55</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strong Quality — Good consistency and solid results across conditions.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', tqiValue >= 0.55 ? 'bg-blue-50/80 dark:bg-blue-900/40 border border-blue-300/60 dark:border-blue-600/50 ring-1 ring-blue-200/40 dark:ring-blue-700/40' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 0.55+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional Quality — Very strong and reliable performance. The strategy is well-refined.</div>
        </div>
      </div>
    </div>
  );

  return (
    <GaugeChartCard
      title="TQI"
      description="Trade Quality Index"
      isPro={isPro}
      isEmpty={isEmpty}
      percentage={percentage}
      dataName="TQI"
      gradientStops={getGradientStops()}
      scaleLeft="0"
      scaleRight="1.0"
      centerValue={<span className={getTextColor()}>{displayValue}</span>}
      targetText="Target: 0.30+"
      hoverLabel="TQI"
      hoverValue={displayValue}
      hoverValueColor={getTextColor()}
      hoverDotColor={getDotColor()}
      hoverSubtext={`${percentage.toFixed(1)}% of maximum scale`}
      infoContent={infoContent}
    />
  );
});
