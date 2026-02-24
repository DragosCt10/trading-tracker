'use client';


import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip as ReTooltip, Bar as ReBar, Cell, LabelList } from 'recharts';
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { Trade } from '@/types/trade';
import { useDarkMode } from '@/hooks/useDarkMode';

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  HKD: 'HK$',
  NZD: 'NZ$',
} as const;

export const MONTHS = [
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

export function getCurrencySymbolFromAccount(
  account?: { currency?: string | null }
): string {
  if (!account?.currency) return '$';
  return (
    CURRENCY_SYMBOLS[account.currency as keyof typeof CURRENCY_SYMBOLS] ??
    account.currency
  );
}

// Compute monthly stats from trades array (for AccountOverviewCard - profit only)
export function computeMonthlyStatsFromTrades(trades: Trade[]): { [key: string]: { profit: number } } {
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
}

// Calculate total year profit from monthly stats
export function calculateTotalYearProfit(monthlyStats: { [month: string]: { profit: number } }): number {
  return Object.values(monthlyStats).reduce(
    (sum, s) => sum + (s.profit || 0),
    0
  );
}

// Calculate updated balance (account balance + total year profit)
export function calculateUpdatedBalance(
  accountBalance: number | null | undefined,
  totalYearProfit: number
): number {
  return (accountBalance ?? 0) + totalYearProfit;
}

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
  /** When true, year data (allTrades) is still loading; avoid showing "No trades found" until false */
  isYearDataLoading?: boolean;
}

export function AccountOverviewCard({
  accountName,
  currencySymbol,
  updatedBalance,
  totalYearProfit,
  accountBalance,
  months,
  monthlyStatsAllTrades,
  isYearDataLoading = false,
}: AccountOverviewCardProps) {
  const { mounted, isDark } = useDarkMode();

  // Dynamic colors based on dark mode
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b'; // slate-300 in dark, slate-500 in light

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

  const hasTrades = chartData.some(item => item.profit !== 0);
  const showNoTradesMessage = !isYearDataLoading && !hasTrades;

  const displayName = mounted ? (accountName || 'No Active Account') : '\u00A0';
  const displayBalanceStr = mounted
    ? `${currencySymbol}${updatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '\u00A0';

  return (
    <Card className="relative mb-8 overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      <div className="relative p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl shadow-sm themed-header-icon-box">
                <Wallet className="w-5 h-5" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {displayName}
              </CardTitle>
            </div>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-400 ml-[52px]">Current Balance</p>
          </div>

          <div className="text-right space-y-2">
            <div className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
              Balance incl. year profit
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {displayBalanceStr}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              {!mounted ? (
                <>
                  <span className="w-4 h-4" aria-hidden />
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    —% YTD
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Chart or No Trades Message - defer branch until mounted so server and client first paint match (same wrapper) */}
        <CardContent className="h-72 relative p-0">
          <div className="w-full h-full transition-all duration-300 opacity-100">
          {!mounted ? (
            <div className="w-full h-full min-h-[200px] flex items-end justify-center gap-8 px-8" aria-hidden>
              {[50, 70, 60].map((pct, i) => (
                <div
                  key={i}
                  className="w-16 rounded-t-xl bg-slate-300 dark:bg-slate-700 animate-rise-up"
                  style={{
                    height: `${pct}%`,
                    animationDelay: `${i * 0.2}s`,
                    transform: 'scaleY(0)',
                  }}
                />
              ))}
            </div>
          ) : isYearDataLoading ? (
            <div className="w-full h-full min-h-[200px] flex items-center justify-center" aria-hidden>
              <BouncePulse size="md" />
            </div>
          ) : showNoTradesMessage ? (
            <div className="flex flex-col justify-center items-center w-full h-full">
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
            <>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 35, right: 15, left: 10, bottom: 5 }}
                >
                  <defs>
                    {/* Modern profit gradient - emerald to teal */}
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                    </linearGradient>
                    {/* Modern loss gradient - rose to red */}
                    <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                      <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  
                  <XAxis
                    dataKey="month"
                    tick={{ fill: axisTextColor, fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: axisTextColor, fontSize: 11, fontWeight: 500 }}
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
                              <span className={`text-lg font-bold ${isProfit ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
                                  ? 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400' 
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
                    radius={[10, 10, 0, 0]} 
                    barSize={38}
                  >
                    {months.map((month) => {
                      const profit = monthlyStatsAllTrades[month]?.profit ?? 0;
                      return (
                        <Cell
                          key={month}
                          fill={profit >= 0 ? 'url(#profitGradient)' : 'url(#lossGradient)'}
                          className="transition-all duration-300 hover:opacity-95"
                          style={{ cursor: 'pointer' }}
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
                        const height = Number(props.height || 0);
                        // Positive values: above bar top, Negative values: above baseline (y + height is baseline for negative bars)
                        const yPos = value >= 0 ? y - 8 : y + height - 8;

                        return (
                          <text
                            x={x + width / 2}
                            y={yPos}
                            fill={value >= 0 
                              ? (isDark ? '#2dd4bf' : '#0d9488') 
                              : (isDark ? '#fb7185' : '#e11d48')}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-xs font-bold"
                            style={{ 
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
            </>
          )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
