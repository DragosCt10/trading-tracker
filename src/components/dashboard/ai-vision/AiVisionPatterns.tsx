'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DetectedPattern, PatternType } from '@/utils/detectTradingPatterns';
import { AiVisionPatternCard } from './AiVisionPatternCard';

const MAX_VISIBLE = 12;

const FILTER_OPTIONS: Array<{ key: PatternType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'warning', label: 'Warnings' },
  { key: 'weakness', label: 'Weaknesses' },
  { key: 'strength', label: 'Strengths' },
  { key: 'insight', label: 'Insights' },
];

interface AiVisionPatternsProps {
  patterns: DetectedPattern[];
}

export function AiVisionPatterns({ patterns }: AiVisionPatternsProps) {
  const [filter, setFilter] = useState<PatternType | 'all'>('all');
  const [showAll, setShowAll] = useState(false);

  const safePatterns = useMemo(() => patterns ?? [], [patterns]);

  // Count per type
  const counts = useMemo(() => safePatterns.reduce<Record<PatternType, number>>(
    (acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    },
    { strength: 0, weakness: 0, insight: 0, warning: 0 },
  ), [safePatterns]);

  const filtered = filter === 'all' ? safePatterns : safePatterns.filter((p) => p.type === filter);
  const visible = showAll ? filtered : filtered.slice(0, MAX_VISIBLE);
  const hasMore = filtered.length > MAX_VISIBLE;

  return (
    <section aria-label="AI Detected Patterns">
      {/* ── Heading + badges ──────────────────────────────────────── */}
      <div className="flex items-center mt-8 justify-between mb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Patterns
          </h2>
        </div>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-4">
        Actionable patterns detected from your trading data.
      </p>

      {safePatterns.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          Not enough trading data to detect patterns.
        </div>
      ) : (
        <>
          {/* ── Filter pills ──────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 mb-4 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-1 w-fit">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setFilter(opt.key);
                  setShowAll(false);
                }}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200',
                  filter === opt.key
                    ? 'themed-btn-primary text-white border-0'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                {opt.label}
                {opt.key !== 'all' && counts[opt.key] > 0 && (
                  <span className="ml-1 opacity-70">{counts[opt.key]}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Pattern grid ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((p) => (
              <AiVisionPatternCard key={p.id + (p.periods?.join(',') ?? '')} pattern={p} />
            ))}
          </div>

          {/* ── Show all toggle ───────────────────────────────────── */}
          {hasMore && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Show all {filtered.length} patterns
            </button>
          )}
          {showAll && hasMore && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Show fewer
            </button>
          )}
        </>
      )}
    </section>
  );
}
