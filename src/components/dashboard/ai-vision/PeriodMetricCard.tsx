'use client';

// src/components/dashboard/ai-vision/PeriodMetricCard.tsx
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { RollingPoint } from '@/utils/calculateRollingMetrics';
import type { PeriodMetrics } from '@/utils/calculatePeriodMetrics';

interface PeriodMetricCardProps {
  metricKey: keyof PeriodMetrics;
  label: string;
  value7d: number;
  value30d: number;
  value90d: number;
  hasNoTrades7d: boolean;
  hasNoTrades30d: boolean;
  hasNoTrades90d: boolean;
  formatValue: (v: number) => string;
  /** If true, delta direction is inverted (lower = better). Used for maxDrawdown. */
  invertDelta?: boolean;
  rollingPoints: RollingPoint[];
}

function DeltaBadge({
  current,
  prior,
  invertDelta = false,
  hasNoCurrent,
  hasnoPrior,
}: {
  current: number;
  prior: number;
  invertDelta?: boolean;
  hasNoCurrent: boolean;
  hasnoPrior: boolean;
}) {
  if (hasNoCurrent || hasnoPrior) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">N/A</span>;
  }
  const rawDelta = current - prior;
  // For inverted metrics (maxDrawdown), lower is better so flip the color logic
  const isGood = invertDelta ? rawDelta < 0 : rawDelta > 0;
  const isBad  = invertDelta ? rawDelta > 0 : rawDelta < 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-semibold',
        isGood && 'text-green-600 dark:text-green-400',
        isBad  && 'text-red-500 dark:text-red-400',
        !isGood && !isBad && 'text-slate-400 dark:text-slate-500',
      )}
      aria-label={`${isGood ? 'improved' : isBad ? 'declined' : 'unchanged'}`}
    >
      {isGood && <TrendingUp className="h-2.5 w-2.5" />}
      {isBad  && <TrendingDown className="h-2.5 w-2.5" />}
      {!isGood && !isBad && <Minus className="h-2.5 w-2.5" />}
    </span>
  );
}

function MetricCell({
  value,
  formatValue,
  hasNoTrades,
}: {
  value: number;
  formatValue: (v: number) => string;
  hasNoTrades: boolean;
}) {
  if (hasNoTrades) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
  }
  return <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatValue(value)}</span>;
}

function Sparkline({ points, metricKey }: { points: RollingPoint[]; metricKey: keyof PeriodMetrics }) {
  const isDark = useDarkMode();
  if (points.length < 2) return <div className="h-8 w-16" />;

  const data = points.map((p) => ({ v: p.metrics[metricKey] as number }));

  return (
    <div className="h-8 w-20" aria-label="trend sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={isDark ? '#818cf8' : '#6366f1'}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip
            contentStyle={{ display: 'none' }}
            cursor={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PeriodMetricCard({
  metricKey,
  label,
  value7d,
  value30d,
  value90d,
  hasNoTrades7d,
  hasNoTrades30d,
  hasNoTrades90d,
  formatValue,
  invertDelta = false,
  rollingPoints,
}: PeriodMetricCardProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_1fr] items-center gap-x-3 gap-y-0 px-4 py-2.5 rounded-xl border border-slate-100/80 dark:border-slate-700/40 bg-white/40 dark:bg-slate-800/20 hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors">
      {/* Metric label */}
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">{label}</span>

      {/* 7d value */}
      <MetricCell value={value7d} formatValue={formatValue} hasNoTrades={hasNoTrades7d} />

      {/* Delta 7d vs 30d */}
      <div className="flex items-center gap-1">
        <DeltaBadge
          current={value7d}
          prior={value30d}
          invertDelta={invertDelta}
          hasNoCurrent={hasNoTrades7d}
          hasnoPrior={hasNoTrades30d}
        />
        <MetricCell value={value30d} formatValue={formatValue} hasNoTrades={hasNoTrades30d} />
      </div>

      {/* Delta 30d vs 90d */}
      <div className="flex items-center gap-1">
        <DeltaBadge
          current={value30d}
          prior={value90d}
          invertDelta={invertDelta}
          hasNoCurrent={hasNoTrades30d}
          hasnoPrior={hasNoTrades90d}
        />
        <MetricCell value={value90d} formatValue={formatValue} hasNoTrades={hasNoTrades90d} />
      </div>

      {/* Sparkline */}
      <Sparkline points={rollingPoints} metricKey={metricKey} />
    </div>
  );
}
