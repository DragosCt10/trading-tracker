'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Bar as ReBar,
  Area,
  Cell,
  LabelList,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { Trade } from '@/types/trade';
import { calculateMarketStats as calculateMarketStatsUtil } from '@/utils/calculateCategoryStats';
import type { MarketStats } from '@/types/dashboard';

export interface MarketStat {
  market: string;
  profit: number;
  pnlPercentage: number;
  wins: number;
  losses: number;
  nonBeWins: number;
  nonBeLosses: number;
  beWins: number;
  beLosses: number;
  profitTaken: boolean;
}

/**
 * Calculate market statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @param accountBalance - Account balance for P&L percentage calculation
 * @returns Array of market statistics
 */
export function calculateMarketStats(trades: Trade[], accountBalance: number): MarketStats[] {
  return calculateMarketStatsUtil(trades, accountBalance);
}

interface MarketProfitStatisticsCardProps {
  marketStats: MarketStat[];
  chartOptions: any; // kept for API compatibility, not used
  getCurrencySymbol: () => string;
  trades: Trade[];
  isLoading?: boolean;
}

const MarketProfitStatisticsCard: React.FC<MarketProfitStatisticsCardProps> = ({
  marketStats,
  getCurrencySymbol,
  trades,
  isLoading: externalLoading,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const checkDarkMode = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mounted) {
      if (externalLoading !== undefined) {
        if (externalLoading) {
          setIsLoading(true);
        } else {
          const timer = setTimeout(() => setIsLoading(false), 600);
          return () => clearTimeout(timer);
        }
      } else {
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [mounted, externalLoading]);

  // Dynamic colors based on dark mode
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b'; // slate-300 in dark, slate-500 in light

  const chartData = marketStats.map((stat) => ({
    ...stat,
    tradeCount: trades.filter((t) => t.market === stat.market).length,
    profitPercent: stat.pnlPercentage ? Number(stat.pnlPercentage.toFixed(2)) : 0,
  }));

  const maxTradeCount = Math.max(...chartData.map((d) => d.tradeCount), 1);
  const chartDataWithScaled = chartData.map((d) => ({
    ...d,
    tradeCountScaled: maxTradeCount > 0 ? (d.tradeCount / maxTradeCount) * 100 : 0,
  }));

  if (!mounted || isLoading) {
    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Market Profit Statistics
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400">
            Profit and P&amp;L percentage by market
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex justify-center items-center">
          <BouncePulse size="md" />
        </CardContent>
      </Card>
    );
  }

  if (!marketStats || marketStats.length === 0) {
    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Market Profit Statistics
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Profit and P&amp;L percentage by market
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center">
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

  // Use gradient colors like MonthlyPerformanceChart
  const getBarColor = (profit: number) =>
    profit >= 0 ? 'url(#profitGradient)' : 'url(#lossGradient)';

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (active && payload && payload.length > 0) {
      const stat: MarketStat & { tradeCount: number } = payload[0].payload;
      const currencySymbol = getCurrencySymbol();
      return (
        <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            {stat.market} ({stat.tradeCount} trade{stat.tradeCount === 1 ? '' : 's'})
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Profit:</span>
              <span className={`text-lg font-bold ${stat.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {currencySymbol}
                {stat.profit.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">P&amp;L:</span>
              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${
                stat.pnlPercentage >= 0 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                  : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
              }`}>
                {stat.pnlPercentage >= 0 ? '+' : ''}{stat.pnlPercentage.toFixed(2)}%
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Results:</span>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="text-emerald-600 dark:text-emerald-400">{stat.wins}W</span>
                <span className="mx-1.5 text-slate-400 dark:text-slate-600">·</span>
                <span className="text-rose-600 dark:text-rose-400">{stat.losses}L</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // X-Axis: custom tick (market + tradeCount + pnl%)
  const renderXAxisTick = (props: any) => {
    const { x, y, index } = props;
    const stat = chartData[index];
    if (!stat) return null;

    return (
      <g>
        <text
          x={x}
          y={y + 10}
          textAnchor="middle"
          fill={axisTextColor}
          fontSize={12}
          fontWeight={500} // font-medium
        >
          {stat.market} - {stat.tradeCount}
        </text>
        <text
          x={x}
          y={y + 25}
          textAnchor="middle"
          fill={axisTextColor}
          fontSize={12}
          fontWeight={500} // font-medium
        >
          ({stat.profitPercent}%)
        </text>
      </g>
    );
  };

  const yAxisTickFormatter = (value: number) =>
    `${getCurrencySymbol()}${Number(value ?? 0).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })}`;

  const renderBarLabel = (props: any) => {
    if (!props || props.value == null) return null;
    const value = Number(props.value);
    const x = Number(props.x || 0);
    const y = Number(props.y || 0);
    const width = Number(props.width);
    const height = Number(props.height);
    const yPos = value >= 0 ? y - 5 : y + height - 5;

    return (
      <text
        x={x + width / 2}
        y={yPos}
        fill={isDark ? '#e2e8f0' : '#1e293b'}
        textAnchor="middle"
        fontSize={12}
        fontWeight={500}
      >
        {getCurrencySymbol()}
        {value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </text>
    );
  };

  const totalProfit = chartData.reduce((sum, d) => sum + d.profit, 0);
  const bestMarket = chartData.length > 0
    ? chartData.reduce((best, d) => (d.profit > best.profit ? d : best), chartData[0])
    : null;
  const currencySymbol = getCurrencySymbol();

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
          Market Profit Statistics
        </CardTitle>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Profit and P&amp;L percentage by market
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
        <div className="flex-1 w-full flex items-center justify-center min-h-0 relative px-4">
          <div className="w-full h-full relative">
            <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartDataWithScaled}
              margin={{ top: 30, right: 18, left: 5, bottom: 10 }}
            >
              <defs>
                <linearGradient id="marketProfitTotalArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                  <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="market"
                tick={(props: any) => renderXAxisTick(props) ?? <></>}
                axisLine={false}
                tickLine={false}
                interval={0}
                height={38}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: axisTextColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisTickFormatter}
                width={60}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                hide
                domain={[0, 100]}
                width={0}
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
                cursor={{ stroke: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.4)', strokeWidth: 1 }}
                content={<CustomTooltip />}
              />
              <Area
                type="monotone"
                dataKey="tradeCountScaled"
                name="Trades"
                yAxisId="right"
                fill="url(#marketProfitTotalArea)"
                stroke="none"
              />
              <ReBar dataKey="profit" yAxisId="left" radius={[7, 7, 7, 7]} barSize={32}>
                {chartDataWithScaled.map((stat) => (
                  <Cell key={stat.market} fill={getBarColor(stat.profit)} />
                ))}
                <LabelList dataKey="profit" content={renderBarLabel} />
              </ReBar>
            </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Stats summary below chart */}
        <div className="w-full px-4 pt-4 mt-2">
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Total Profit
              </div>
              <div className={`text-lg font-bold ${
                totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {currencySymbol}
                {totalProfit.toFixed(2)}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Best Market
              </div>
              <div className="text-lg font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]" title={bestMarket?.market}>
                {bestMarket?.market ?? '—'}
              </div>
              <div className={`text-xs font-semibold ${
                (bestMarket?.profit ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {bestMarket != null ? `${currencySymbol}${bestMarket.profit.toFixed(2)}` : ''}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Markets
              </div>
              <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                {marketStats.length}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketProfitStatisticsCard;
