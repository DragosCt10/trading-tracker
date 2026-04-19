'use client';

import { useCycleAnimation } from '@/hooks/useCycleAnimation';

/**
 * Animated gauge preview mimicking AiVisionScoreCard.
 * Cycles through different score states showing improvement/regression.
 */

const SCORE_STATES = [
  { score: 74, delta: '+6', deltaLabel: 'vs 30d', color: '#22c55e', periods: [74, 68, 62] },
  { score: 81, delta: '+3', deltaLabel: 'vs 30d', color: '#22c55e', periods: [81, 78, 71] },
  { score: 58, delta: '-8', deltaLabel: 'vs 30d', color: '#ef4444', periods: [58, 66, 70] },
  { score: 92, delta: '+11', deltaLabel: 'vs 30d', color: '#22c55e', periods: [92, 81, 74] },
  { score: 45, delta: '-13', deltaLabel: 'vs 30d', color: '#ef4444', periods: [45, 58, 63] },
  { score: 67, delta: '+2', deltaLabel: 'vs 30d', color: '#f59e0b', periods: [67, 65, 60] },
];

function getScoreColor(score: number) {
  if (score >= 75) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

export function AiVisionScorePreview() {
  const { activeIndex, isTransitioning } = useCycleAnimation(SCORE_STATES.length, 4000, 300);

  const state = SCORE_STATES[activeIndex];
  const scoreColor = getScoreColor(state.score);
  const isNegDelta = state.delta.startsWith('-');

  // Arc geometry (half-donut)
  const cx = 80;
  const cy = 78;
  const r = 56;
  const startAngle = Math.PI;
  const endAngle = 0;
  const scoreAngle = startAngle - (state.score / 100) * Math.PI;

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
        <h3 className="text-sm font-semibold text-white/90">Composite Health Score</h3>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm p-4 w-full">
        <div className="relative flex justify-center">
          <svg width="160" height="96" viewBox="0 0 160 96" className="overflow-visible">
            <defs>
              <linearGradient id="score-gauge-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={scoreColor} />
                <stop offset="100%" stopColor={scoreColor} stopOpacity={0.7} />
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
              className="transition-all duration-700 ease-out"
            />
            {/* Scale labels */}
            <text x="4" y="92" fill="#64748b" fontSize="10" fontWeight="500">0</text>
            <text x="148" y="92" fill="#64748b" fontSize="10" fontWeight="500">100</text>
          </svg>

          {/* Center value */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
            <div
              className="text-2xl font-bold transition-all duration-500 ease-out"
              style={{
                color: scoreColor,
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'scale(0.8)' : 'scale(1)',
              }}
            >
              {state.score}
            </div>
            <div
              className="text-[10px] mt-0.5 whitespace-nowrap font-medium transition-all duration-300"
              style={{
                color: isNegDelta ? '#ef4444' : '#64748b',
                opacity: isTransitioning ? 0 : 1,
              }}
            >
              {state.delta} pts {state.deltaLabel}
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1 mt-3 mb-1">
          {SCORE_STATES.map((_, i) => (
            <div
              key={i}
              className="h-0.5 rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? 14 : 4,
                backgroundColor: i === activeIndex
                  ? 'var(--tc-primary, #a855f7)'
                  : 'rgba(100, 116, 139, 0.3)',
              }}
            />
          ))}
        </div>

        {/* Period pills */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { label: '7D', value: state.periods[0] },
            { label: '30D', value: state.periods[1] },
            { label: '90D', value: state.periods[2] },
          ].map((p) => (
            <div
              key={p.label}
              className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 border border-slate-700/40 bg-slate-800/20"
            >
              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                {p.label}
              </span>
              <span
                className="text-sm font-bold transition-all duration-500"
                style={{
                  color: getScoreColor(p.value),
                  opacity: isTransitioning ? 0.4 : 1,
                }}
              >
                {p.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
