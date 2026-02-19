'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

/**
 * Format Max Drawdown value for display
 */
export function formatMaxDrawdownValue(maxDrawdown: number | null | undefined): string {
  if (typeof maxDrawdown === 'number') {
    return `${maxDrawdown.toFixed(2)}%`;
  }
  return '—';
}

interface MaxDrawdownStatCardProps {
  maxDrawdown: number | null | undefined;
}

export const MaxDrawdownStatCard: React.FC<MaxDrawdownStatCardProps> = React.memo(
  function MaxDrawdownStatCard({ maxDrawdown }) {
    const tooltipContent = (
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Max Drawdown Interpretation
        </div>
        <div className="space-y-2">
          <div className={cn("rounded-xl p-2.5 transition-all", maxDrawdown !== null && maxDrawdown !== undefined && maxDrawdown <= 2 ? "bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔹 0% – 2%</span>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Excellent — Very low risk with minimal drawdown exposure.</div>
          </div>
          <div className={cn("rounded-xl p-2.5 transition-all", maxDrawdown !== null && maxDrawdown !== undefined && maxDrawdown > 2 && maxDrawdown <= 5 ? "bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">✅ 2% – 5%</span>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Healthy/Moderate — Acceptable risk level for most strategies.</div>
          </div>
          <div className={cn("rounded-xl p-2.5 transition-all", maxDrawdown !== null && maxDrawdown !== undefined && maxDrawdown > 5 && maxDrawdown <= 10 ? "bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">⚠️ 5% – 10%</span>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Aggressive but Acceptable — Higher risk, monitor closely.</div>
          </div>
          <div className={cn("rounded-xl p-2.5 transition-all", maxDrawdown !== null && maxDrawdown !== undefined && maxDrawdown > 10 && maxDrawdown <= 20 ? "bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">❗ 10% – 20%</span>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High Risk — Significant drawdown exposure, consider risk management.</div>
          </div>
          <div className={cn("rounded-xl p-2.5 transition-all", maxDrawdown !== null && maxDrawdown !== undefined && maxDrawdown > 20 ? "bg-red-50/80 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🚫 20%+</span>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Danger Zone — Extreme risk level, immediate review required.</div>
          </div>
        </div>
      </div>
    );

    return (
      <StatCard
        title="Max Drawdown"
        tooltipContent={tooltipContent}
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatMaxDrawdownValue(maxDrawdown)}
          </p>
        }
      />
    );
  }
);
