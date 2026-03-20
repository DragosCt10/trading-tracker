'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { calculateExpectancy } from '@/utils/analyticsCalculations';
import { Trade } from '@/types/trade';
import { buildPreviewTrade } from '@/utils/previewTrades';
import { GaugeChartCard, GradientStop } from './GaugeChartCard';

interface ExpectancyCardProps {
  trades: Trade[];
  currencySymbol?: string;
  isLoading?: boolean;
  isPro?: boolean;
}

function formatCurrency(value: number, symbol = '$'): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${symbol}${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ExpectancyCard({ trades: rawTrades, currencySymbol = '$', isLoading, isPro }: ExpectancyCardProps) {
  const isLocked = !isPro;

  const previewTrades = useMemo<Trade[]>(
    () => [
      buildPreviewTrade({ id: 'preview-expectancy-win', trade_outcome: 'Win', calculated_profit: 200 }),
      buildPreviewTrade({ id: 'preview-expectancy-loss', trade_outcome: 'Lose', calculated_profit: -100 }),
    ],
    []
  );

  const trades = isPro ? rawTrades : previewTrades;

  const { expectancy, normalized, avgWin, avgLoss } = calculateExpectancy(trades);
  const hasData = trades.some(t => t.trade_outcome === 'Win' || t.trade_outcome === 'Lose');

  const percentage = normalized;

  const isEmpty = (isPro && !hasData) || !!isLoading;

  const getGradientStops = (): GradientStop[] => {
    if (percentage < 30) return [
      { offset: '0%', stopColor: '#f43f5e', stopOpacity: 1 },
      { offset: '100%', stopColor: '#e11d48', stopOpacity: 0.9 },
    ];
    if (percentage < 50) return [
      { offset: '0%', stopColor: '#f59e0b', stopOpacity: 1 },
      { offset: '100%', stopColor: '#d97706', stopOpacity: 0.9 },
    ];
    if (percentage < 70) return [
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
    if (percentage < 30) return 'text-rose-600 dark:text-rose-400';
    if (percentage < 50) return 'text-amber-600 dark:text-amber-400';
    if (percentage < 70) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getDotColor = () => {
    if (percentage < 30) return 'bg-rose-500 dark:bg-rose-400 ring-rose-200/50 dark:ring-rose-500/30';
    if (percentage < 50) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    if (percentage < 70) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
  };

  const infoContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Expectancy Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', percentage < 30 ? 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔴 Negative Edge</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Losses outweigh wins on average. Review risk/reward or entry criteria.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', percentage >= 30 && percentage < 50 ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 Near Breakeven</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Edge is marginal. Costs (spread, commission) likely erode profitability.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', percentage >= 50 && percentage < 70 ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 Positive Edge</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strategy earns more per winner than it loses per loser. Compounding works in your favour.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', percentage >= 70 ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 Strong Edge</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High expectancy relative to risk. Scale carefully while preserving edge.</div>
        </div>
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/40 dark:border-slate-700/30">
        Formula: (Win Rate × Avg Win) − (Loss Rate × Avg Loss)
      </div>
    </div>
  );

  return (
    <GaugeChartCard
      title="Expectancy"
      description="Expected return per trade"
      isPro={isPro}
      isEmpty={isEmpty}
      percentage={percentage}
      dataName="Expectancy"
      gradientStops={getGradientStops()}
      scaleLeft="Neg"
      scaleRight="Pos"
      centerValue={
        <span className={cn('tabular-nums', getTextColor())}>
          {hasData ? formatCurrency(expectancy, currencySymbol) : '–'}
        </span>
      }
      targetText="Target: > 0"
      hoverLabel="Expectancy"
      hoverValue={formatCurrency(expectancy, currencySymbol)}
      hoverValueColor={getTextColor()}
      hoverDotColor={getDotColor()}
      hoverSubtext={`Win avg: ${currencySymbol}${avgWin.toFixed(2)} · Loss avg: ${currencySymbol}${avgLoss.toFixed(2)}`}
      infoContent={infoContent}
    />
  );
}
