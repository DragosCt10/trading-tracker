'use client';

import React, { useMemo } from 'react';
import { Infinity as InfinityIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { calculateProfitFactor } from '@/utils/analyticsCalculations';
import { buildPreviewTrade } from '@/utils/previewTrades';
import { GaugeChartCard, GradientStop } from './GaugeChartCard';

interface ProfitFactorChartProps {
  tradesToUse: Trade[];
  totalWins?: number;
  totalLosses?: number;
  isPro?: boolean;
}

export const ProfitFactorChart = React.memo(function ProfitFactorChart({ tradesToUse: rawTrades, totalWins, totalLosses, isPro }: ProfitFactorChartProps) {
  const isLocked = !isPro;

  const previewTrades = useMemo<Trade[]>(
    () => [
      buildPreviewTrade({ id: 'preview-profit-factor-win', trade_outcome: 'Win', calculated_profit: 200 }),
      buildPreviewTrade({ id: 'preview-profit-factor-loss', trade_outcome: 'Lose', calculated_profit: -100 }),
    ],
    []
  );

  const tradesToUse = useMemo(() => (isLocked ? previewTrades : rawTrades), [isLocked, previewTrades, rawTrades]);
  const wins = useMemo(() => tradesToUse.filter(t => t.trade_outcome === 'Win').length, [tradesToUse]);
  const losses = useMemo(() => tradesToUse.filter(t => t.trade_outcome === 'Lose').length, [tradesToUse]);
  const profitFactor = useMemo(() => calculateProfitFactor(tradesToUse, wins, losses), [tradesToUse, wins, losses]);

  const isEmpty = isPro && rawTrades.length === 0;

  const hasNumericProfitFactor = !Number.isNaN(profitFactor);
  const isInfiniteProfitFactor = hasNumericProfitFactor && !Number.isFinite(profitFactor);
  const isFiniteProfitFactor = hasNumericProfitFactor && Number.isFinite(profitFactor);

  const displayValue = isFiniteProfitFactor ? profitFactor : isInfiniteProfitFactor ? 5.0 : 0;
  const normalizedValue = Math.max(0, Math.min(displayValue, 5.0));
  const percentage = (normalizedValue / 5.0) * 100;

  const getGradientStops = (): GradientStop[] => {
    if (!hasNumericProfitFactor || displayValue < 1.0) return [
      { offset: '0%', stopColor: '#ef4444', stopOpacity: 1 },
      { offset: '100%', stopColor: '#dc2626', stopOpacity: 0.9 },
    ];
    if (displayValue < 1.5) return [
      { offset: '0%', stopColor: '#f97316', stopOpacity: 1 },
      { offset: '100%', stopColor: '#ea580c', stopOpacity: 0.9 },
    ];
    if (displayValue < 2.0) return [
      { offset: '0%', stopColor: '#f59e0b', stopOpacity: 1 },
      { offset: '100%', stopColor: '#d97706', stopOpacity: 0.9 },
    ];
    if (displayValue < 3.0) return [
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
    if (!hasNumericProfitFactor) return 'text-slate-500 dark:text-slate-400';
    if (displayValue < 1.0) return 'text-rose-600 dark:text-rose-400';
    if (displayValue < 1.5) return 'text-orange-600 dark:text-orange-400';
    if (displayValue < 2.0) return 'text-amber-600 dark:text-amber-400';
    if (displayValue < 3.0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const centerValue = (
    <span className={getTextColor()}>
      {isFiniteProfitFactor ? (
        displayValue % 1 === 0 ? displayValue.toFixed(0) : displayValue.toFixed(1)
      ) : isInfiniteProfitFactor ? (
        <InfinityIcon className="inline-block h-6 w-6 align-middle" aria-label="Infinite profit factor" />
      ) : (
        'N/A'
      )}
    </span>
  );

  const hoverValue = isFiniteProfitFactor
    ? displayValue.toFixed(2)
    : isInfiniteProfitFactor
    ? '∞'
    : 'N/A';

  const infoContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Profit Factor Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', profitFactor < 1 ? 'bg-blue-50/80 dark:bg-blue-900/40 border border-blue-300/60 dark:border-blue-600/50 ring-1 ring-blue-200/40 dark:ring-blue-700/40' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔹 &lt; 1.0</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Negative Efficiency — Losses outweigh gains.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', profitFactor >= 1 && profitFactor < 1.5 ? 'bg-orange-100/80 dark:bg-orange-900/40 border border-orange-300/60 dark:border-orange-600/50 ring-1 ring-orange-200/40 dark:ring-orange-700/40' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 1.0 – 1.49</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Marginal Efficiency — Profitable but limited.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', profitFactor >= 1.5 && profitFactor < 2 ? 'bg-emerald-50/80 dark:bg-emerald-900/40 border border-emerald-300/60 dark:border-emerald-600/50 ring-1 ring-emerald-200/40 dark:ring-emerald-700/40' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 1.5 – 1.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Solid Efficiency — Consistent and sustainable edge.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', profitFactor >= 2 && profitFactor < 3 ? 'bg-blue-50/80 dark:bg-blue-900/40 border border-blue-300/60 dark:border-blue-600/50 ring-1 ring-blue-200/40 dark:ring-blue-700/40' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔷 2.0 – 2.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High Efficiency — Strong reward relative to risk.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', profitFactor >= 3 ? 'bg-blue-50/80 dark:bg-blue-900/40 border border-blue-300/60 dark:border-blue-600/50 ring-1 ring-blue-200/40 dark:ring-blue-700/40' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 3.0+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional Efficiency — Very high edge — confirm durability.</div>
        </div>
      </div>
    </div>
  );

  return (
    <GaugeChartCard
      title="Profit Factor"
      description="Profit efficiency ratio"
      isPro={isPro}
      isEmpty={isEmpty}
      percentage={percentage}
      dataName="Profit Factor"
      gradientStops={getGradientStops()}
      scaleLeft="0"
      scaleRight="5.0"
      centerValue={centerValue}
      targetText="Target: 2+"
      hoverLabel="Profit Factor"
      hoverValue={hoverValue}
      hoverValueColor={getTextColor()}
      hoverDotColor="bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30"
      hoverSubtext={`${percentage.toFixed(1)}% of maximum scale`}
      infoContent={infoContent}
    />
  );
});
