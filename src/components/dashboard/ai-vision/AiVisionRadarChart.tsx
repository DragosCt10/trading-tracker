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

// Neutral palette — period A lighter, B mid, C (baseline) faintest
const COLOR_A_LIGHT = '#8b9bb5';
const COLOR_B_LIGHT = '#5c6b7f';
const COLOR_C_LIGHT = '#b0bec5';
const COLOR_A_DARK  = '#a3b8d0';
const COLOR_B_DARK  = '#5e7590';
const COLOR_C_DARK  = '#3e5060';

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
  const { isDark } = useDarkMode();
  const data = buildRadarData(metricsA, metricsB, metricsC);

  const colorA = isDark ? COLOR_A_DARK : COLOR_A_LIGHT;
  const colorB = isDark ? COLOR_B_DARK : COLOR_B_LIGHT;
  const colorC = isDark ? COLOR_C_DARK : COLOR_C_LIGHT;

  const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm px-5 pt-4 pb-3 flex flex-col h-full">
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: tickColor, fontSize: 10, fontWeight: 500 }} />
          <Radar
            name={labelC}
            dataKey="c"
            stroke={colorC}
            fill={colorC}
            fillOpacity={0.08}
            strokeDasharray="4 4"
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease-out"
          />
          <Radar
            name={labelB}
            dataKey="b"
            stroke={colorB}
            fill={colorB}
            fillOpacity={0.12}
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease-out"
          />
          <Radar
            name={labelA}
            dataKey="a"
            stroke={colorA}
            fill={colorA}
            fillOpacity={0.18}
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease-out"
          />
          <Legend
            iconSize={10}
            align="right"
            verticalAlign="top"
            wrapperStyle={{ fontSize: 11, paddingBottom: 12, color: tickColor }}
          />
          <Tooltip
            contentStyle={{
              background: isDark ? 'rgba(15,23,42,0.90)' : 'rgba(248,250,252,0.95)',
              border: isDark ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(203,213,225,0.4)',
              borderRadius: 16,
              fontSize: 12,
              color: isDark ? '#e2e8f0' : '#1e293b',
              backdropFilter: 'blur(8px)',
              boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
            formatter={(value: number) => [`${value.toFixed(0)}%`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
