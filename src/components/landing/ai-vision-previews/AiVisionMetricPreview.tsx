'use client';

/**
 * Pure-SVG metric preview mimicking AiVisionMetricRow.
 * Shows a mini bar chart (delta vs baseline) and a trendline.
 */
export function AiVisionMetricPreview() {
  const trendPoints = [58, 61, 59, 64, 63, 67, 65, 68, 72];
  const trendLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

  // Normalize trend for SVG
  const tMin = Math.min(...trendPoints);
  const tMax = Math.max(...trendPoints);
  const tRange = tMax - tMin || 1;
  const svgW = 220;
  const svgH = 56;
  const padding = 4;

  const trendPath = trendPoints
    .map((v, i) => {
      const x = padding + (i / (trendPoints.length - 1)) * (svgW - padding * 2);
      const y = padding + (1 - (v - tMin) / tRange) * (svgH - padding * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Average line
  const avg = trendPoints.reduce((s, v) => s + v, 0) / trendPoints.length;
  const avgY = padding + (1 - (avg - tMin) / tRange) * (svgH - padding * 2);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-semibold text-white/90">Performance Metrics</h4>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm overflow-hidden">
        {/* Metric header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-[13px] font-semibold text-slate-100">Win Rate</span>
          <span className="text-[10px] text-slate-500">Target &ge; 50%</span>
        </div>

        <div className="flex divide-x divide-slate-700/40">
          {/* Bar chart */}
          <div className="flex-1 px-4 pb-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              vs Baseline
            </p>
            <svg width="100%" height="48" viewBox="0 0 120 48" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="metric-bar-green" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              {/* Center line */}
              <line x1="40" y1="0" x2="40" y2="48" stroke="#334155" strokeWidth="1" />
              {/* 7d bar */}
              <rect x="40" y="8" width="52" height="12" rx="6" fill="url(#metric-bar-green)" />
              <text x="35" y="17" fill="#94a3b8" fontSize="9" fontWeight="600" textAnchor="end">7d</text>
              <text x="96" y="17" fill="#10b981" fontSize="9" fontWeight="600">+7.2</text>
              {/* 30d bar */}
              <rect x="40" y="28" width="24" height="12" rx="6" fill="url(#metric-bar-green)" />
              <text x="35" y="37" fill="#94a3b8" fontSize="9" fontWeight="600" textAnchor="end">30d</text>
              <text x="68" y="37" fill="#10b981" fontSize="9" fontWeight="600">+3.1</text>
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
              {/* End labels */}
              <text x={padding} y={svgH - 1} fill="#64748b" fontSize="8">{trendLabels[0]}</text>
              <text x={svgW - padding} y={svgH - 1} fill="#64748b" fontSize="8" textAnchor="end">
                {trendLabels[trendLabels.length - 1]}
              </text>
            </svg>
          </div>
        </div>

        {/* Period pills */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
          {[
            { label: '7d', value: '72.0%', best: true },
            { label: '30d', value: '67.5%', best: false },
            { label: '90d', value: '64.8%', best: false },
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
  );
}
