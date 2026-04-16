'use client';


import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Bar as ReBar,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Info } from 'lucide-react';
import { PnLBadge } from '@/components/shared/PnLBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import React from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  calculateTotalYearProfit,
  calculatePnlPercentFromOverview,
  CURRENCY_SYMBOLS,
  calculateUpdatedBalance,
  computeMonthlyStatsFromTrades,
  getAccountBalanceForOverview,
  getCurrencySymbolFromAccount,
  MONTHS,
} from '@/utils/accountOverviewHelpers';

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

export {
  calculateTotalYearProfit,
  calculatePnlPercentFromOverview,
  CURRENCY_SYMBOLS,
  calculateUpdatedBalance,
  computeMonthlyStatsFromTrades,
  getAccountBalanceForOverview,
  getCurrencySymbolFromAccount,
  MONTHS,
};

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
  /** When true, data is being refetched (e.g. filter change); show pulse instead of empty state */
  isFetching?: boolean;
  /** Number of trades in the period. When set, "No trades found" is shown only when this is 0 (so BE-only trades still show the chart). */
  tradesCount?: number;
  /** Optional fallback label when accountName is null/empty (defaults to "No Active Account"). */
  fallbackAccountName?: string;
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
  isFetching = false,
  tradesCount,
  fallbackAccountName,
}: AccountOverviewCardProps) {
  const { mounted, isDark } = useDarkMode();

  // Detect mobile for Population Pyramid layout
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Dynamic colors based on dark mode
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b';

  const chartData = months.map((month) => ({
    month,
    profit: monthlyStatsAllTrades[month]?.profit ?? 0,
    profitPercent: monthlyStatsAllTrades[month]
      ? Number(
          (
            (monthlyStatsAllTrades[month].profit /
              getAccountBalanceForOverview(accountBalance)) *
            100
          ).toFixed(2)
        )
      : 0,
  }));

  // Population Pyramid (mobile): symmetric domain so zero sits in center
  const maxAbsVal = Math.max(...chartData.map((d) => Math.abs(d.profit)), 1);

  // Axis tick formatter for horizontal pyramid (abbreviated)
  const fmtPyramidTick = (v: number) => {
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1000) return `${currencySymbol}${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
    return `${currencySymbol}${abs}`;
  };

  const hasNonZeroProfit = chartData.some((item) => item.profit !== 0);
  const hasAnyTrades = tradesCount !== undefined ? tradesCount > 0 : hasNonZeroProfit;
  const showEmptyState = !isYearDataLoading && !isFetching && (!hasAnyTrades || !hasNonZeroProfit);
  const emptyStateNoTrades = !hasAnyTrades;

  const effectiveFallbackName = fallbackAccountName ?? 'No Active Account';
  const displayName = mounted ? (accountName || effectiveFallbackName) : '\u00A0';

  const displayBalanceStr = mounted
    ? `${currencySymbol}${updatedBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '\u00A0';

  // Shared tooltip renderer used by both chart modes
  const tooltipContent = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const pnl = data.profit as number;
    const percent = data.profitPercent as number;
    const isProfit = pnl >= 0;

    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-100">
        {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
        <div className="relative flex flex-col gap-3">
          <div className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {data.month}
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Profit</span>
              <span className={`text-base font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {pnl < 0 ? '-' : ''}{currencySymbol}
                {Math.abs(pnl).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Return</span>
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
      </div>
    );
  };

  return (
    <Card className="relative mb-6 overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      <div className="relative p-4 sm:p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 sm:mb-8">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl shadow-sm themed-header-icon-box">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <CardTitle className="text-base sm:text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {displayName}
              </CardTitle>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-400 ml-[40px] sm:ml-[52px]">Current Balance</p>
          </div>

          <div className="text-right space-y-1 sm:space-y-2">
            <div className="flex items-center justify-end gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
              <span>Balance incl. year profit</span>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none shrink-0"
                      aria-label="Explanation of balance including year profit"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="end"
                    sideOffset={6}
                    className="w-72 text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100"
                  >
                    {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
                    <div className="relative">
                      <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-300">
                        This is not cumulative P&amp;L. It uses a <strong>geometric (theoretical compounded)</strong> model: starting balance plus year profit, not a running equity curve.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
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
                <PnLBadge value={calculatePnlPercentFromOverview(totalYearProfit, accountBalance)} size={isMobile ? 'sm' : 'md'} suffix=" YTD" />
              )}
            </div>
          </div>
        </div>

        {/* Chart — vertical bars on desktop, Population Pyramid on mobile */}
        <CardContent className="h-72 relative p-0">
          <div className="w-full h-full transition-all duration-300 opacity-100">
            {!mounted ? (
              <div className="w-full h-full min-h-[200px] flex items-end justify-center gap-8 px-8" aria-hidden>
                {[50, 70, 60].map((pct, i) => (
                  <div
                    key={i}
                    className="w-16 rounded-t-xl bg-slate-300 dark:bg-slate-700 animate-rise-up"
                    style={{ height: `${pct}%`, animationDelay: `${i * 0.2}s`, transform: 'scaleY(0)' }}
                  />
                ))}
              </div>
            ) : isYearDataLoading || isFetching ? (
              <div className="w-full h-full min-h-[200px] flex items-center justify-center" aria-hidden>
                <BouncePulse size="md" />
              </div>
            ) : showEmptyState ? (
              <div className="flex flex-col justify-center items-center w-full h-full">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100/50 to-slate-50 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700 mb-4">
                  <Wallet className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="text-lg font-semibold text-slate-600 dark:text-slate-300 text-center mb-2">
                  {emptyStateNoTrades ? 'No trades found' : 'No trades with profit found'}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md px-4">
                  {emptyStateNoTrades
                    ? 'There are no trades to display for this account yet. Start trading to see your statistics here!'
                    : 'Your trades have zero P&L for this period (e.g. break-even).'}
                </div>
              </div>
            ) : isMobile ? (
              /* ── Mobile: Population Pyramid (horizontal diverging bars) ── */
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 4, right: 50, left: 0, bottom: 4 }}
                  barCategoryGap="28%"
                >
                  <defs>
                    <linearGradient id="profitGradientH" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="lossGradientH" x1="1" y1="0" x2="0" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={1} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    type="number"
                    domain={[-maxAbsVal, maxAbsVal]}
                    tick={{ fill: axisTextColor, fontSize: 10, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtPyramidTick}
                    tickCount={7}
                  />
                  <YAxis
                    type="category"
                    dataKey="month"
                    tick={{ fill: axisTextColor, fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={72}
                  />

                  {/* Zero center line */}
                  <ReferenceLine
                    x={0}
                    stroke={isDark ? '#475569' : '#cbd5e1'}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />

                  <ReTooltip
                    contentStyle={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none', minWidth: '160px' }}
                    wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                    cursor={{ fill: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.06)', radius: 4 }}
                    content={tooltipContent}
                  />

                  <ReBar dataKey="profit" barSize={13} radius={[8, 8, 8, 8]}>
                    {chartData.map((item) => (
                      <Cell
                        key={item.month}
                        fill={item.profit >= 0 ? 'url(#profitGradientH)' : 'url(#lossGradientH)'}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                    <LabelList
                      dataKey="profitPercent"
                      content={(props: any) => {
                        if (!props || props.value == null || props.value === 0) return null;
                        const value = Number(props.value);
                        const x = Number(props.x || 0);
                        const y = Number(props.y || 0);
                        const width = Number(props.width || 0);
                        const height = Number(props.height || 0);
                        const labelX = value >= 0 ? x + width + 4 : x - 4;
                        const labelY = y + height / 2;

                        return (
                          <text
                            x={labelX}
                            y={labelY}
                            fill={value >= 0 ? (isDark ? '#2dd4bf' : '#0d9488') : (isDark ? '#fb7185' : '#e11d48')}
                            textAnchor={value >= 0 ? 'start' : 'end'}
                            dominantBaseline="middle"
                            fontSize={10}
                            fontWeight={700}
                            fontFamily="system-ui, -apple-system, sans-serif"
                          >
                            {value > 0 ? '+' : ''}{value}%
                          </text>
                        );
                      }}
                    />
                  </ReBar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              /* ── Desktop: original vertical bar chart ── */
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 35, right: 15, left: 10, bottom: 5 }}
                >
                  <defs>
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
                      `${currencySymbol}${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                    }
                  />

                  <ReTooltip
                    contentStyle={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none', minWidth: '160px' }}
                    wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                    cursor={{ fill: 'transparent', radius: 8 }}
                    content={tooltipContent}
                  />

                  <ReBar
                    dataKey="profit"
                    radius={[12, 12, 5, 5]}
                    barSize={38}
                  >
                    {chartData.map((item) => (
                      <Cell
                        key={item.month}
                        fill={item.profit >= 0 ? 'url(#profitGradient)' : 'url(#lossGradient)'}
                        className="transition-all duration-300 hover:opacity-95"
                        style={{ cursor: 'pointer' }}
                      />
                    ))}

                    <LabelList
                      dataKey="profitPercent"
                      content={(props: any) => {
                        if (!props || props.value == null || props.value === 0) return null;
                        const value = Number(props.value);
                        const x = Number(props.x || 0);
                        const y = Number(props.y || 0);
                        const width = Number(props.width);
                        const height = Number(props.height || 0);
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
                            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                          >
                            {value > 0 ? '+' : ''}{value}%
                          </text>
                        );
                      }}
                    />
                  </ReBar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
