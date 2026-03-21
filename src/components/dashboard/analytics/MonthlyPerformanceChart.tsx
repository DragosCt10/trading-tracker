'use client';

import React from 'react';
import type { ReactNode } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DashboardCardHeaderAction } from './DashboardCardHeaderAction';
import { Trade } from '@/types/trade';
import { MONTHS } from '@/components/dashboard/analytics/AccountOverviewCard';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useBECalc } from '@/contexts/BECalcContext';
import { ComposedBarWinRateChart, type BarWinRateChartDatum } from './ComposedBarWinRateChart';

export interface MonthlyStatsAllTrades {
  [month: string]: {
    wins: number;
    losses: number;
    breakEven: number;
    winRate: number;
    winRateWithBE: number;
  };
}

/**
 * Compute full monthly stats from trades array (wins, losses, breakEven, winRate, etc.)
 * Processes all trades passed (tradesToUse already handles filtering).
 * Model: wins (non-BE), losses (non-BE), breakEven (all break_even trades).
 */

export function computeFullMonthlyStatsFromTrades(
  trades: Trade[]
): MonthlyStatsAllTrades {
  const monthlyData: MonthlyStatsAllTrades = {};

  trades.forEach((trade) => {
    const tradeDate = new Date(trade.trade_date);
    const monthName = MONTHS[tradeDate.getMonth()];

    if (!monthlyData[monthName]) {
      monthlyData[monthName] = { wins: 0, losses: 0, breakEven: 0, winRate: 0, winRateWithBE: 0 };
    }

    if (trade.break_even) {
      monthlyData[monthName].breakEven += 1;
    } else if (trade.trade_outcome === 'Win') {
      monthlyData[monthName].wins += 1;
    } else if (trade.trade_outcome === 'Lose') {
      monthlyData[monthName].losses += 1;
    }
  });

  Object.keys(monthlyData).forEach((month) => {
    const stats = monthlyData[month];
    const nonBETrades = stats.wins + stats.losses;
    const total = nonBETrades + stats.breakEven;

    stats.winRate = nonBETrades > 0 ? (stats.wins / nonBETrades) * 100 : 0;
    // BE is not profit: keep wins numerator, include BE in denominator
    stats.winRateWithBE = total > 0 ? (stats.wins / total) * 100 : 0;
  });

  return monthlyData;
}

interface MonthlyPerformanceChartProps {
  monthlyStatsAllTrades: MonthlyStatsAllTrades;
  months: string[];
  // kept for API compatibility, not used by Recharts
  chartOptions?: any;
  /** PRO: Hide/Expand control rendered inside the card (top-right) */
  headerAction?: ReactNode;
  /** When false, card header stays visible but chart body is hidden */
  bodyVisible?: boolean;
}

export function MonthlyPerformanceChart({
  monthlyStatsAllTrades,
  months,
  headerAction,
  bodyVisible = true,
}: MonthlyPerformanceChartProps) {
  const { mounted, isDark } = useDarkMode();
  const { beCalcEnabled } = useBECalc();

  const chartData = months.map((month) => {
    const stats = monthlyStatsAllTrades[month] || {
      wins: 0,
      losses: 0,
      breakEven: 0,
      winRate: 0,
      winRateWithBE: 0,
    };
    const totalTrades = stats.wins + stats.losses + stats.breakEven;
    return {
      month,
      totalTrades,
      wins: stats.wins,
      losses: stats.losses,
      breakEven: stats.breakEven,
      winRate: stats.winRate,
      winRateWithBE: stats.winRateWithBE,
    };
  });

  // Check if there are any trades across all months
  const hasTrades = chartData.some((d) => d.totalTrades > 0);

  const cardHeight = bodyVisible ? 'h-[360px]' : 'h-auto';

  if (!mounted) {
    return (
      <Card
        className={cn(
          'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex flex-col',
          cardHeight
        )}
      >
        <DashboardCardHeaderAction>{headerAction}</DashboardCardHeaderAction>
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Monthly Performance
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400">
            Month-over-month results for your trades
          </CardDescription>
        </CardHeader>
        {bodyVisible ? (
          <CardContent className="flex-1 flex justify-center items-center">
            <div className="w-full h-full min-h-[180px]" aria-hidden>—</div>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  if (!hasTrades) {
    return (
      <Card
        className={cn(
          'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex flex-col',
          cardHeight
        )}
      >
        <DashboardCardHeaderAction>{headerAction}</DashboardCardHeaderAction>
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Monthly Performance
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400">
            Monthly performance of trades
          </CardDescription>
        </CardHeader>
        {bodyVisible ? (
          <CardContent className="flex-1 flex justify-center items-center">
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                There are no trades to display for this category yet. Start trading to see your statistics here!
              </div>
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
        cardHeight
      )}
    >
      <DashboardCardHeaderAction>{headerAction}</DashboardCardHeaderAction>
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
          Monthly Performance
        </CardTitle>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Monthly performance of trades
        </CardDescription>
      </CardHeader>

      {bodyVisible ? (
        <CardContent className="flex-1 flex items-end mt-1">
          <div className="w-full h-[250px]">
            <ComposedBarWinRateChart
              data={chartData as BarWinRateChartDatum[]}
              xAxisDataKey="month"
              xAxisTickFormatter={(_: string, i: number) => {
                const d = chartData[i];
                return d ? `${d.month} (${d.totalTrades})` : '';
              }}
              tooltipHeaderGetter={(d) => String(d.month ?? '')}
              isDark={isDark}
              beCalcEnabled={beCalcEnabled}
              idPrefix="composed"
            />
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
