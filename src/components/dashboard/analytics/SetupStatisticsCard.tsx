'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { Trade } from '@/types/trade';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateSetupStats as calculateSetupStatsUtil } from '@/utils/calculateCategoryStats';
import type { SetupStats } from '@/types/dashboard';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useBECalc } from '@/contexts/BECalcContext';
import { ComposedBarWinRateChart, type BarWinRateChartDatum } from './ComposedBarWinRateChart';
import { cn } from '@/lib/utils';
import { DashboardCardHeaderAction } from './DashboardCardHeaderAction';

export interface SetupStatisticsCardProps {
  setupStats: SetupStats[];
  isLoading?: boolean;
  includeTotalTrades?: boolean;
  headerAction?: ReactNode;
  bodyVisible?: boolean;
}

export function calculateSetupStats(trades: Trade[]): SetupStats[] {
  return calculateSetupStatsUtil(trades);
}

export function convertSetupStatsToChartData(
  setupStats: SetupStats[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  return setupStats.map((stat) => {
    const totalTrades = includeTotalTrades
      ? (stat.total ?? stat.wins + stat.losses + (stat.breakEven ?? 0))
      : stat.wins + stat.losses + (stat.breakEven ?? 0);
    const nonBE = stat.wins + stat.losses;
    const winRate = nonBE > 0 ? (stat.wins / nonBE) * 100 : 0;
    const winRateWithBE = totalTrades > 0 ? (stat.wins / totalTrades) * 100 : 0;
    return {
      category: `${stat.setup}`,
      wins: stat.wins,
      losses: stat.losses,
      breakEven: stat.breakEven ?? 0,
      winRate,
      winRateWithBE: stat.winRateWithBE ?? winRateWithBE,
      totalTrades,
    };
  });
}

export function convertFilteredSetupStatsToChartData(setupStats: SetupStats[]): TradeStatDatum[] {
  return convertSetupStatsToChartData(setupStats, true);
}

export const SetupStatisticsCard: React.FC<SetupStatisticsCardProps> = React.memo(
  function SetupStatisticsCard({
    setupStats,
    isLoading,
    includeTotalTrades = false,
    headerAction,
    bodyVisible = true,
  }) {
    const { mounted, isDark } = useDarkMode();
    const { beCalcEnabled } = useBECalc();

    const chartDataRaw = convertSetupStatsToChartData(setupStats, includeTotalTrades);
    const withTotals: TradeStatDatum[] = chartDataRaw.map((d) => {
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
        // Ensure winRate is always a number so the Line chart doesn't misdraw
        winRate: typeof d.winRate === 'number' && !Number.isNaN(d.winRate) ? d.winRate : 0,
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
        <Card
          className={cn(
            'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex flex-col',
            bodyVisible ? 'h-96 max-sm:h-auto' : 'h-auto'
          )}
        >
          <DashboardCardHeaderAction>{headerAction}</DashboardCardHeaderAction>
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Pattern / Setup Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades by trade pattern / setup
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
      return (
        <Card
          className={cn(
            'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex flex-col',
            bodyVisible ? 'h-96 max-sm:h-auto' : 'h-auto'
          )}
        >
          <DashboardCardHeaderAction>{headerAction}</DashboardCardHeaderAction>
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Pattern / Setup Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades by trade pattern / setup
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

    return (
      <Card
        className={cn(
          'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex flex-col',
          bodyVisible ? 'h-96 max-sm:h-auto' : 'h-auto'
        )}
      >
        <DashboardCardHeaderAction>{headerAction}</DashboardCardHeaderAction>
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Pattern / Setup Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of trades by trade pattern / setup
          </CardDescription>
        </CardHeader>
        {bodyVisible ? (
          <CardContent className="flex-1 flex items-end mt-1">
            <div className="w-full h-[250px] max-sm:h-auto">
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
                idPrefix="setupStats"
                lineActiveDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
              />
            </div>
          </CardContent>
        ) : null}
      </Card>
    );
  }
);
