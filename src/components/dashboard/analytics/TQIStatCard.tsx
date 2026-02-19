'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

/**
 * Get TQI value color class based on the trade quality index value
 */
export function getTQIColorClass(tradeQualityIndex: number | null | undefined): string {
  if (typeof tradeQualityIndex !== 'number') {
    return 'text-slate-900 dark:text-slate-100';
  }
  if (tradeQualityIndex > 0.30) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (tradeQualityIndex < 0.29) {
    return 'text-rose-600 dark:text-rose-400';
  }
  return 'text-slate-900 dark:text-slate-100';
}

/**
 * Format TQI value for display
 */
export function formatTQIValue(tradeQualityIndex: number | null | undefined): string {
  if (typeof tradeQualityIndex === 'number') {
    return tradeQualityIndex.toFixed(2);
  }
  return '—';
}

interface TQIStatCardProps {
  tradeQualityIndex: number | null | undefined;
}

export const TQIStatCard: React.FC<TQIStatCardProps> = React.memo(
  function TQIStatCard({ tradeQualityIndex }) {
    const tooltipContent = (
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          TQI (Trade Quality Index) Interpretation
        </div>
        <div className="space-y-2">
          <div className={cn("rounded-xl p-2.5 transition-all", tradeQualityIndex !== null && tradeQualityIndex !== undefined && tradeQualityIndex < 0.20 ? "bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔸 &lt; 0.20</span>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Needs Development — Limited consistency so far. Strategy may need work or more data.</div>
          </div>
          <div className={cn("rounded-xl p-2.5 transition-all", tradeQualityIndex !== null && tradeQualityIndex !== undefined && tradeQualityIndex >= 0.20 && tradeQualityIndex < 0.30 ? "bg-orange-100/80 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 0.20 – 0.29</span>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Early Stage Consistency — Some positive signs, but outcomes are still variable. Keep refining.</div>
          </div>
          <div className={cn("rounded-xl p-2.5 transition-all", tradeQualityIndex !== null && tradeQualityIndex !== undefined && tradeQualityIndex >= 0.30 && tradeQualityIndex < 0.40 ? "bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟡 0.30 – 0.39</span>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Moderate Stability — Shows repeatable elements and more robustness. Keep improving.</div>
          </div>
          <div className={cn("rounded-xl p-2.5 transition-all", tradeQualityIndex !== null && tradeQualityIndex !== undefined && tradeQualityIndex >= 0.40 && tradeQualityIndex < 0.55 ? "bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 0.40 – 0.55</span>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strong Quality — Good consistency and solid results across conditions.</div>
          </div>
          <div className={cn("rounded-xl p-2.5 transition-all", tradeQualityIndex !== null && tradeQualityIndex !== undefined && tradeQualityIndex >= 0.55 ? "bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 0.55+</span>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional Quality — Very strong and reliable performance. The strategy is well-refined.</div>
          </div>
        </div>
      </div>
    );

    return (
      <StatCard
        title="TQI"
        tooltipContent={tooltipContent}
        value={
          <p className={cn('text-2xl font-bold', getTQIColorClass(tradeQualityIndex))}>
            {formatTQIValue(tradeQualityIndex)}
          </p>
        }
      />
    );
  }
);
