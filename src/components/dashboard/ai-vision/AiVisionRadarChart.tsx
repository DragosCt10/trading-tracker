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

interface AiVisionRadarChartProps {
  metrics7d: PeriodMetrics;
  metrics30d: PeriodMetrics;
  metrics90d: PeriodMetrics;
}

const AXES = [
  { key: 'winRate',          label: 'Win Rate',    max: 100  },
  { key: 'profitFactor',     label: 'Prof. Factor', max: 3   },
  { key: 'consistencyScore', label: 'Consistency', max: 100  },
  { key: 'expectancy',       label: 'Expectancy',  max: 500  },
  { key: 'recoveryFactor',   label: 'Recovery',    max: 3    },
  { key: 'avgWinLossRatio',  label: 'W/L Ratio',   max: 3    },
  { key: 'longWinRate',      label: 'Long WR',     max: 100  },
  { key: 'shortWinRate',     label: 'Short WR',    max: 100  },
] as const;

type AxisKey = typeof AXES[number]['key'];

function normalize(metrics: PeriodMetrics, key: AxisKey, max: number): number {
  const raw = metrics[key] as number;
  if (!isFinite(raw) || isNaN(raw)) return 0;
  return Math.min(100, Math.max(0, (raw / max) * 100));
}

function buildRadarData(m7d: PeriodMetrics, m30d: PeriodMetrics, m90d: PeriodMetrics) {
  return AXES.map(({ key, label, max }) => ({
    subject: label,
    '7d':  normalize(m7d,  key, max),
    '30d': normalize(m30d, key, max),
    '90d': normalize(m90d, key, max),
  }));
}

export function AiVisionRadarChart({ metrics7d, metrics30d, metrics90d }: AiVisionRadarChartProps) {
  const isDark = useDarkMode();
  const data = buildRadarData(metrics7d, metrics30d, metrics90d);

  const gridColor = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.15)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm p-4 shadow-sm"
      aria-label="AI Vision health radar chart comparing 7d, 30d, and 90d performance across 8 metrics"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Performance Health
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: tickColor, fontSize: 11 }} />
          <Radar
            name="Last 7d"
            dataKey="7d"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.15}
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease-out"
          />
          <Radar
            name="Last 30d"
            dataKey="30d"
            stroke="#0ea5e9"
            fill="#0ea5e9"
            fillOpacity={0.12}
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease-out"
          />
          <Radar
            name="Last 90d"
            dataKey="90d"
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
