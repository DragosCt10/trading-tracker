'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip as ReTooltip } from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { TradeStatDatum } from './TradesStatsBarCard';
import { calculateEvaluationStats as calculateEvaluationStatsUtil } from '@/utils/calculateEvaluationStats';
import type { EvaluationStat } from '@/utils/calculateEvaluationStats';
import { useDarkMode } from '@/hooks/useDarkMode';

export interface EvaluationStatsProps {
  stats: EvaluationStat[];
  isLoading?: boolean;
}

export const GRADE_ORDER = ['A+', 'A', 'B', 'C'] as const;

/**
 * Calculate evaluation statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @param gradeOrder - Order of grades to include (default: ['A+', 'A', 'B', 'C'])
 * @returns Array of evaluation statistics
 */
export function calculateEvaluationStats(
  trades: any[],
  gradeOrder: string[] = GRADE_ORDER as unknown as string[]
): EvaluationStat[] {
  return calculateEvaluationStatsUtil(trades, gradeOrder);
}

/**
 * Convert evaluation stats to chart data format
 * Filters out "Not Evaluated" and sorts by grade order
 * @param stats - Array of evaluation statistics
 * @returns Array of TradeStatDatum for chart display
 */
export function convertEvaluationStatsToChartData(stats: EvaluationStat[]): TradeStatDatum[] {
  const filtered = stats
    .filter((stat) => GRADE_ORDER.includes(stat.grade as (typeof GRADE_ORDER)[number]))
    .sort(
      (a, b) => GRADE_ORDER.indexOf(a.grade as (typeof GRADE_ORDER)[number]) - GRADE_ORDER.indexOf(b.grade as (typeof GRADE_ORDER)[number]),
    );

  return filtered.map((stat) => ({
    category: `${stat.grade}`,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: stat.winRate,
    winRateWithBE: stat.winRateWithBE,
    totalTrades: stat.total,
  }));
}

/** Chart bar item: name + value for bar, plus full datum for tooltip */
interface EvaluationChartDatum extends TradeStatDatum {
  name: string;
  value: number;
}

export const EvaluationStats: React.FC<EvaluationStatsProps> = React.memo(
  function EvaluationStats({ stats, isLoading: externalLoading }) {
    const { mounted, isDark } = useDarkMode();
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
      if (mounted) {
        if (externalLoading !== undefined) {
          if (externalLoading) {
            setIsLoading(true);
          } else {
            const timer = setTimeout(() => setIsLoading(false), 600);
            return () => clearTimeout(timer);
          }
        } else {
          const timer = setTimeout(() => setIsLoading(false), 1000);
          return () => clearTimeout(timer);
        }
      }
    }, [mounted, externalLoading]);

    const chartDataRaw = convertEvaluationStatsToChartData(stats);
    const chartData: EvaluationChartDatum[] = chartDataRaw
      .filter((d) => (d.totalTrades ?? 0) > 0)
      .map((d) => ({
        ...d,
        name: d.category,
        value: d.totalTrades ?? 0,
      }));

    const totalEvaluated = chartDataRaw.reduce((sum, d) => sum + (d.totalTrades ?? 0), 0);
    const topGrade = chartDataRaw.find((d) => (d.totalTrades ?? 0) > 0)?.category ?? '—';
    const gradesCount = chartData.length;

    const maxValue = Math.max(...chartData.map((d) => d.value), 1);
    const axisTextColor = isDark ? '#cbd5e1' : '#64748b';

    const CustomTooltip = ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: { payload: EvaluationChartDatum }[];
    }) => {
      if (!active || !payload?.length) return null;
      const d = payload[0].payload;
      const wins = d.wins ?? 0;
      const losses = d.losses ?? 0;
      const beWins = d.beWins ?? 0;
      const beLosses = d.beLosses ?? 0;
      const winRate = d.winRate ?? 0;
      const winRateWithBE = d.winRateWithBE ?? d.winRate ?? 0;
      const totalTrades = d.totalTrades ?? wins + losses;
      return (
        <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            {d.category} {typeof totalTrades === 'number' ? `(${totalTrades} trade${totalTrades === 1 ? '' : 's'})` : ''}
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins:</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {wins} {beWins > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({beWins} BE)</span>}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses:</span>
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {losses} {beLosses > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({beLosses} BE)</span>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate:</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                {winRate.toFixed(2)}%
              </div>
            </div>
            {d.winRateWithBE !== undefined && (
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate (w/ BE):</span>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  {winRateWithBE.toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Evaluation Grade Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of evaluation trades by grade.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (totalEvaluated === 0 || chartData.length === 0) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Evaluation Grade Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of evaluation trades by grade.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No evaluation data found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                Evaluate your trades to see grade statistics here!
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Evaluation Grade Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of evaluation trades by grade.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative pl-1 pr-4">
            <div className="w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 0, bottom: 20 }}
                  barCategoryGap="20%"
                >
                  <defs>
                    <linearGradient id="evaluationGradeBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="evaluationGradeB" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#d97706" stopOpacity={0.8} />
                      <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="evaluationGradeC" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                      <stop offset="50%" stopColor="#fb7185" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#fda4af" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <ReTooltip
                    contentStyle={{
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
                      backdropFilter: 'blur(16px)',
                      border: isDark ? '1px solid rgba(51, 65, 85, 0.6)' : '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '16px',
                      padding: '14px 18px',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: 14,
                      boxShadow: isDark
                        ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                        : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                      minWidth: '160px',
                    }}
                    wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                    cursor={false}
                    content={<CustomTooltip />}
                  />
                  <XAxis
                    type="number"
                    domain={[0, Math.ceil(maxValue * 1.15)]}
                    tick={{ fill: axisTextColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => value.toString()}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: axisTextColor, fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickMargin={8}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                    {chartData.map((entry, index) => {
                      let gradientId = 'evaluationGradeBar';
                      if (entry.category === 'B') gradientId = 'evaluationGradeB';
                      else if (entry.category === 'C') gradientId = 'evaluationGradeC';
                      return (
                        <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="w-full px-4 pt-4 mt-2">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Total Evaluated
                </div>
                <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                  {totalEvaluated}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Top Grade
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {topGrade}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Grades
                </div>
                <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                  {gradesCount}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
