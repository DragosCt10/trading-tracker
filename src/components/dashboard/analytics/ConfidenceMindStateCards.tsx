'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Crown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Trade } from '@/types/trade';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { useDarkMode } from '@/hooks/useDarkMode';
import { cn } from '@/lib/utils';
import { buildPreviewTrade } from '@/utils/previewTrades';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Very low',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Very confident',
};

const MIND_STATE_LABELS: Record<number, string> = {
  1: 'Very poor',
  2: 'Poor',
  3: 'Neutral',
  4: 'Good',
  5: 'Very good',
};
const LOCKED_CARD_TOOLTIP_TEXT = 'The data shown under the blur card is fictive and for demo purposes only.';
const LOCKED_CARD_TOOLTIP_CLASS =
  'max-w-sm text-xs rounded-2xl p-3 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm shadow-md shadow-slate-200/50 dark:shadow-none text-slate-900 dark:text-slate-50';

function wrapLockedCard(card: React.ReactElement, isLocked: boolean) {
  if (!isLocked) {
    return card;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={120}>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={8}
          className={LOCKED_CARD_TOOLTIP_CLASS}
        >
          {LOCKED_CARD_TOOLTIP_TEXT}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function computeScaleStats(
  trades: Trade[],
  key: 'confidence_at_entry' | 'mind_state_at_entry'
): { counts: Record<number, number>; total: number; average: number } {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let n = 0;
  trades.forEach((t) => {
    const v = key === 'confidence_at_entry' ? t.confidence_at_entry : t.mind_state_at_entry;
    if (v != null && v >= 1 && v <= 5) {
      counts[v] = (counts[v] ?? 0) + 1;
      sum += v;
      n += 1;
    }
  });
  const total = n;
  const average = total > 0 ? sum / total : 0;
  return { counts, total, average };
}

/** Needle points to value 0–100 (0 = left, 100 = right) on a semicircle gauge. displayValue is shown in center (e.g. 1–5 average). */
function NeedlePieChart({
  needleValue0To100,
  displayValue,
  total,
  centerLabel,
  isDark,
}: {
  needleValue0To100: number;
  displayValue: number;
  total: number;
  centerLabel: string;
  isDark: boolean;
}) {
  const id = React.useId().replace(/:/g, '');
  const filledGradId = `gauge-filled-${id}`;
  const lowRangeGradId = `gauge-low-${id}`;
  const emptyGradId = `gauge-empty-${id}`;

  const inLowRange = total > 0 && displayValue < 3;
  const filledGradientId = inLowRange ? lowRangeGradId : filledGradId;

  const clamped = Math.max(0, Math.min(100, needleValue0To100));
  const filled = clamped;
  const empty = 100 - filled;
  const gaugeData = [
    { name: 'filled', value: filled, fill: `url(#${filledGradientId})` },
    { name: 'empty', value: empty, fill: `url(#${emptyGradId})` },
  ];

  return (
    <div className="w-full h-full max-h-[200px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id={filledGradId} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor={isDark ? '#0f766e' : '#0d9488'} />
              <stop offset="100%" stopColor={isDark ? '#5eead4' : '#2dd4bf'} />
            </linearGradient>
            <linearGradient id={lowRangeGradId} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor={isDark ? '#b45309' : '#d97706'} />
              <stop offset="100%" stopColor={isDark ? '#f59e0b' : '#fbbf24'} />
            </linearGradient>
            <linearGradient id={emptyGradId} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor={isDark ? 'rgba(51,65,85,0.25)' : 'rgba(148,163,184,0.25)'} />
              <stop offset="100%" stopColor={isDark ? 'rgba(71,85,105,0.5)' : 'rgba(203,213,225,0.45)'} />
            </linearGradient>
          </defs>
          <Pie
            data={gaugeData}
            cx="50%"
            cy="70%"
            startAngle={180}
            endAngle={0}
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
            cornerRadius={7}
          >
            {gaugeData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Center overlay: value + label only (no needle) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-[18%] pointer-events-none">
        <div className="text-center">
          <div
            className="text-xl font-bold tabular-nums"
            style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}
          >
            {total > 0 ? displayValue.toFixed(1) : '–'}
          </div>
          <div
            className="text-xs mt-0.5"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            {centerLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface ConfidenceStatsCardProps {
  trades: Trade[];
  isLoading?: boolean;
  isPro?: boolean;
}

export const ConfidenceStatsCard: React.FC<ConfidenceStatsCardProps> = React.memo(
  function ConfidenceStatsCard({ trades, isLoading: externalLoading, isPro }) {
    const { mounted, isDark } = useDarkMode();
    const [isLoading, setIsLoading] = useState(true);
    const isLocked = !isPro;

    const previewTrades = useMemo<Trade[]>(
      () => [
        buildPreviewTrade({
          id: 'preview-confidence-2',
          confidence_at_entry: 2,
          mind_state_at_entry: 3,
          trade_outcome: 'Win',
        }),
        buildPreviewTrade({
          id: 'preview-confidence-4',
          confidence_at_entry: 4,
          mind_state_at_entry: 3,
          trade_outcome: 'Lose',
        }),
      ],
      []
    );

    useEffect(() => {
      if (mounted) {
        if (externalLoading !== undefined) {
          const timer = setTimeout(() => setIsLoading(externalLoading), 0);
          return () => clearTimeout(timer);
        } else {
          const t = setTimeout(() => setIsLoading(false), 600);
          return () => clearTimeout(t);
        }
      }
    }, [mounted, externalLoading]);

    const { counts, total, average } = useMemo(
      () => computeScaleStats(isLocked ? previewTrades : trades, 'confidence_at_entry'),
      [isLocked, previewTrades, trades]
    );
    const needlePct = total > 0 ? ((average - 1) / 4) * 100 : 0;

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Confidence
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of confidence (1–5) at entry
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    return wrapLockedCard(
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        {isLocked && (
          <span className="absolute right-3 top-3 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> PRO
          </span>
        )}

        {isLocked && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
        )}

        <div
          className={cn(
            'relative z-0 flex flex-col h-full',
            isLocked && 'blur-[3px] opacity-70 pointer-events-none select-none'
          )}
        >
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Confidence
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of confidence (1–5) at entry
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
            <div className="flex-1 w-full flex items-center justify-center min-h-0">
              <NeedlePieChart
                needleValue0To100={needlePct}
                displayValue={average}
                total={total}
                centerLabel="Avg"
                isDark={isDark}
              />
            </div>
            <div className="w-full px-4 pt-4 mt-2 flex flex-wrap items-center justify-center gap-4">
              {( [1, 2, 3, 4, 5] as const ).map((level) => (
                <div key={level} className="flex flex-col items-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {CONFIDENCE_LABELS[level]}
                  </div>
                  <div className={`text-lg font-bold ${(counts[level] ?? 0) > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}>{counts[level] ?? 0}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>
    , isLocked);
  }
);

export interface MindStateStatsCardProps {
  trades: Trade[];
  isLoading?: boolean;
  isPro?: boolean;
}

export const MindStateStatsCard: React.FC<MindStateStatsCardProps> = React.memo(
  function MindStateStatsCard({ trades, isLoading: externalLoading, isPro }) {
    const { mounted, isDark } = useDarkMode();
    const [isLoading, setIsLoading] = useState(true);
    const isLocked = !isPro;

    const previewTrades = useMemo<Trade[]>(
      () => [
        buildPreviewTrade({
          id: 'preview-mind-2',
          confidence_at_entry: 3,
          mind_state_at_entry: 2,
          trade_outcome: 'Win',
        }),
        buildPreviewTrade({
          id: 'preview-mind-4',
          confidence_at_entry: 3,
          mind_state_at_entry: 4,
          trade_outcome: 'Lose',
        }),
      ],
      []
    );

    useEffect(() => {
      if (mounted) {
        if (externalLoading !== undefined) {
          const timer = setTimeout(() => setIsLoading(externalLoading), 0);
          return () => clearTimeout(timer);
        } else {
          const t = setTimeout(() => setIsLoading(false), 600);
          return () => clearTimeout(t);
        }
      }
    }, [mounted, externalLoading]);

    const { counts, total, average } = useMemo(
      () => computeScaleStats(isLocked ? previewTrades : trades, 'mind_state_at_entry'),
      [isLocked, previewTrades, trades]
    );

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Mind State
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of mind state (1–5) at entry
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    return wrapLockedCard(
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        {isLocked && (
          <span className="absolute right-3 top-3 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> PRO
          </span>
        )}

        {isLocked && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
        )}

        <div
          className={cn(
            'relative z-0 flex flex-col h-full',
            isLocked && 'blur-[3px] opacity-70 pointer-events-none select-none'
          )}
        >
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Mind State
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of mind state (1–5) at entry
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
            <div className="flex-1 w-full flex items-center justify-center min-h-0">
              <NeedlePieChart
                needleValue0To100={total > 0 ? ((average - 1) / 4) * 100 : 0}
                displayValue={average}
                total={total}
                centerLabel="Avg"
                isDark={isDark}
              />
            </div>
            <div className="w-full px-4 pt-4 mt-2 flex flex-wrap items-center justify-center gap-4">
              {( [1, 2, 3, 4, 5] as const ).map((level) => (
                <div key={level} className="flex flex-col items-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {MIND_STATE_LABELS[level]}
                  </div>
                  <div className={`text-lg font-bold ${(counts[level] ?? 0) > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}>{counts[level] ?? 0}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>
    , isLocked);
  }
);
