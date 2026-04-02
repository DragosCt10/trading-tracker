'use client';

/**
 * Pure-SVG gauge preview mimicking AiVisionScoreCard.
 * No Recharts — keeps the landing page bundle lean.
 */
export function AiVisionScorePreview() {
  const score = 74;
  const delta = 6;

  // Arc geometry (half-donut)
  const cx = 80;
  const cy = 78;
  const r = 56;
  const startAngle = Math.PI;
  const endAngle = 0;
  const scoreAngle = startAngle - (score / 100) * Math.PI;

  const arcPath = (from: number, to: number) => {
    const x1 = cx + r * Math.cos(from);
    const y1 = cy - r * Math.sin(from);
    const x2 = cx + r * Math.cos(to);
    const y2 = cy - r * Math.sin(to);
    const largeArc = Math.abs(from - to) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-2 self-start">
        <h4 className="text-sm font-semibold text-white/90">Composite Health Score</h4>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm p-4 w-full">
        <div className="relative flex justify-center">
          <svg width="160" height="96" viewBox="0 0 160 96" className="overflow-visible">
            <defs>
              <linearGradient id="score-gauge-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
            {/* Track */}
            <path
              d={arcPath(startAngle, endAngle)}
              fill="none"
              stroke="rgba(51,65,85,0.3)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d={arcPath(startAngle, scoreAngle)}
              fill="none"
              stroke="url(#score-gauge-grad)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Scale labels */}
            <text x="4" y="92" fill="#64748b" fontSize="10" fontWeight="500">0</text>
            <text x="148" y="92" fill="#64748b" fontSize="10" fontWeight="500">100</text>
          </svg>

          {/* Center value */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
            <div className="text-2xl font-bold text-green-400">{score}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
              +{delta} pts vs 30d
            </div>
          </div>
        </div>

        {/* Period pills */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: '7d', value: 74 },
            { label: '30d', value: 68 },
            { label: '90d', value: 62 },
          ].map((p) => (
            <div
              key={p.label}
              className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 border border-slate-700/40 bg-slate-800/20"
            >
              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                {p.label}
              </span>
              <span className="text-sm font-bold text-slate-100">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
