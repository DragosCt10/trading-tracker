'use client';

// src/components/dashboard/ai-vision/MetricTrendChart.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { RollingPoint } from '@/utils/calculateRollingMetrics';
import type { PeriodMetrics } from '@/utils/calculatePeriodMetrics';

interface MetricTrendChartProps {
  label: string;
  metricKey: keyof PeriodMetrics;
  points: RollingPoint[];
  formatValue?: (v: number) => string;
}

export function MetricTrendChart({
  label,
  metricKey,
  points,
  formatValue = (v) => v.toFixed(2),
}: MetricTrendChartProps) {
  const isDark = useDarkMode();

  const data = points.map((p) => ({
    date: p.date,
    value: p.metrics[metricKey] as number,
  }));

  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const lineColor = isDark ? '#818cf8' : '#6366f1';

  if (points.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-slate-100/80 dark:border-slate-700/40 bg-white/40 dark:bg-slate-800/20">
        <p className="text-xs text-slate-400 dark:text-slate-500">Not enough data for {label} trend</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-100/80 dark:border-slate-700/40 bg-white/40 dark:bg-slate-800/20 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{label} over time</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            tick={{ fill: tickColor, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) => d.slice(5)} // MM-DD
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatValue}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1e293b' : '#fff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 11,
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
