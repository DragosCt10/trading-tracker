'use client';

// src/components/dashboard/ai-vision/AiVisionRadarChart.tsx
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { PeriodMetrics } from '@/utils/calculatePeriodMetrics';
import { AI_VISION_METRICS } from '@/constants/aiVisionMetrics';

interface AiVisionRadarChartProps {
  metricsA: PeriodMetrics;
  metricsB: PeriodMetrics;
  metricsC: PeriodMetrics;
  labelA: string;
  labelB: string;
  labelC: string;
}

function normalize(metrics: PeriodMetrics, key: string, max: number, invert: boolean): number {
  const raw = metrics[key as keyof PeriodMetrics] as number;
  if (!isFinite(raw) || isNaN(raw)) return 0;
  const pct = Math.min(1, Math.max(0, raw / max));
  return (invert ? 1 - pct : pct) * 100;
}

function buildRadarData(mA: PeriodMetrics, mB: PeriodMetrics, mC: PeriodMetrics) {
  return AI_VISION_METRICS.map(({ key, label, max, invert }) => ({
    subject: label,
    a: normalize(mA, key, max, invert),
    b: normalize(mB, key, max, invert),
    c: normalize(mC, key, max, invert),
  }));
}

export function AiVisionRadarChart({
  metricsA,
  metricsB,
  metricsC,
  labelA,
  labelB,
  labelC,
}: AiVisionRadarChartProps) {
  const isDark = useDarkMode();
  const data = buildRadarData(metricsA, metricsB, metricsC);

  const gridColor = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.15)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm p-4 shadow-sm"
      aria-label="AI Vision health radar chart comparing performance across 8 metrics"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Performance Health
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: tickColor, fontSize: 11 }} />
          <Radar
            name={labelA}
            dataKey="a"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.15}
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease-out"
          />
          <Radar
            name={labelB}
            dataKey="b"
            stroke="#0ea5e9"
            fill="#0ea5e9"
            fillOpacity={0.12}
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease-out"
          />
          <Radar
            name={labelC}
            dataKey="c"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.10}
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease-out"
          />
          <Legend
            iconSize={10}
            wrapperStyle={{ fontSize: 12, color: tickColor, paddingTop: 8 }}
          />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1e293b' : '#fff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 12,
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
