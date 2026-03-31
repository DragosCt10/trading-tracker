'use client';

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DashboardCardHeaderAction } from './DashboardCardHeaderAction';

const LOCKED_CARD_TOOLTIP_TEXT = 'The data shown under the blur card is fictive and for demo purposes only.';
const LOCKED_CARD_TOOLTIP_CLASS =
  'max-w-sm text-xs rounded-2xl p-3 border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50';

export interface TimeIntervalStatisticsCardProps {
  /** Stats per time interval (same buckets as TIME_INTERVALS). */
  data: TradeStatDatum[];
  isLoading?: boolean;
  /** Optional: show only this interval (e.g. "08:00 – 11:59"). Legacy trades with simple time are still counted in the correct bucket via data. */
  selectedIntervalLabel?: string | null;
  isPro?: boolean;
  headerAction?: ReactNode;
  bodyVisible?: boolean;
}


export const TimeIntervalStatisticsCard: React.FC<TimeIntervalStatisticsCardProps> = React.memo(
  function TimeIntervalStatisticsCard({
    data: rawData,
    isLoading,
    selectedIntervalLabel,
    isPro,
    headerAction,
    bodyVisible = true,
  }) {
    const isLocked = !isPro;
    const wrapLockedCard = (card: React.ReactElement) => {
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
    };

    const previewData = useMemo<TradeStatDatum[]>(
      () => [
        { category: '00:00 – 01:59', wins: 1, losses: 1, breakEven: 0, totalTrades: 2, winRate: 50, winRateWithBE: 50 },
        { category: '02:00 – 03:59', wins: 0, losses: 1, breakEven: 1, totalTrades: 2, winRate: 0, winRateWithBE: 0 },
        { category: '04:00 – 05:59', wins: 2, losses: 1, breakEven: 0, totalTrades: 3, winRate: (2 / 3) * 100, winRateWithBE: (2 / 3) * 100 },
        { category: '06:00 – 07:59', wins: 1, losses: 2, breakEven: 0, totalTrades: 3, winRate: (1 / 3) * 100, winRateWithBE: (1 / 3) * 100 },
        { category: '08:00 – 09:59', wins: 4, losses: 1, breakEven: 0, totalTrades: 5, winRate: 80, winRateWithBE: 80 },
        { category: '10:00 – 11:59', wins: 3, losses: 1, breakEven: 1, totalTrades: 5, winRate: 75, winRateWithBE: 60 },
        { category: '12:00 – 13:59', wins: 2, losses: 2, breakEven: 1, totalTrades: 5, winRate: 50, winRateWithBE: 40 },
        { category: '14:00 – 15:59', wins: 1, losses: 3, breakEven: 0, totalTrades: 4, winRate: 25, winRateWithBE: 25 },
        { category: '16:00 – 17:59', wins: 3, losses: 1, breakEven: 0, totalTrades: 4, winRate: 75, winRateWithBE: 75 },
        { category: '18:00 – 19:59', wins: 1, losses: 1, breakEven: 1, totalTrades: 3, winRate: 50, winRateWithBE: (1 / 3) * 100 },
        { category: '20:00 – 21:59', wins: 0, losses: 2, breakEven: 0, totalTrades: 2, winRate: 0, winRateWithBE: 0 },
        { category: '22:00 – 23:59', wins: 1, losses: 0, breakEven: 1, totalTrades: 2, winRate: 100, winRateWithBE: 50 },
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
      return wrapLockedCard(
        <Card
          className={cn(
            'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex flex-col',
            bodyVisible ? 'h-96' : 'h-auto'
          )}
        >
          <DashboardCardHeaderAction>{headerAction}</DashboardCardHeaderAction>
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
          {bodyVisible ? (
            <CardContent className="flex-1 flex justify-center items-center">
              <BouncePulse size="md" />
            </CardContent>
          ) : null}
        </Card>
      );
    }

    if (!hasContent) {
      return wrapLockedCard(
        <Card
          className={cn(
            'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex flex-col',
            bodyVisible ? 'h-96' : 'h-auto'
          )}
        >
          <DashboardCardHeaderAction>{headerAction}</DashboardCardHeaderAction>
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
          {bodyVisible ? (
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                There are no trades to display for this category yet. Start trading to see your statistics here!
              </div>
            </CardContent>
          ) : null}
        </Card>
      );
    }

    return wrapLockedCard(
      <Card
        className={cn(
          'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex flex-col',
          bodyVisible ? 'h-96' : 'h-auto'
        )}
      >
        <DashboardCardHeaderAction>{headerAction}</DashboardCardHeaderAction>
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
          {bodyVisible ? (
            <CardContent className="flex-1 flex items-end mt-1">
              <div className="w-full h-[250px]">
                <ComposedBarWinRateChart
                  data={withTotals as BarWinRateChartDatum[]}
                  xAxisDataKey="category"
                  xAxisTickFormatter={(_: string, i: number) => {
                    const d = withTotals[i];
                    if (!d) return '';
                    const [start, end] = String(d.category).split(' – ');
                    const totalTrades = d.totalTrades ?? 0;
                    return end
                      ? `${start}-${end} (${totalTrades})`
                      : `${String(d.category)} (${totalTrades})`;
                  }}
                  tooltipHeaderGetter={(d) => String(d.category ?? '')}
                  isDark={isDark}
                  beCalcEnabled={beCalcEnabled}
                  idPrefix="timeInterval"
                  barCategoryGap="20%"
                  xAxisInterval={0}
                  lineActiveDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                />
              </div>
            </CardContent>
          ) : null}
        </div>
      </Card>
    );
  }
);
