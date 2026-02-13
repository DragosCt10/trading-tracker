'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip as ReTooltip, Bar as ReBar, Cell, LabelList } from 'recharts';
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
      <Card className="mb-8 p-6 border shadow-none bg-gradient-to-br from-white via-purple-50/20 to-violet-50/10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div className="text-right space-y-2">
            <Skeleton className="h-3 w-40 ml-auto" />
            <Skeleton className="h-8 w-36 ml-auto bg-gradient-to-r from-purple-200 to-violet-200 dark:from-purple-900/30 dark:to-violet-900/30" />
            <Skeleton className="h-5 w-24 ml-auto" />
          </div>
        </div>

        {/* Chart Skeleton */}
        <CardContent className="h-64 mb-2 relative p-0">
          {/* Animated skeleton bars */}
          <div className="w-full h-full flex items-end justify-between gap-4 px-4">
            {barHeights.map((height, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <Skeleton 
                  className="w-full bg-gradient-to-t from-purple-200 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/20"
                  style={{ 
                    height: `${height}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '2s'
                  }}
                />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8 p-6 border shadow-none bg-gradient-to-br from-white via-purple-50/20 to-violet-50/10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 transition-opacity duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-200">
            {accountName || 'No Active Account'}
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">Current Balance</p>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400">Balance incl. year profit</div>
          <div className="text-2xl font-semibold text-slate-800 dark:text-slate-200">
            {currencySymbol}
            {updatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div
            className={`text-sm font-semibold ${
              totalYearProfit >= 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {totalYearProfit >= 0 ? '+' : ''}
            {((totalYearProfit / (accountBalance || 1)) * 100).toFixed(2)}% YTD
          </div>
        </div>
      </div>

      {/* Chart or No Trades Message */}
      <CardContent className="h-64 mb-2 relative p-0">
        {!hasTrades ? (
          <div className="flex flex-col justify-center items-center w-full h-full transition-opacity duration-300 opacity-100">
            <div className="text-base font-medium text-slate-500 dark:text-slate-400 text-center mb-1">
              No trades found
            </div>
            <div className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-xs">
              There are no trades to display for this account yet. Start trading to see your statistics here!
            </div>
          </div>
        ) : (
          <div className="w-full h-full transition-opacity duration-300 opacity-100">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 30, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 13}} // text-slate-500
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }} // text-slate-500
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  `${currencySymbol}${v.toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                  })}`
                }
              />
              {/* Custom tooltip with dark mode support */}
              <ReTooltip
                contentStyle={{ 
                  background: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(203, 213, 225, 0.5)', 
                  borderRadius: 12, 
                  padding: '12px 16px', 
                  color: '#1e293b', 
                  fontSize: 14,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                wrapperStyle={{ outline: 'none' }}
                cursor={false}
                formatter={(value) => {
                  if (typeof value !== 'number') return null;

                  return (
                    <span style={{ 
                      color: '#1e293b', 
                      fontWeight: 600 
                    }}>
                      {currencySymbol}
                      {value.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  );
                }}
                labelStyle={{ color: '#64748b', fontWeight: 500, fontSize: 13 }}
              />

              <ReBar dataKey="profit" radius={[4, 4, 4, 4]} barSize={32}>
                {months.map((month) => (
                  <Cell
                    key={month}
                    fill={
                      (monthlyStatsAllTrades[month]?.profit ?? 0) >= 0
                        ? 'rgba(16,185,129,0.85)' // emerald-500 - more sophisticated green
                        : 'rgba(244,63,94,0.85)' // rose-500 - more sophisticated red
                    }
                  />
                ))}

                <LabelList
                  dataKey="profitPercent"
                  content={(props: any) => {
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
                        fill={value >= 0 ? '#059669' : '#e11d48'} // emerald-600 for positive, rose-600 for negative
                        textAnchor="middle"
                        className="text-xs font-semibold"
                        style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}
                      >
                        {`${value}%`}
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
    </Card>
  );
}
