'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar as ReBar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Trade } from '@/types/trade';
import { MONTHS } from '@/components/dashboard/analytics/AccountOverviewCard';

export interface MonthlyStatsAllTrades {
  [month: string]: {
    wins: number;
    losses: number;
    beWins: number;
    beLosses: number;
    winRate: number;
    winRateWithBE: number;
  };
}

/**
 * Compute full monthly stats from trades array (wins, losses, winRate, etc.)
 * @param trades - Array of trades to compute stats from
 * @returns Object with monthly statistics keyed by month name
 */
export function computeFullMonthlyStatsFromTrades(
  trades: Trade[]
): MonthlyStatsAllTrades {
  const monthlyData: MonthlyStatsAllTrades = {};
  
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
}

interface MonthlyPerformanceChartProps {
  monthlyStatsAllTrades: MonthlyStatsAllTrades;
  months: string[];
  // kept for API compatibility, not used by Recharts
  chartOptions?: any;
}

export function MonthlyPerformanceChart({
  monthlyStatsAllTrades,
  months,
}: MonthlyPerformanceChartProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for dark mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // Dynamic colors based on dark mode
  const slate500 = isDark ? '#94a3b8' : '#64748b'; // slate-400 in dark, slate-500 in light
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b'; // slate-300 in dark, slate-500 in light

  const chartData = months.map((month) => {
    const stats = monthlyStatsAllTrades[month] || {
      wins: 0,
      losses: 0,
      beWins: 0,
      beLosses: 0,
      winRate: 0,
      winRateWithBE: 0,
    };
    const totalTrades = stats.wins + stats.losses + stats.beWins + stats.beLosses;
    return {
      month,
      totalTrades,
      wins: stats.wins,
      losses: stats.losses,
      beWins: stats.beWins,
      beLosses: stats.beLosses,
      winRate: stats.winRate,
      winRateWithBE: stats.winRateWithBE,
    };
  });

  // Check if there are any trades across all months
  const hasTrades = chartData.some((d) => d.totalTrades > 0);

  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Monthly Performance
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400">
            Month-over-month results for your trades
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex justify-center items-center">
          <div className="w-full h-full min-h-[180px]" aria-hidden>—</div>
        </CardContent>
      </Card>
    );
  }

  if (!hasTrades) {
    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Monthly Performance
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400">
            Monthly performance of trades
          </CardDescription>
        </CardHeader>
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
      </Card>
    );
  }

  // Calculate the max of wins or losses (show on Y axis)
  const maxWinsLosses = Math.max(
    ...chartData.map((d) => Math.max(d.wins, d.losses)),
    1 // fallback in case of empty data
  );

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const d = payload[0].payload as (typeof chartData)[number];

    return (
      <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          {d.month} ({d.totalTrades} trades)
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins:</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {d.wins} {d.beWins > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({d.beWins} BE)</span>}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses:</span>
            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
              {d.losses} {d.beLosses > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({d.beLosses} BE)</span>}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate:</span>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              {d.winRate.toFixed(2)}%
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate (w/ BE):</span>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              {d.winRateWithBE.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const index = payload?.index;
    const d = chartData[index];
    if (!d) return null;

    return (
      <text
        x={x}
        y={y}
        dy={16}
        textAnchor="middle"
        fill={axisTextColor}
        fontSize={12}
      >
        {d.month} ({d.totalTrades})
      </text>
    );
  };

  // Explicit Y axis tick formatter for wins/losses (integer counts, no %)
  const yAxisTickFormatter = (value: number) =>
    Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
          Monthly Performance
        </CardTitle>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Monthly performance of trades
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex items-center">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 10, right: 24, left: 16, bottom: 48 }}
              barCategoryGap="30%"
            >
              <defs>
                {/* Modern wins gradient - emerald to teal (same as profit in AccountOverviewCard) */}
                <linearGradient id="winsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                </linearGradient>
                {/* Modern losses gradient - rose to red (same as loss in AccountOverviewCard) */}
                <linearGradient id="lossesGradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                  <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
                </linearGradient>
                {/* Win rate gradient - amber to orange */}
                <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="50%" stopColor="#f97316" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              
              {/* X axis: months and trade counts */}
              <XAxis
                dataKey="month"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={renderXAxisTick as (props: any) => React.ReactElement<SVGElement>}
              />
              {/* Y axis: numeric (wins/losses only, label is win/loss not %/winrate) */}
              <YAxis
                type="number"
                tick={{ fill: axisTextColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisTickFormatter}
                // Explicitly set Y axis domain to wins/losses max instead of win rate 0–100
                domain={[0, Math.ceil(maxWinsLosses * 1.12)]}
                label={{
                  value: 'Wins / Losses',
                  angle: -90,
                  position: 'middle',
                  fill: axisTextColor,
                  fontSize: 13,
                  fontWeight: 500,
                  dy: -10,
                }}
              />

              <ReTooltip
                contentStyle={{ 
                  background: isDark 
                    ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)' 
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
                  backdropFilter: 'blur(16px)',
                  border: isDark 
                    ? '1px solid rgba(51, 65, 85, 0.6)' 
                    : '1px solid rgba(148, 163, 184, 0.2)', 
                  borderRadius: '16px', 
                  padding: '14px 18px', 
                  color: isDark ? '#e2e8f0' : '#1e293b', 
                  fontSize: 14,
                  boxShadow: isDark
                    ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                    : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  minWidth: '160px'
                }}
                wrapperStyle={{ 
                  outline: 'none',
                  zIndex: 1000
                }}
                cursor={{ 
                  fill: 'transparent', 
                  radius: 8,
                }}
                content={<CustomTooltip />}
              />

              {/* Wins */}
              <ReBar
                dataKey="wins"
                name="Wins"
                fill="url(#winsGradient)"
                radius={[4, 4, 0, 0]}
                barSize={18}
              />

              {/* Losses */}
              <ReBar
                dataKey="losses"
                name="Losses"
                fill="url(#lossesGradient)"
                radius={[4, 4, 0, 0]}
                barSize={18}
              />

              {/* Win Rate as bar (0–100) */}
              <ReBar
                dataKey="winRate"
                name="Win Rate"
                fill="url(#winRateGradient)"
                radius={[4, 4, 0, 0]}
                barSize={18}
                yAxisId={1} // Place Win Rate on a secondary axis (not visible)
              />
              {/* Hide secondary Y axis so winRate doesn't affect autoscaling */}
              <YAxis
                yAxisId={1}
                hide={true}
                domain={[0, 100]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
