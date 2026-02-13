'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip as ReTooltip, Bar as ReBar, Cell, LabelList } from 'recharts';
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface MonthlyStats {
  [month: string]: {
    profit: number;
  };
}

interface AccountOverviewCardProps {
  accountName: string | null;
  currencySymbol: string;
  updatedBalance: number;
  totalYearProfit: number;
  accountBalance: number;
  months: string[];
  monthlyStatsAllTrades: MonthlyStats;
  isLoading?: boolean;
}

export function AccountOverviewCard({
  accountName,
  currencySymbol,
  updatedBalance,
  totalYearProfit,
  accountBalance,
  months,
  monthlyStatsAllTrades,
  isLoading = false,
}: AccountOverviewCardProps) {
  // Check if we have meaningful data
  const hasData = accountName !== null && updatedBalance !== 0;
  
  // Only show skeleton if data is NOT immediately available on mount
  const [showSkeleton, setShowSkeleton] = useState(!hasData);
  const [isReadyToShowContent, setIsReadyToShowContent] = useState(hasData);
  const [hasShownSkeleton, setHasShownSkeleton] = useState(!hasData);

  // Control skeleton visibility based on loading state and data availability
  useEffect(() => {
    // If data is immediately available (from cache), show content right away
    if (hasData && !hasShownSkeleton) {
      setShowSkeleton(false);
      setIsReadyToShowContent(true);
      return;
    }

    // If skeleton was shown (hard refresh case), ensure minimum display time
    if (!isLoading && hasData && hasShownSkeleton) {
      const timer = setTimeout(() => {
        setShowSkeleton(false);
        // Add buffer before showing content for smooth transition
        setTimeout(() => {
          setIsReadyToShowContent(true);
        }, 200);
      }, 800);
      return () => clearTimeout(timer);
    }
    
    // Keep showing skeleton if we don't have data yet
    if (!hasData) {
      setShowSkeleton(true);
      setIsReadyToShowContent(false);
      setHasShownSkeleton(true);
    }
  }, [isLoading, hasData, hasShownSkeleton]);

  // Prepare chart data
  const chartData = months.map((month) => ({
    month,
    profit: monthlyStatsAllTrades[month]?.profit ?? 0,
    profitPercent: monthlyStatsAllTrades[month]
      ? Number(
          (
            (monthlyStatsAllTrades[month].profit /
              (accountBalance || 1)) *
            100
          ).toFixed(2)
        )
      : 0,
  }));

  // Check if there are any trades in this year (any month has profit !== 0)
  const hasTrades = chartData.some(item => item.profit !== 0);

  // Predefined heights for skeleton bars (avoids hydration mismatch)
  const barHeights = [45, 65, 50, 70, 55, 60, 48, 72, 58, 63, 52, 68];

  // Show skeleton while loading or until ready to show content
  if (showSkeleton || !isReadyToShowContent) {
    return (
      <Card className="group relative mb-8 overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        {/* Ambient glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 dark:from-purple-500/10 dark:to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative p-8">
          {/* Header Skeleton */}
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-8 w-56" />
              </div>
              <Skeleton className="h-4 w-36 ml-[52px]" />
            </div>

            <div className="text-right space-y-3">
              <Skeleton className="h-3 w-44 ml-auto" />
              <Skeleton className="h-9 w-40 ml-auto bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 rounded-lg" />
              <Skeleton className="h-6 w-28 ml-auto rounded-full" />
            </div>
          </div>

          {/* Chart Skeleton */}
          <CardContent className="h-72 relative p-0">
            <div className="w-full h-full flex items-end justify-between gap-3 px-2">
              {barHeights.map((height, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-3"
                >
                  <Skeleton 
                    className="w-full bg-gradient-to-t from-purple-200/80 via-purple-100/60 to-purple-50/40 dark:from-purple-900/50 dark:via-purple-800/30 dark:to-purple-700/10 rounded-t-xl"
                    style={{ 
                      height: `${height}%`,
                      animationDelay: `${i * 0.08}s`,
                      animationDuration: '1.8s'
                    }}
                  />
                  <Skeleton className="h-3 w-9 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group relative mb-8 overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:border-slate-600/50">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 dark:from-purple-500/10 dark:to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-700/50 shadow-sm">
                <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {accountName || 'No Active Account'}
              </CardTitle>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-[52px]">Current Balance</p>
          </div>

          <div className="text-right space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Balance incl. year profit
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {currencySymbol}
              {updatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              {totalYearProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-500" />
              )}
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                  totalYearProfit >= 0 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {totalYearProfit >= 0 ? '+' : ''}
                {((totalYearProfit / (accountBalance || 1)) * 100).toFixed(2)}% YTD
              </div>
            </div>
          </div>
        </div>

        {/* Chart or No Trades Message */}
        <CardContent className="h-72 relative p-0">
          {!hasTrades ? (
            <div className="flex flex-col justify-center items-center w-full h-full transition-all duration-300 opacity-100">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100/50 to-slate-50 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700 mb-4">
                <Wallet className="w-12 h-12 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-lg font-semibold text-slate-600 dark:text-slate-300 text-center mb-2">
                No trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md px-4">
                There are no trades to display for this account yet. Start trading to see your statistics here!
              </div>
            </div>
          ) : (
            <div className="w-full h-full transition-all duration-300 opacity-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 35, right: 15, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="rgb(5, 150, 105)" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(244, 63, 94)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="rgb(225, 29, 72)" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      `${currencySymbol}${v.toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })}`
                    }
                  />
                  
                  {/* Sleek custom tooltip */}
                  <ReTooltip
                    contentStyle={{ 
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(148, 163, 184, 0.2)', 
                      borderRadius: '16px', 
                      padding: '14px 18px', 
                      color: '#1e293b', 
                      fontSize: 14,
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                      minWidth: '160px'
                    }}
                    wrapperStyle={{ 
                      outline: 'none',
                      zIndex: 1000
                    }}
                    cursor={{ 
                      fill: 'rgba(148, 163, 184, 0.08)', 
                      radius: 8 
                    }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      
                      const data = payload[0].payload;
                      const profit = data.profit;
                      const percent = data.profitPercent;
                      const isProfit = profit >= 0;

                      return (
                        <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                            {data.month}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Profit:</span>
                              <span className={`text-lg font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {currencySymbol}
                                {profit.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Return:</span>
                              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${
                                isProfit 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                              }`}>
                                {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {percent}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <ReBar 
                    dataKey="profit" 
                    radius={[8, 8, 0, 0]} 
                    barSize={36}
                    className="drop-shadow-sm"
                  >
                    {months.map((month) => {
                      const profit = monthlyStatsAllTrades[month]?.profit ?? 0;
                      return (
                        <Cell
                          key={month}
                          fill={profit >= 0 ? 'url(#profitGradient)' : 'url(#lossGradient)'}
                          className="transition-all duration-200 hover:opacity-90"
                        />
                      );
                    })}

                    <LabelList
                      dataKey="profitPercent"
                      content={(props: any) => {
                        if (!props || props.value == null || props.value === 0) return null;

                        const value = Number(props.value);
                        const x = Number(props.x || 0);
                        const y = Number(props.y || 0);
                        const width = Number(props.width);
                        const height = Number(props.height);
                        // Positive values above bar, negative values at the top of bar
                        const yPos = value >= 0 ? y - 8 : y - 8;

                        return (
                          <text
                            x={x + width / 2}
                            y={yPos}
                            fill={value >= 0 ? '#059669' : '#e11d48'}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-xs font-bold"
                            style={{ 
                              textShadow: '0 1px 3px rgba(255, 255, 255, 0.9)',
                              fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}
                          >
                            {value > 0 ? '+' : ''}{value}%
                          </text>
                        );
                      }}
                    />
                  </ReBar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
