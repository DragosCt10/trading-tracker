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
import { calculateLiquidityStats as calculateLiquidityStatsUtil } from '@/utils/calculateCategoryStats';
import type { LiquidityStats } from '@/types/dashboard';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useBECalc } from '@/contexts/BECalcContext';
import { ComposedBarWinRateChart, type BarWinRateChartDatum } from './ComposedBarWinRateChart';
import { cn } from '@/lib/utils';
import { DashboardCardHeaderAction } from './DashboardCardHeaderAction';

/** Short display labels for liquidity categories on the chart. */
const LIQUIDITY_DISPLAY_LABELS: Record<string, string> = {
  'Local Liquidity': 'Local Liq.',
  'Major Liquidity': 'Major Liq.',
  'Low Liquidity': 'Low Liq.',
  'LOD': 'LOD',
  'HOD': 'HOD',
  'Unknown': 'Unknown',
};

const MAX_LABEL_LENGTH = 10;

/** Case-insensitive lookup so imported values (e.g. "local liquidity") still get the short label. Any other name is displayed as-is, truncated to MAX_LABEL_LENGTH. */
function getLiquidityDisplayLabel(category: string): string {
  if (!category || category.trim() === '') return 'Unknown';
  const trimmed = category.trim();
  const exact = LIQUIDITY_DISPLAY_LABELS[trimmed];
  if (exact !== undefined) return exact.length > MAX_LABEL_LENGTH ? exact.slice(0, MAX_LABEL_LENGTH) : exact;
  const lower = trimmed.toLowerCase();
  const entry = Object.entries(LIQUIDITY_DISPLAY_LABELS).find(([k]) => k.toLowerCase() === lower);
  if (entry) {
    const label = entry[1];
    return label.length > MAX_LABEL_LENGTH ? label.slice(0, MAX_LABEL_LENGTH) : label;
  }
  return trimmed.length > MAX_LABEL_LENGTH ? trimmed.slice(0, MAX_LABEL_LENGTH) : trimmed;
}

export interface LiquidityStatisticsCardProps {
  liquidityStats: LiquidityStats[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
  headerAction?: ReactNode;
  bodyVisible?: boolean;
}


export function calculateLiquidityStats(trades: Trade[]): LiquidityStats[] {
  return calculateLiquidityStatsUtil(trades);
}

export function convertLiquidityStatsToChartData(
  liquidityStats: LiquidityStats[],
  _includeTotalTrades: boolean = false
): TradeStatDatum[] {
  return liquidityStats.map((stat) => {
    // Always use stat.total so X-axis label (N) and scale match other cards (same tradesToUse)
    const totalTrades = stat.total ?? (stat.wins + stat.losses + (stat.breakEven ?? 0));
    return {
      category: `${stat.liquidity}`,
      wins: stat.wins,
      losses: stat.losses,
      breakEven: stat.breakEven ?? 0,
      winRate: stat.winRate ?? 0,
      winRateWithBE: stat.winRateWithBE ?? 0,
      totalTrades,
    };
  });
}

export function convertFilteredLiquidityStatsToChartData(liquidityStats: LiquidityStats[]): TradeStatDatum[] {
  return convertLiquidityStatsToChartData(liquidityStats, true);
}

export const LiquidityStatisticsCard: React.FC<LiquidityStatisticsCardProps> = React.memo(
  function LiquidityStatisticsCard({
    liquidityStats,
    isLoading,
    includeTotalTrades = false,
    headerAction,
    bodyVisible = true,
  }) {
    const { mounted, isDark } = useDarkMode();
    const { beCalcEnabled } = useBECalc();

    const chartDataRaw = convertLiquidityStatsToChartData(liquidityStats, includeTotalTrades);
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
        // Ensure winRate is always a number so the Line chart doesn't misdraw (e.g. connect from wrong point)
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
              Conditions / Liquidity Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades by conditions / liquidity
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
              Conditions / Liquidity Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades by conditions / liquidity
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
            Conditions / Liquidity Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of trades by conditions / liquidity
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
                  return d ? `${getLiquidityDisplayLabel(d.category)} (${d.totalTrades ?? 0})` : '';
                }}
                tooltipHeaderGetter={(d) => getLiquidityDisplayLabel(String(d.category ?? ''))}
                isDark={isDark}
                beCalcEnabled={beCalcEnabled}
                idPrefix="liquidityStats"
                lineActiveDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
              />
            </div>
          </CardContent>
        ) : null}
      </Card>
    );
  }
);
