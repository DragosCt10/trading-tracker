'use client';

// src/components/dashboard/ai-vision/AiVisionScoreCard.tsx
import { GaugeChartCard, GradientStop } from '@/components/dashboard/analytics/GaugeChartCard';
import { AI_VISION_METRICS } from '@/constants/aiVisionMetrics';

interface AiVisionScoreCardProps {
  label: string;         // e.g. "Last 7 days"
  score: number;         // 0–100
  delta: number | null;  // pts vs prior period (null = N/A)
  vsLabel?: string;      // e.g. "vs 30d" — shown in the delta badge
  isBaseline?: boolean;  // true for the 90d card (no delta arrow)
  hasNoTrades?: boolean;
}

function getGradientStops(score: number): GradientStop[] {
  if (score >= 70) return [
    { offset: '0%', stopColor: '#22c55e', stopOpacity: 1 },
    { offset: '100%', stopColor: '#16a34a', stopOpacity: 0.9 },
  ];
  if (score >= 45) return [
    { offset: '0%', stopColor: '#f59e0b', stopOpacity: 1 },
    { offset: '100%', stopColor: '#d97706', stopOpacity: 0.9 },
  ];
  return [
    { offset: '0%', stopColor: '#ef4444', stopOpacity: 1 },
    { offset: '100%', stopColor: '#dc2626', stopOpacity: 0.9 },
  ];
}

function getTextColor(score: number): string {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 45) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

function getHoverDotColor(score: number): string {
  if (score >= 70) return 'bg-green-500 dark:bg-green-400 ring-green-200/50 dark:ring-green-500/30';
  if (score >= 45) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
  return 'bg-red-500 dark:bg-red-400 ring-red-200/50 dark:ring-red-500/30';
}

const infoContent = (
  <div className="space-y-3">
    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      How it&apos;s calculated
    </div>
    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
      A single score from <span className="font-semibold text-slate-700 dark:text-slate-300">0 to 100</span> that
      blends your key trading metrics into one clear picture of performance health.
    </div>
    <div className="space-y-1.5">
      {AI_VISION_METRICS.map(({ key, fullLabel }) => (
        <div key={key} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
          {fullLabel}
        </div>
      ))}
    </div>
    <div className="flex gap-2 pt-1">
      {[
        { label: 'Poor', range: '< 45', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30' },
        { label: 'Fair', range: '45–70', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30' },
        { label: 'Strong', range: '70+', color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200/50 dark:border-green-800/30' },
      ].map(({ label, range, color }) => (
        <div key={label} className={`flex-1 rounded-lg border px-2 py-1.5 text-center ${color}`}>
          <div className="text-[10px] font-semibold">{label}</div>
          <div className="text-[10px] opacity-80">{range}</div>
        </div>
      ))}
    </div>
  </div>
);

export function AiVisionScoreCard({
  label,
  score,
  delta,
  vsLabel,
  isBaseline = false,
  hasNoTrades = false,
}: AiVisionScoreCardProps) {
  const showDelta = !isBaseline && delta !== null;
  const isPositive = delta !== null && delta > 0;

  const centerValue = (
    <span className={getTextColor(score)}>{score}</span>
  );

  const targetText = (() => {
    if (isBaseline) return '90d baseline';
    if (showDelta && delta !== null) {
      return `${isPositive ? '+' : ''}${delta} pts${vsLabel ? ` ${vsLabel}` : ''}`;
    }
    return 'Health score (0–100)';
  })();

  const hoverSubtextDelta = (() => {
    if (isBaseline) return '90d reference period';
    if (showDelta && delta !== null) {
      const sign = isPositive ? '+' : '';
      return `${sign}${delta} pts${vsLabel ? ` ${vsLabel}` : ''}`;
    }
    return `${score}% of maximum scale`;
  })();

  return (
    <GaugeChartCard
      title={label}
      description="Composite health score"
      isPro={true}
      isEmpty={hasNoTrades}
      percentage={score}
      dataName="Health Score"
      gradientStops={getGradientStops(score)}
      scaleLeft="0"
      scaleRight="100"
      centerValue={centerValue}
      targetText={targetText}
      hoverLabel={label}
      hoverValue={String(score)}
      hoverValueColor={getTextColor(score)}
      hoverDotColor={getHoverDotColor(score)}
      hoverSubtext={hoverSubtextDelta}
      infoContent={infoContent}
    />
  );
}
