'use client';

// src/components/dashboard/ai-vision/AiVisionBarChart.tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { PeriodMetrics } from '@/utils/calculatePeriodMetrics';
import { AI_VISION_METRICS } from '@/constants/aiVisionMetrics';

interface AiVisionBarChartProps {
  metricsA: PeriodMetrics;
  metricsB: PeriodMetrics;
  metricsC: PeriodMetrics;
  labelA: string;
  labelB: string;
}

// Two neutral, visually distinct fills — theme-agnostic
const COLOR_A_LIGHT = '#94a3b8'; // slate-400
const COLOR_B_LIGHT = '#475569'; // slate-600
const COLOR_A_DARK  = '#cbd5e1'; // slate-300
const COLOR_B_DARK  = '#64748b'; // slate-500

function norm(metrics: PeriodMetrics, key: string, max: number, invert: boolean): number {
  const raw = metrics[key as keyof PeriodMetrics] as number;
  if (!isFinite(raw) || isNaN(raw)) return 0;
  const pct = Math.min(1, Math.max(0, raw / max));
  return (invert ? 1 - pct : pct) * 100;
}

interface BarTooltipEntry { name: string; value: number; fill: string }

function BarTooltip({
  active,
  payload,
  label,
  isDark,
}: {
  active?: boolean;
  payload?: BarTooltipEntry[];
  label?: string;
  isDark?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const last = payload[payload.length - 1];
  const rest = payload.slice(0, -1);

  const renderValue = (n: number) => {
    const sign = n > 0 ? '+' : '';
    const cls = n >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
    return <span className={`text-lg font-bold ${cls}`}>{sign}{n} pts</span>;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm shadow-md shadow-slate-200/50 dark:shadow-none p-4 text-slate-900 dark:text-slate-100 min-w-[180px]">
      {isDark && (
        <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />
      )}
      <div className="relative flex flex-col gap-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {label}
        </div>
        <div className="space-y-2">
          {rest.map((entry) => {
            const n = typeof entry.value === 'number' ? entry.value : 0;
            return (
              <div key={entry.name} className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{entry.name}</span>
                {renderValue(n)}
              </div>
            );
          })}
          {last && (
            <div className="flex items-baseline justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{last.name}</span>
              {renderValue(typeof last.value === 'number' ? last.value : 0)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiVisionBarChart({
  metricsA,
  metricsB,
  metricsC,
  labelA,
  labelB,
}: AiVisionBarChartProps) {
  const { isDark } = useDarkMode();

  const colorA = isDark ? COLOR_A_DARK : COLOR_A_LIGHT;
  const colorB = isDark ? COLOR_B_DARK : COLOR_B_LIGHT;

  // delta vs baseline (period C): positive = improvement, negative = decline
  const data = AI_VISION_METRICS.map(({ key, label, max, invert }) => {
    const c = norm(metricsC, key, max, invert);
    return {
      metric: label,
      [labelA]: parseFloat((norm(metricsA, key, max, invert) - c).toFixed(1)),
      [labelB]: parseFloat((norm(metricsB, key, max, invert) - c).toFixed(1)),
    };
  });

  const gridColor = isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.10)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const axisColor = isDark ? '#1e293b' : '#e2e8f0';
  const refColor  = isDark ? '#334155' : '#94a3b8';

  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm px-5 pt-4 pb-3">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          barCategoryGap="20%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />

          <XAxis
            type="number"
            domain={[-100, 100]}
            tick={{ fill: tickColor, fontSize: 10 }}
            axisLine={{ stroke: axisColor }}
            tickLine={false}
            tickCount={11}
            tickFormatter={(v: number) => (v > 0 ? `+${v}` : `${v}`)}
          />

          <YAxis
            type="category"
            dataKey="metric"
            tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={76}
          />

          <Tooltip
            cursor={{ fill: 'transparent', radius: 8 }}
            contentStyle={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none', minWidth: '180px' }}
            wrapperStyle={{ outline: 'none', zIndex: 1000 }}
            content={(props) => (
              <BarTooltip
                active={props.active}
                payload={props.payload as unknown as BarTooltipEntry[]}
                label={props.label != null ? String(props.label) : undefined}
                isDark={isDark}
              />
            )}
          />

          <Legend
            iconSize={10}
            iconType="square"
            align="right"
            verticalAlign="top"
            wrapperStyle={{ fontSize: 11, paddingBottom: 12, color: tickColor }}
          />

          <ReferenceLine x={0} stroke={refColor} strokeWidth={1.5} />

          <Bar name={labelA} dataKey={labelA} fill={colorA} fillOpacity={0.90} radius={[0, 4, 4, 0]} maxBarSize={22} />
          <Bar name={labelB} dataKey={labelB} fill={colorB} fillOpacity={0.90} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
