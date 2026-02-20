'use client';

import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Trade } from '@/types/trade';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface MonthPerformanceCardProps {
  title: string;           // "Best Month" / "Worst Month"
  month: string;           // e.g. "January"
  year: number;
  winRate: number;         // 0–100
  profit: number;          // numeric P&L
  currencySymbol: string;  // e.g. "$"
  /** P&L as percentage of account balance (e.g. 5.25 for +5.25%) */
  profitPercent?: number;
  positive?: boolean;      // true for best, false for worst
  className?: string;
}

export const MonthPerformanceCard: React.FC<MonthPerformanceCardProps> = ({
  title,
  month,
  year,
  winRate,
  profit,
  currencySymbol,
  profitPercent,
  positive = true,
  className,
}) => {
  const TrendIcon = positive ? TrendingUp : TrendingDown;
  // Avoid hydration mismatch: server and parent may pass different data on first paint
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex-1 flex flex-col',
        className
      )}
    >
      <div className="relative p-6 flex flex-col flex-1">
        {/* One row: left = title/month, right = Win rate + P&L aligned on same line */}
        <div className="flex flex-row items-start justify-between gap-4 w-full">
          {/* Left: title, then month + year under */}
          <div className="flex flex-col gap-1 min-w-0">
            <CardTitle className="text-sm font-semibold tracking-wide text-slate-400 dark:text-slate-400">
              {title}
            </CardTitle>
            <p className="text-xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              {month} {year}
            </p>
          </div>

          {/* Right: Win rate and P&L — same baseline, both right-aligned with consistent width */}
          <div className="flex flex-row gap-8 items-start shrink-0">
            {/* Win rate */}
            <div className="flex flex-col gap-1.5 items-end text-right min-w-[7rem]">
              <div className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500 w-full">
                Win rate
              </div>
              <div
                className={cn(
                  'inline-flex items-center justify-end gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold',
                  positive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                )}
              >
                <TrendIcon className="w-4 h-4 shrink-0" />
                {mounted ? `${winRate.toFixed(1)}%` : '—%'}
              </div>
            </div>

            {/* P&L */}
            <div className="flex flex-col gap-1.5 items-end text-right min-w-[7rem]">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 w-full">
                P&L
              </div>
              <div
                className={cn(
                  'text-xl font-bold tracking-tight leading-tight',
                  positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {mounted ? (
                  <>
                    {positive && profit >= 0 ? '+' : ''}
                    {currencySymbol}
                    {profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </>
                ) : (
                  `${currencySymbol}—`
                )}
              </div>
              {profitPercent != null && (
                <div
                  className={cn(
                    'text-xs font-semibold',
                    positive ? 'text-emerald-600/90 dark:text-emerald-400/90' : 'text-rose-600/90 dark:text-rose-400/90'
                  )}
                >
                  {mounted ? `${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%` : '—%'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface MonthPerformanceCardsProps {
  trades: Trade[];
  selectedYear: number;
  currencySymbol: string;
  accountBalance?: number | null;
  className?: string;
  /** When true, data is still loading; show loading animation instead of cards */
  isLoading?: boolean;
}

/**
 * Skeleton loader component for MonthPerformanceCard
 */
const MonthPerformanceCardSkeleton: React.FC<{ positive?: boolean }> = ({ positive = true }) => {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex-1 flex flex-col',
        'w-full'
      )}
    >
      <div className="relative p-6 flex flex-col flex-1">
        <div className="flex flex-row items-start justify-between gap-4 w-full">
          {/* Left: title, then month + year under */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="h-4 w-24 bg-slate-300 dark:bg-slate-600 rounded animate-pulse" />
            <div className="h-6 w-32 bg-slate-300 dark:bg-slate-600 rounded animate-pulse mt-1" />
          </div>

          {/* Right: Win rate and P&L */}
          <div className="flex flex-row gap-8 items-start shrink-0">
            {/* Win rate */}
            <div className="flex flex-col gap-1.5 items-end text-right min-w-[7rem]">
              <div className="h-3 w-16 bg-slate-300 dark:bg-slate-600 rounded animate-pulse" />
              <div className={cn(
                'h-8 w-20 rounded-full animate-pulse',
                positive ? 'bg-emerald-200 dark:bg-emerald-900/30' : 'bg-rose-200 dark:bg-rose-900/30'
              )} />
            </div>

            {/* P&L */}
            <div className="flex flex-col gap-1.5 items-end text-right min-w-[7rem]">
              <div className="h-3 w-8 bg-slate-300 dark:bg-slate-600 rounded animate-pulse" />
              <div className={cn(
                'h-6 w-24 rounded animate-pulse',
                positive ? 'bg-emerald-200 dark:bg-emerald-900/30' : 'bg-rose-200 dark:bg-rose-900/30'
              )} />
              <div className={cn(
                'h-3 w-16 rounded animate-pulse mt-1',
                positive ? 'bg-emerald-200 dark:bg-emerald-900/30' : 'bg-rose-200 dark:bg-rose-900/30'
              )} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * Wrapper component that computes and displays best and worst month performance cards.
 * This component handles all the logic for computing monthly stats and determining best/worst months.
 */
export const MonthPerformanceCards: React.FC<MonthPerformanceCardsProps> = ({
  trades,
  selectedYear,
  currencySymbol,
  accountBalance,
  className,
  isLoading = false,
}) => {
  // Compute monthly stats from trades array (for profit only)
  const computeMonthlyStatsFromTrades = useMemo(() => {
    return (trades: Trade[]): { [key: string]: { profit: number } } => {
      const monthlyData: { [key: string]: { profit: number } } = {};
      
      trades.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        const monthName = MONTHS[tradeDate.getMonth()];
        const profit = trade.calculated_profit || 0;
        
        if (!monthlyData[monthName]) {
          monthlyData[monthName] = { profit: 0 };
        }
        
        monthlyData[monthName].profit += profit;
      });
      
      return monthlyData;
    };
  }, []);

  // Compute full monthly stats from trades array (for wins, losses, winRate, etc.)
  const computeFullMonthlyStatsFromTrades = useMemo(() => {
    return (trades: Trade[]): { [key: string]: { wins: number; losses: number; beWins: number; beLosses: number; winRate: number; winRateWithBE: number } } => {
      const monthlyData: { [key: string]: { wins: number; losses: number; beWins: number; beLosses: number; winRate: number; winRateWithBE: number } } = {};
      
      trades.forEach((trade) => {
        const tradeDate = new Date(trade.trade_date);
        const monthName = MONTHS[tradeDate.getMonth()];
        
        if (!monthlyData[monthName]) {
          monthlyData[monthName] = { wins: 0, losses: 0, beWins: 0, beLosses: 0, winRate: 0, winRateWithBE: 0 };
        }
        
        const isBreakEven = trade.break_even;
        const outcome = trade.trade_outcome;
        
        if (isBreakEven) {
          if (outcome === 'Win') {
            monthlyData[monthName].beWins += 1;
          } else if (outcome === 'Lose') {
            monthlyData[monthName].beLosses += 1;
          }
        } else {
          if (outcome === 'Win') {
            monthlyData[monthName].wins += 1;
          } else if (outcome === 'Lose') {
            monthlyData[monthName].losses += 1;
          }
        }
      });
      
      // Calculate win rates for each month
      Object.keys(monthlyData).forEach((month) => {
        const stats = monthlyData[month];
        const nonBETrades = stats.wins + stats.losses;
        const allTrades = nonBETrades + stats.beWins + stats.beLosses;
        
        stats.winRate = nonBETrades > 0 ? (stats.wins / nonBETrades) * 100 : 0;
        stats.winRateWithBE = allTrades > 0 ? ((stats.wins + stats.beWins) / allTrades) * 100 : 0;
      });
      
      return monthlyData;
    };
  }, []);

  const monthlyStatsToUse = useMemo(() => {
    return computeMonthlyStatsFromTrades(trades);
  }, [trades, computeMonthlyStatsFromTrades]);

  const monthlyPerformanceStatsToUse = useMemo(() => {
    return computeFullMonthlyStatsFromTrades(trades);
  }, [trades, computeFullMonthlyStatsFromTrades]);

  type MonthWithStats = { month: string; stats: { winRate: number; profit: number } } | null;

  // Compute best and worst month from monthlyPerformanceStatsToUse
  const { bestMonth, worstMonth } = useMemo((): { bestMonth: MonthWithStats; worstMonth: MonthWithStats } => {
    const monthlyData = monthlyPerformanceStatsToUse;
    let bestMonth: MonthWithStats = null;
    let worstMonth: MonthWithStats = null;
    let bestProfit = -Infinity;
    let worstProfit = Infinity;

    Object.entries(monthlyData).forEach(([month, stats]) => {
      // Use monthlyStatsToUse for profit (computed from current filtered trades)
      const monthProfit = monthlyStatsToUse[month]?.profit || 0;
      
      if (monthProfit > bestProfit) {
        bestProfit = monthProfit;
        bestMonth = {
          month,
          stats: {
            winRate: stats.winRate,
            profit: monthProfit,
          },
        };
      }
      if (monthProfit < worstProfit) {
        worstProfit = monthProfit;
        worstMonth = {
          month,
          stats: {
            winRate: stats.winRate,
            profit: monthProfit,
          },
        };
      }
    });

    return { bestMonth, worstMonth };
  }, [monthlyPerformanceStatsToUse, monthlyStatsToUse]);

  const year = trades.length > 0 ? selectedYear : new Date().getFullYear();
  const accountBalanceValue = accountBalance ?? 1;

  // Show loading skeletons when loading
  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-stretch', className)}>
        <MonthPerformanceCardSkeleton positive />
        <MonthPerformanceCardSkeleton positive={false} />
      </div>
    );
  }

  // Show cards only when we have data
  if (!bestMonth && !worstMonth) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-stretch', className)}>
      {bestMonth && (
        <MonthPerformanceCard
          title="Best Month"
          month={bestMonth.month}
          year={year}
          winRate={bestMonth.stats.winRate}
          profit={bestMonth.stats.profit}
          currencySymbol={currencySymbol}
          profitPercent={
            accountBalanceValue > 0
              ? (bestMonth.stats.profit / accountBalanceValue) * 100
              : undefined
          }
          positive
          className="w-full"
        />
      )}

      {worstMonth && (
        <MonthPerformanceCard
          title="Worst Month"
          month={worstMonth.month}
          year={year}
          winRate={worstMonth.stats.winRate}
          profit={worstMonth.stats.profit}
          currencySymbol={currencySymbol}
          profitPercent={
            accountBalanceValue > 0
              ? (worstMonth.stats.profit / accountBalanceValue) * 100
              : undefined
          }
          positive={false}
          className="w-full"
        />
      )}
    </div>
  );
};
