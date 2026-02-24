'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip } from 'recharts';
import { Trash2, Pencil, ChartBar } from 'lucide-react';
import { Strategy } from '@/types/strategy';
import { Trade } from '@/types/trade';
import { calculateWinRates } from '@/utils/calculateWinRates';
import { calculateRRStats } from '@/utils/calculateRMultiple';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BouncePulse } from '@/components/ui/bounce-pulse';

interface StrategyCardProps {
  strategy: Strategy;
  trades: Trade[];
  aggregatedStats?: {
    totalTrades: number;
    winRate: number;
    avgRR: number;
    totalRR: number;
  };
  currencySymbol: string;
  onEdit: (strategy: Strategy) => void;
  onDelete: (strategyId: string) => Promise<void>;
  /** When true, data is still loading; avoid showing "No trades yet" until false */
  isLoading?: boolean;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  trades,
  aggregatedStats,
  currencySymbol,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => setMounted(true), []);

  // Calculate stats from trades or use aggregated stats if available
  const stats = useMemo(() => {
    // If aggregated stats are provided (from live_trades), use those for winrate, totalTrades, and avgRR
    // But still use current year trades for chart and profit display
    if (aggregatedStats) {
      // Calculate cumulative P&L for chart from current year trades
      const sortedTrades = [...trades].sort((a, b) => {
        const dateA = new Date(a.trade_date).getTime();
        const dateB = new Date(b.trade_date).getTime();
        return dateA - dateB;
      });

      let cumulativeProfit = 0;
      const chartData = sortedTrades.map((trade) => {
        const profit = trade.calculated_profit ?? 0;
        cumulativeProfit += profit;
        return {
          date: trade.trade_date,
          profit: cumulativeProfit,
        };
      });

      const totalProfit = trades.reduce((sum, t) => sum + (t.calculated_profit ?? 0), 0);

      return {
        winRate: aggregatedStats.winRate,
        avgRR: aggregatedStats.avgRR,
        totalRR: aggregatedStats.totalRR ?? 0,
        totalTrades: aggregatedStats.totalTrades,
        totalProfit,
        chartData,
      };
    }

    // Fallback to calculating from current year trades
    if (!trades.length) {
      return {
        winRate: 0,
        avgRR: 0,
        totalRR: 0,
        totalTrades: 0,
        totalProfit: 0,
        chartData: [],
      };
    }

    const winRates = calculateWinRates(trades);
    
    // RR total = RR Multiple (same as RR Multiple card: break_even => +0, Win => +risk_reward_ratio, Lose => -1)
    const totalRR = calculateRRStats(trades);
    const validRRs = trades
      .filter(t => t.risk_reward_ratio != null && t.risk_reward_ratio > 0)
      .map(t => t.risk_reward_ratio!);
    const avgRR = validRRs.length > 0 ? validRRs.reduce((sum, rr) => sum + rr, 0) / validRRs.length : 0;

    // Calculate cumulative P&L for chart
    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = new Date(a.trade_date).getTime();
      const dateB = new Date(b.trade_date).getTime();
      return dateA - dateB;
    });

    let cumulativeProfit = 0;
    const chartData = sortedTrades.map((trade) => {
      const profit = trade.calculated_profit ?? 0;
      cumulativeProfit += profit;
      return {
        date: trade.trade_date,
        profit: cumulativeProfit,
      };
    });

    const totalProfit = trades.reduce((sum, t) => sum + (t.calculated_profit ?? 0), 0);

    return {
      winRate: winRates.winRate,
      avgRR,
      totalRR,
      totalTrades: trades.length,
      totalProfit,
      chartData,
    };
  }, [trades, aggregatedStats]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(strategy.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnalytics = () => {
    router.push(`/strategy/${strategy.slug}`);
  };

  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm">
        <div className="relative p-6 h-[320px]" aria-hidden />
      </Card>
    );
  }

  const hasTrades = stats.totalTrades > 0;
  const showNoTradesMessage = !isLoading && !hasTrades;
  const isChartReady = !isLoading;

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm">
      <div className="relative p-6 flex flex-col h-full">
        {/* Strategy Name */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          {strategy.name}
        </h3>

        {/* Performance Graph */}
        <div className="h-32 mb-4">
          {hasTrades && stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.chartData}>
                <XAxis
                  dataKey="date"
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                  hide
                />
                <YAxis
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                  hide
                />
                <ReTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(data.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {currencySymbol}
                            {data.profit.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--tc-primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : showNoTradesMessage ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/30 rounded-lg">
              <p className="text-xs text-slate-400 dark:text-slate-500">No trades yet</p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center min-h-[128px]" aria-hidden>
              <BouncePulse size="md" />
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-400">Win rate</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total RR</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {(stats.totalRR ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Avg RR</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {(stats.avgRR ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Total Trades */}
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total trades: <span className="font-semibold text-slate-900 dark:text-slate-100">{stats.totalTrades}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(strategy)}
            disabled={!isChartReady}
            className="cursor-pointer relative w-full sm:w-auto h-8 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 text-xs font-medium transition-colors duration-200 gap-2 disabled:opacity-60 disabled:pointer-events-none"
          >
            <Pencil className="h-4 w-4" />
            <span>Edit</span>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalytics}
              disabled={!isChartReady}
              className="cursor-pointer relative w-full sm:w-auto h-8 overflow-hidden rounded-xl themed-btn-primary text-white font-semibold group border-0 text-xs disabled:opacity-60 disabled:pointer-events-none [&_svg]:text-white"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 group-hover:text-white">
                <ChartBar className="h-4 w-4 group-hover:text-white" />
                <span className="group-hover:text-white">Analytics</span>
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting || !isChartReady}
                    className="relative cursor-pointer p-2 px-4.5 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 disabled:pointer-events-none h-8 w-8"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {isDeleting ? (
                        <svg
                          className="h-4 w-4 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-white via-purple-100/80 to-violet-100/70 dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
                    </AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="text-slate-600 dark:text-slate-400">Are you sure you want to delete "{strategy.name}"? This action cannot be undone. All trades associated with this strategy will keep their strategy reference for historical data integrity.</span>
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex gap-3">
                    <AlertDialogCancel asChild>
                      <Button
                        variant="outline"
                        className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60"
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );
};
