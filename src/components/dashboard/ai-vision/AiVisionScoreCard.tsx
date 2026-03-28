'use client';

// src/components/dashboard/ai-vision/AiVisionScoreCard.tsx
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AiVisionScoreCardProps {
  label: string;         // e.g. "Last 7 days"
  score: number;         // 0–100
  delta: number | null;  // pts vs prior period (null = N/A)
  isBaseline?: boolean;  // true for the 90d card (no delta arrow)
  hasNoTrades?: boolean;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 70 ? '#22c55e'  // green-500
    : score >= 45 ? '#f59e0b' // amber-500
    : '#ef4444';               // red-500

  return (
    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
      <circle
        cx="48" cy="48" r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        className="text-slate-200 dark:text-slate-700"
      />
      <circle
        cx="48" cy="48" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
      />
      <text
        x="48" y="52"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="18"
        fontWeight="700"
        fill={color}
      >
        {score}
      </text>
    </svg>
  );
}

export function AiVisionScoreCard({
  label,
  score,
  delta,
  isBaseline = false,
  hasNoTrades = false,
}: AiVisionScoreCardProps) {
  const showDelta = !isBaseline && delta !== null;
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {label}
      </p>

      {hasNoTrades ? (
        <div className="flex h-24 items-center justify-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">No trades<br />this period</p>
        </div>
      ) : (
        <ScoreRing score={score} />
      )}

      {showDelta && !hasNoTrades ? (
        <div
          className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            isPositive && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            isNegative && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            !isPositive && !isNegative && 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
          )}
          aria-label={`${isPositive ? 'improved' : isNegative ? 'declined' : 'unchanged'} by ${Math.abs(delta!)} points`}
        >
          {isPositive && <TrendingUp className="h-3 w-3" />}
          {isNegative && <TrendingDown className="h-3 w-3" />}
          {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
          <span>
            {isPositive ? '+' : ''}{delta} pts
          </span>
        </div>
      ) : isBaseline && !hasNoTrades ? (
        <span className="text-xs text-slate-400 dark:text-slate-500">baseline</span>
      ) : null}
    </div>
  );
}
