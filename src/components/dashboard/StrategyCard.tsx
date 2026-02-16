'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip } from 'recharts';
import { Trash2} from 'lucide-react';
import { Strategy } from '@/types/strategy';
import { Trade } from '@/types/trade';
import { calculateWinRates } from '@/utils/calculateWinRates';
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

interface StrategyCardProps {
  strategy: Strategy;
  trades: Trade[];
  aggregatedStats?: {
    totalTrades: number;
    winRate: number;
    avgRR: number;
  };
  currencySymbol: string;
  onEdit: (strategy: Strategy) => void;
  onDelete: (strategyId: string) => Promise<void>;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  trades,
  aggregatedStats,
  currencySymbol,
  onEdit,
  onDelete,
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
        totalTrades: 0,
        totalProfit: 0,
        chartData: [],
      };
    }

    const winRates = calculateWinRates(trades);
    
    // Calculate average RR (risk reward ratio)
    const validRRs = trades
      .filter(t => t.risk_reward_ratio != null && t.risk_reward_ratio > 0)
      .map(t => t.risk_reward_ratio!);
    const avgRR = validRRs.length > 0
      ? validRRs.reduce((sum, rr) => sum + rr, 0) / validRRs.length
      : 0;

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
    router.push(`/analytics/${strategy.slug}`);
  };

  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br bg-slate-50/70 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <div className="relative p-6 h-[320px]" aria-hidden />
      </Card>
    );
  }

  const hasTrades = stats.totalTrades > 0;
  const isDefault = strategy.slug === 'trading-institutional';

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br bg-slate-50/70 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
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
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/30 rounded-lg">
              <p className="text-xs text-slate-400 dark:text-slate-500">No trades yet</p>
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
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500 dark:text-slate-400">RR</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {stats.avgRR.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Total Trades */}
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total trades: <span className="font-semibold text-slate-900 dark:text-slate-100">{stats.totalTrades}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(strategy)}
            className="text-xs h-8 px-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalytics}
            className="text-xs h-8 px-3 flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Analytics
          </Button>
          {!isDefault && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  className="text-xs h-8 w-8 p-0 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Strategy</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{strategy.name}"? This action cannot be undone.
                    All trades associated with this strategy will have their strategy_id set to null.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </Card>
  );
};
