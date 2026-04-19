'use client';

import { useCycleAnimation } from '@/hooks/useCycleAnimation';

/**
 * Pure-SVG metric preview mimicking AiVisionMetricRow.
 * Cycles through all 9 AI Vision metrics with animated title transitions.
 */

interface Metric {
  name: string;
  target: string;
  trend: number[];
  delta7d: string;
  delta30d: string;
  bar7d: number;
  bar30d: number;
  periods: string[];
  negative7d?: boolean;
  negative30d?: boolean;
}

const METRICS: Metric[] = [
  {
    name: 'Win Rate',
    target: 'Target \u2265 50%',
    trend: [58, 61, 59, 64, 63, 67, 65, 68, 72],
    delta7d: '+7.2',
    delta30d: '+3.1',
    bar7d: 52,
    bar30d: 24,
    periods: ['72.0%', '67.5%', '64.8%'],
  },
  {
    name: 'Net PnL %',
    target: 'Target \u2265 2%',
    trend: [2.8, 3.1, 2.5, 1.9, 2.2, 1.7, 2.0, 1.5, 1.8],
    delta7d: '-0.5',
    delta30d: '-1.0',
    bar7d: 28,
    bar30d: 38,
    periods: ['1.8%', '2.0%', '2.5%'],
    negative7d: true,
    negative30d: true,
  },
  {
    name: 'Profit Factor',
    target: 'Target \u2265 1.5',
    trend: [1.3, 1.5, 1.4, 1.6, 1.7, 1.8, 1.6, 1.9, 2.1],
    delta7d: '+0.3',
    delta30d: '-0.2',
    bar7d: 38,
    bar30d: 18,
    periods: ['2.1', '1.8', '1.6'],
    negative30d: true,
  },
  {
    name: 'Expectancy',
    target: 'Target \u2265 $50',
    trend: [32, 45, 38, 52, 48, 61, 55, 68, 74],
    delta7d: '+$12',
    delta30d: '+$22',
    bar7d: 44,
    bar30d: 32,
    periods: ['$74', '$61', '$48'],
  },
  {
    name: 'Consistency',
    target: 'Target \u2265 70',
    trend: [68, 71, 65, 62, 60, 58, 55, 53, 50],
    delta7d: '-5.0',
    delta30d: '-18',
    bar7d: 30,
    bar30d: 50,
    periods: ['50.0', '58.0', '65.0'],
    negative7d: true,
    negative30d: true,
  },
  {
    name: 'Max Drawdown',
    target: 'Target \u2264 10%',
    trend: [14, 12, 13, 11, 10, 9, 11, 8, 7],
    delta7d: '-1.0',
    delta30d: '-3.0',
    bar7d: 40,
    bar30d: 30,
    periods: ['7.0%', '9.0%', '11.0%'],
  },
  {
    name: 'Recovery Factor',
    target: 'Target \u2265 2.0',
    trend: [0.8, 1.0, 1.2, 1.1, 1.5, 1.7, 1.6, 2.0, 2.3],
    delta7d: '+0.3',
    delta30d: '+0.8',
    bar7d: 36,
    bar30d: 26,
    periods: ['2.3', '1.7', '1.2'],
  },
  {
    name: 'W/L Ratio',
    target: 'Target \u2265 1.5',
    trend: [1.6, 1.5, 1.7, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9],
    delta7d: '-0.1',
    delta30d: '-0.7',
    bar7d: 14,
    bar30d: 42,
    periods: ['0.9', '1.2', '1.5'],
    negative7d: true,
    negative30d: true,
  },
  {
    name: 'Frequency',
    target: 'Target \u2265 3/wk',
    trend: [2.0, 2.5, 2.2, 3.0, 2.8, 3.5, 3.2, 3.8, 4.1],
    delta7d: '+0.3',
    delta30d: '+1.1',
    bar7d: 30,
    bar30d: 38,
    periods: ['4.1', '3.5', '2.8'],
  },
];

const trendLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

