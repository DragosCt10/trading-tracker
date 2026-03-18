'use client';

import React, { useMemo } from 'react';
import { Crown } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useBECalc } from '@/contexts/BECalcContext';
import { ComposedBarWinRateChart, type BarWinRateChartDatum } from './ComposedBarWinRateChart';

export interface TimeIntervalStatisticsCardProps {
  /** Stats per time interval (same buckets as TIME_INTERVALS). */
  data: TradeStatDatum[];
  isLoading?: boolean;
  /** Optional: show only this interval (e.g. "08:00 – 11:59"). Legacy trades with simple time are still counted in the correct bucket via data. */
  selectedIntervalLabel?: string | null;
  isPro?: boolean;
}


export const TimeIntervalStatisticsCard: React.FC<TimeIntervalStatisticsCardProps> = React.memo(
  function TimeIntervalStatisticsCard({ data: rawData, isLoading, selectedIntervalLabel, isPro }) {
    const isLocked = !isPro;

    const previewData = useMemo<TradeStatDatum[]>(
      () => [
        {
          category: '00:00 – 03:59',
          wins: 3,
          losses: 1,
          breakEven: 1,
          totalTrades: 5,
          winRate: (3 / (3 + 1)) * 100,
          winRateWithBE: (3 / 5) * 100,
        },
        {
          category: '04:00 – 07:59',
          wins: 2,
          losses: 2,
          breakEven: 1,
          totalTrades: 5,
          winRate: (2 / (2 + 2)) * 100,
          winRateWithBE: (2 / 5) * 100,
        },
        {
          category: '08:00 – 11:59',
          wins: 4,
          losses: 1,
          breakEven: 0,
          totalTrades: 5,
          winRate: (4 / (4 + 1)) * 100,
          winRateWithBE: (4 / 5) * 100,
        },
        {
          category: '12:00 – 15:59',
          wins: 1,
          losses: 3,
          breakEven: 1,
          totalTrades: 5,
          winRate: (1 / (1 + 3)) * 100,
          winRateWithBE: (1 / 5) * 100,
        },
        {
          category: '16:00 – 19:59',
          wins: 2,
          losses: 1,
          breakEven: 2,
          totalTrades: 5,
          winRate: (2 / (2 + 1)) * 100,
          winRateWithBE: (2 / 5) * 100,
        },
        {
          category: '20:00 – 23:59',
          wins: 0,
          losses: 2,
          breakEven: 1,
          totalTrades: 3,
          winRate: 0,
          winRateWithBE: 0,
        },
      ],
      []
    );

    const effectiveData = isLocked ? previewData : rawData;
    const { mounted, isDark } = useDarkMode();
    const { beCalcEnabled } = useBECalc();

    // When a specific interval is selected, show only that row (data already includes legacy trades bucketed by trade_time)
    const dataToShow = selectedIntervalLabel
      ? effectiveData.filter((d) => d.category === selectedIntervalLabel)
      : effectiveData;

    // BE new flow: wins, losses, breakEven separate; totalTrades = wins + losses + breakEven
    const withTotals: TradeStatDatum[] = dataToShow.map((d) => {
      const wins = d.wins ?? 0;
      const losses = d.losses ?? 0;
      const breakEven = d.breakEven ?? 0;
      const totalTrades = d.totalTrades ?? wins + losses + breakEven;
      const hasTradesButNoOutcomes = totalTrades > 0 && wins === 0 && losses === 0 && breakEven === 0;
      return {
        ...d,
        totalTrades,
        wins: hasTradesButNoOutcomes ? 0.01 : wins,
        losses,
        breakEven,
      };
    });

    const hasContent = withTotals.some(
      (d) =>
        (d.totalTrades ?? 0) > 0 ||
        (d.wins ?? 0) > 0 ||
        (d.losses ?? 0) > 0 ||
        (d.breakEven ?? 0) > 0
    );

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          {isLocked && (
            <span className="absolute right-3 top-3 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
              <Crown className="w-3 h-3" /> PRO
            </span>
          )}
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Time Interval Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on time interval
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (!hasContent) {
      return (
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            {!isPro ? (
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Time Interval Stats
                </CardTitle>
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" /> PRO
                </span>
              </div>
            ) : (
              <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
                Time Interval Stats
              </CardTitle>
            )}
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades based on time interval
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
              No trades found
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
              There are no trades to display for this category yet. Start trading to see your statistics here!
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        {isLocked && (
          <span className="absolute right-3 top-3 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> PRO
          </span>
        )}

        {isLocked && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
        )}

        <div
          className={`relative z-0 flex flex-col h-full ${
            isLocked ? 'blur-[3px] opacity-70 pointer-events-none select-none' : ''
          }`}
        >
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Time Interval Stats
              </CardTitle>
            </div>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades based on time interval
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end mt-1">
            <div className="w-full h-[250px]">
              <ComposedBarWinRateChart
                data={withTotals as BarWinRateChartDatum[]}
                xAxisDataKey="category"
                xAxisTickFormatter={(_: string, i: number) => {
                  const d = withTotals[i];
                  return d ? `${d.category} (${d.totalTrades ?? 0})` : '';
                }}
                tooltipHeaderGetter={(d) => String(d.category ?? '')}
                isDark={isDark}
                beCalcEnabled={beCalcEnabled}
                idPrefix="timeInterval"
                barCategoryGap="20%"
                lineActiveDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
              />
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }
);
