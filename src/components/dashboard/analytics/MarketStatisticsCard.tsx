'use client';

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Crown } from 'lucide-react';
import { Trade } from '@/types/trade';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { cn } from '@/lib/utils';
import { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateMarketStats as calculateMarketStatsUtil } from '@/utils/calculateCategoryStats';
import type { MarketStats, BaseStats } from '@/types/dashboard';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useBECalc } from '@/contexts/BECalcContext';
import { ComposedBarWinRateChart, type BarWinRateChartDatum } from './ComposedBarWinRateChart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DashboardCardHeaderAction } from './DashboardCardHeaderAction';

type MarketStatsLike = BaseStats & {
  market?: string;
  total?: number;
};
const LOCKED_CARD_TOOLTIP_TEXT = 'The data shown under the blur card is fictive and for demo purposes only.';
const LOCKED_CARD_TOOLTIP_CLASS =
  'max-w-sm text-xs rounded-2xl p-3 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50';

export interface MarketStatisticsCardProps {
  marketStats: MarketStatsLike[];
  isLoading?: boolean;
  includeTotalTrades?: boolean;
  isPro?: boolean;
  headerAction?: ReactNode;
  bodyVisible?: boolean;
}


export function calculateMarketStats(trades: Trade[], accountBalance: number): MarketStats[] {
  return calculateMarketStatsUtil(trades, accountBalance);
}

export function convertMarketStatsToChartData(
  marketStats: MarketStatsLike[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  return marketStats.map((stat) => {
    const totalTrades = stat.total ?? (stat.wins + stat.losses + (stat.breakEven ?? 0));
    const nonBE = stat.wins + stat.losses;
    // Win Rate = wins/(wins+losses). Win Rate w/BE = wins/(wins+losses+breakEven) (BE is not profit).
    const winRate = nonBE > 0 ? (stat.wins / nonBE) * 100 : 0;
    const winRateWithBE = totalTrades > 0 ? (stat.wins / totalTrades) * 100 : 0;
    return {
      category: `${stat.market}`,
      wins: stat.wins,
      losses: stat.losses,
      breakEven: stat.breakEven ?? 0,
      winRate,
      winRateWithBE,
      totalTrades,
    };
  });
}

export function convertFilteredMarketStatsToChartData(marketStats: MarketStatsLike[]): TradeStatDatum[] {
  return convertMarketStatsToChartData(marketStats, true);
}

export const MarketStatisticsCard: React.FC<MarketStatisticsCardProps> = React.memo(
  function MarketStatisticsCard({
    marketStats: rawMarketStats,
    isLoading,
    includeTotalTrades = false,
    isPro,
    headerAction,
    bodyVisible = true,
  }) {
    const { mounted, isDark } = useDarkMode();
    const { beCalcEnabled } = useBECalc();

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

    const previewMarketStats = useMemo<MarketStatsLike[]>(
      () => [
        {
          market: 'Forex',
          total: 3,
          wins: 2,
          losses: 1,
          breakEven: 0,
          winRate: (2 / 3) * 100,
          winRateWithBE: (2 / 3) * 100,
          profit: 0,
          pnlPercentage: 0,
          profitTaken: false,
        },
        {
          market: 'Indices',
          total: 4,
          wins: 2,
          losses: 1,
          breakEven: 1,
          winRate: (2 / 3) * 100,
          winRateWithBE: (2 / 4) * 100,
          profit: 0,
          pnlPercentage: 0,
          profitTaken: false,
        },
        {
          market: 'Cryptos',
          total: 2,
          wins: 1,
          losses: 1,
          breakEven: 0,
          winRate: (1 / 2) * 100,
          winRateWithBE: (1 / 2) * 100,
          profit: 0,
          pnlPercentage: 0,
          profitTaken: false,
        },
      ],
      []
    );

    const marketStats = isLocked ? previewMarketStats : rawMarketStats;
    const chartDataRaw = convertMarketStatsToChartData(marketStats, includeTotalTrades);
    // Keep wins/losses as in source (same as Market Profit Stats); total = stat.total (actual trade count)
    const withTotals: TradeStatDatum[] = chartDataRaw.map((d) => {
      const totalTrades = d.totalTrades ?? (d.wins ?? 0) + (d.losses ?? 0) + (d.breakEven ?? 0);
      const hasTradesButNoOutcomes = totalTrades > 0 && (d.wins ?? 0) === 0 && (d.losses ?? 0) === 0 && (d.breakEven ?? 0) === 0;
      return {
        ...d,
        totalTrades,
        wins: hasTradesButNoOutcomes ? 0.01 : (d.wins ?? 0),
        losses: d.losses ?? 0,
        breakEven: d.breakEven ?? 0,
      };
    });

    const hasContent = withTotals.some(
      (d) => (d.totalTrades ?? 0) > 0 || (d.wins ?? 0) > 0 || (d.losses ?? 0) > 0 || (d.breakEven ?? 0) > 0
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
              Market Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on market
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
                  Market Stats
                </CardTitle>
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" /> PRO
                </span>
              </div>
            ) : (
              <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
                Market Stats
              </CardTitle>
            )}
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades based on market
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
          className={cn(
            'relative z-0 flex flex-col h-full',
            isLocked && 'blur-[3px] opacity-70 pointer-events-none select-none'
          )}
        >
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Market Stats
              </CardTitle>
            </div>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades based on market
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
                    return d ? `${d.category} (${d.totalTrades ?? 0})` : '';
                  }}
                  tooltipHeaderGetter={(d) => String(d.category ?? '')}
                  isDark={isDark}
                  beCalcEnabled={beCalcEnabled}
                  idPrefix="marketStats"
                  showWinRateLine={false}
                  margins={{ right: 20 }}
                />
              </div>
            </CardContent>
          ) : null}
        </div>
      </Card>
    );
  }
);