export function AiVisionMetricPreview() {
  const { activeIndex, isTransitioning } = useCycleAnimation(METRICS.length, 3000, 300);

  const metric = METRICS[activeIndex];
  const is7dNeg = !!metric.negative7d;
  const is30dNeg = !!metric.negative30d;

  // Normalize trend for SVG
  const tMin = Math.min(...metric.trend);
  const tMax = Math.max(...metric.trend);
  const tRange = tMax - tMin || 1;
  const svgW = 220;
  const svgH = 56;
  const padding = 8;

  const trendPath = metric.trend
    .map((v, i) => {
      const x = padding + (i / (metric.trend.length - 1)) * (svgW - padding * 2);
      const y = padding + (1 - (v - tMin) / tRange) * (svgH - padding * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Average line
  const avg = metric.trend.reduce((s, v) => s + v, 0) / metric.trend.length;
  const avgY = padding + (1 - (avg - tMin) / tRange) * (svgH - padding * 2);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-white/90">Performance Metrics</h3>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm overflow-hidden">
        {/* Metric header with animated name */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="relative h-5 overflow-hidden">
            <span
              className="text-[13px] font-semibold text-slate-100 inline-block transition-all duration-300 ease-out"
              style={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateY(-8px)' : 'translateY(0)',
              }}
            >
              {metric.name}
            </span>
          </div>
          <div className="relative overflow-hidden">
            <span
              className="text-[10px] leading-tight text-slate-500 inline-block transition-all duration-300 ease-out whitespace-nowrap"
              style={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateY(8px)' : 'translateY(0)',
              }}
            >
              {metric.target}
            </span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1 px-4 pb-2">
          {METRICS.map((_, i) => (
            <div
              key={i}
              className="h-0.5 rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? 16 : 4,
                backgroundColor: i === activeIndex
                  ? 'var(--tc-primary, #a855f7)'
                  : 'rgba(100, 116, 139, 0.3)',
              }}
            />
          ))}
        </div>

        <div
          className="transition-opacity duration-300"
          style={{ opacity: isTransitioning ? 0.4 : 1 }}
        >
          <div className="flex divide-x divide-slate-700/40">
            {/* Bar chart */}
            <div className="flex-1 px-4 pb-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                vs Baseline
              </p>
              <svg width="100%" height="48" viewBox="0 0 130 48" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="metric-bar-pos" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <linearGradient id="metric-bar-neg" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                {/* Center line */}
                <line x1="45" y1="0" x2="45" y2="48" stroke="#334155" strokeWidth="1" />
                {/* 7d bar */}
                {is7dNeg ? (
                  <rect x={45 - metric.bar7d} y="8" width={metric.bar7d} height="12" rx="6" fill="url(#metric-bar-neg)" />
                ) : (
                  <rect x="45" y="8" width={metric.bar7d} height="12" rx="6" fill="url(#metric-bar-pos)" />
                )}
                <text x={is7dNeg ? 49 : 40} y="17" fill="#94a3b8" fontSize="9" fontWeight="600" textAnchor={is7dNeg ? 'start' : 'end'}>7d</text>
                <text
                  x={is7dNeg ? 45 - metric.bar7d - 4 : 49 + metric.bar7d}
                  y="17"
                  fill={is7dNeg ? '#ef4444' : '#10b981'}
                  fontSize="9"
                  fontWeight="600"
                  textAnchor={is7dNeg ? 'end' : 'start'}
                >
                  {metric.delta7d}
                </text>
                {/* 30d bar */}
                {is30dNeg ? (
                  <rect x={45 - metric.bar30d} y="28" width={metric.bar30d} height="12" rx="6" fill="url(#metric-bar-neg)" />
                ) : (
                  <rect x="45" y="28" width={metric.bar30d} height="12" rx="6" fill="url(#metric-bar-pos)" />
                )}
                <text x={is30dNeg ? 49 : 40} y="37" fill="#94a3b8" fontSize="9" fontWeight="600" textAnchor={is30dNeg ? 'start' : 'end'}>30d</text>
                <text
                  x={is30dNeg ? 45 - metric.bar30d - 4 : 49 + metric.bar30d}
                  y="37"
                  fill={is30dNeg ? '#ef4444' : '#10b981'}
                  fontSize="9"
                  fontWeight="600"
                  textAnchor={is30dNeg ? 'end' : 'start'}
                >
                  {metric.delta30d}
                </text>
              </svg>
            </div>

            {/* Trend chart */}
            <div className="flex-1 px-4 pb-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Trend
              </p>
              <svg width="100%" height="56" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
                {/* Avg reference line */}
                <line
                  x1={padding}
                  y1={avgY}
                  x2={svgW - padding}
                  y2={avgY}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                {/* Trend line */}
                <path
                  d={trendPath}
                  fill="none"
                  stroke="var(--tc-primary, #a855f7)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* End dot */}
                <circle
                  cx={svgW - padding}
                  cy={padding + (1 - (metric.trend[metric.trend.length - 1] - tMin) / tRange) * (svgH - padding * 2)}
                  r="3"
                  fill="var(--tc-primary, #a855f7)"
                />
              </svg>
              {/* Labels outside SVG to avoid overlap */}
              <div className="flex justify-between mt-0.5 px-0.5">
                <span className="text-[8px] text-slate-500">{trendLabels[0]}</span>
                <span className="text-[8px] text-slate-500">{trendLabels[trendLabels.length - 1]}</span>
              </div>
            </div>
          </div>

          {/* Period pills */}
          <div className="grid grid-cols-3 gap-2 px-4 pb-3">
            {[
              { label: '7D', value: metric.periods[0], best: true },
              { label: '30D', value: metric.periods[1], best: false },
              { label: '90D', value: metric.periods[2], best: false },
            ].map((p) => (
              <div
                key={p.label}
                className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 border border-slate-700/40 bg-slate-800/20"
              >
                <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                  {p.label}
                </span>
                <span className="text-xs font-bold text-slate-100">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
