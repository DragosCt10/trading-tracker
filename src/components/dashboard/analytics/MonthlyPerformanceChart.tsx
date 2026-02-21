'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar as ReBar,
  Line,
  Area,
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
 * Processes all trades passed (tradesToUse already handles filtering)
 * @param trades - Array of trades to compute stats from
 * @returns Object with monthly statistics keyed by month name
 */
export function computeFullMonthlyStatsFromTrades(
  trades: Trade[]
): MonthlyStatsAllTrades {
  const monthlyData: MonthlyStatsAllTrades = {};
  
  // Process all trades passed (tradesToUse already handles filtering)
  trades.forEach((trade) => {
    
    const outcome = trade.trade_outcome;
    
    const tradeDate = new Date(trade.trade_date);
    const monthName = MONTHS[tradeDate.getMonth()];
    
    if (!monthlyData[monthName]) {
      monthlyData[monthName] = { wins: 0, losses: 0, beWins: 0, beLosses: 0, winRate: 0, winRateWithBE: 0 };
    }
    
    const isBreakEven = trade.break_even;
    
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

  const axisTextColor = isDark ? '#cbd5e1' : '#64748b';

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

  const maxTotal = Math.max(
    ...chartData.map((d) => d.wins + d.losses),
    ...chartData.map((d) => d.totalTrades),
    1
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

  // Y axis tick formatter for wins/losses (integer counts)
  const yAxisTickFormatter = (value: number) =>
    Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

  // Custom Y-axis labels: vertically centered, no overlap with tick numbers
  const leftAxisLabel = (props: { viewBox?: { x?: number; y?: number; width?: number; height?: number } }) => {
    const vb = props.viewBox ?? {};
    const x = (vb.x ?? 0) + 12;
    const y = (vb.y ?? 0) + (vb.height ?? 0) / 2;
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fill={axisTextColor}
        fontSize={12}
        fontWeight={500}
        transform={`rotate(-90, ${x}, ${y})`}
      >
        Wins / Losses
      </text>
    );
  };
  const rightAxisLabel = (props: { viewBox?: { x?: number; y?: number; width?: number; height?: number } }) => {
    const vb = props.viewBox ?? {};
    const x = (vb.x ?? 0) + (vb.width ?? 0);
    const y = (vb.y ?? 0) + (vb.height ?? 0) / 2;
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fill={axisTextColor}
        fontSize={12}
        fontWeight={500}
        transform={`rotate(90, ${x}, ${y})`}
      >
        Win Rate
      </text>
    );
  };

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
        <div className="w-full h-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 52, left: 52, bottom: 48 }}
            >
              <defs>
                <linearGradient id="composedTotalArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.02} />
                </linearGradient>
                {/* Wins gradient – same as SetupStatisticsCard / TradesStatsBarCard */}
                <linearGradient id="composedWinsBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                </linearGradient>
                {/* Losses gradient – same as SetupStatisticsCard / TradesStatsBarCard */}
                <linearGradient id="composedLossesBar" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                  <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="month"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: axisTextColor, fontSize: 11 }}
                tickFormatter={(_: string, i: number) => {
                  const d = chartData[i];
                  return d ? `${d.month} (${d.totalTrades})` : '';
                }}
              />
              <YAxis
                yAxisId="left"
                type="number"
                tick={{ fill: axisTextColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisTickFormatter}
                domain={[0, Math.ceil(maxTotal * 1.15)]}
                width={52}
                label={leftAxisLabel}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                type="number"
                tick={{ fill: axisTextColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                width={52}
                label={rightAxisLabel}
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
                  minWidth: '160px',
                }}
                wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                cursor={{ stroke: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.4)', strokeWidth: 1 }}
                content={<CustomTooltip />}
              />

              {/* Area: total trades (wins + losses) – soft background */}
              <Area
                type="monotone"
                dataKey="totalTrades"
                name="Total"
                yAxisId="left"
                fill="url(#composedTotalArea)"
                stroke="none"
              />
              {/* Bars: wins & losses */}
              <ReBar dataKey="wins" name="Wins" fill="url(#composedWinsBar)" radius={[4, 4, 0, 0]} barSize={20} yAxisId="left" />
              <ReBar dataKey="losses" name="Losses" fill="url(#composedLossesBar)" radius={[4, 4, 0, 0]} barSize={20} yAxisId="left" />
              {/* Line: win rate % */}
              <Line
                type="monotone"
                dataKey="winRate"
                name="Win Rate"
                yAxisId="right"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
