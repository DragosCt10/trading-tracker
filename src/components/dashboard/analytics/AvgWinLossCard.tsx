'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { calculateAvgWinLoss } from '@/utils/analyticsCalculations';
import { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';

interface AvgWinLossCardProps {
  trades: Trade[];
  currencySymbol?: string;
  isLoading?: boolean;
}

function formatCurrency(value: number, symbol = '$'): string {
  if (!isFinite(value)) return '–';
  return `${symbol}${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CustomBarTooltip = ({ active, payload, currencySymbol }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const isWin = item.payload.key === 'win';
  return (
    <div className="rounded-xl px-3 py-2 text-sm bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-700/50 shadow-md backdrop-blur-sm">
      <span className={cn('font-semibold', isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
        {item.payload.name}
      </span>
      <span className="ml-2 text-slate-700 dark:text-slate-300 font-bold">
        {formatCurrency(item.value, currencySymbol)}
      </span>
    </div>
  );
};

export function AvgWinLossCard({ trades, currencySymbol = '$', isLoading }: AvgWinLossCardProps) {
  const { mounted, isDark } = useDarkMode();
  const [activeBar, setActiveBar] = useState<string | null>(null);

  const { avgWin, avgLoss, winLossRatio } = calculateAvgWinLoss(trades);
  const hasData = trades.some(t => t.trade_outcome === 'Win' || t.trade_outcome === 'Lose');

  const chartData = [
    { key: 'win',  name: 'Avg Win',  value: avgWin,  fill: isDark ? '#34d399' : '#10b981' },
    { key: 'loss', name: 'Avg Loss', value: avgLoss, fill: isDark ? '#fb7185' : '#f43f5e' },
  ];

  const ratioLabel = !isFinite(winLossRatio)
    ? '∞'
    : winLossRatio === 0
    ? '–'
    : winLossRatio.toFixed(2) + 'x';

  const ratioColor =
    winLossRatio >= 2     ? 'text-blue-600 dark:text-blue-400'
    : winLossRatio >= 1.5 ? 'text-emerald-600 dark:text-emerald-400'
    : winLossRatio >= 1   ? 'text-yellow-600 dark:text-yellow-400'
    : winLossRatio > 0    ? 'text-amber-600 dark:text-amber-400'
    : 'text-slate-500 dark:text-slate-400';

  const tooltipContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Avg Win / Loss Breakdown
      </div>
      <div className="space-y-2">
        <div className="rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30">
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">📈 Avg Win</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Mean realized profit across all winning trades.</div>
        </div>
        <div className="rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30">
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">📉 Avg Loss</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Mean realized loss across all losing trades (absolute value).</div>
        </div>
        <div className="rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30">
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">⚖️ W/L Ratio</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Avg Win ÷ Avg Loss. A ratio above 1 means your wins are larger than your losses.
            Combined with win rate, this determines your overall edge.
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Avg Win / Avg Loss
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">Win size vs loss size</CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <div className="w-full h-full" aria-hidden>—</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Avg Win / Avg Loss
          </CardTitle>
          <TooltipProvider>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  tabIndex={0}
                  className="inline-flex h-4 w-4 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none shrink-0"
                  aria-label="More info"
                >
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                className="w-72 text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100"
                sideOffset={6}
              >
                {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
                <div className="relative">{tooltipContent}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Win size vs loss size
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        {!hasData || isLoading ? (
          <div className="flex flex-col justify-center items-center w-full min-h-[160px]">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {isLoading ? 'Loading…' : 'No trades found'}
            </div>
          </div>
        ) : (
          <>
            {/* W/L Ratio headline */}
            <div className="flex items-baseline gap-2 mb-4">
              <span className={cn('text-3xl font-bold tabular-nums', ratioColor)}>{ratioLabel}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">W/L Ratio</span>
            </div>

            {/* Bar chart */}
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <defs>
                    <linearGradient id="avgWinGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="avgLossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  />
                  <YAxis hide />
                  <RechartsTooltip
                    content={<CustomBarTooltip currencySymbol={currencySymbol} />}
                    cursor={{ fill: isDark ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,0.4)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={`url(#${entry.key === 'win' ? 'avgWinGrad' : 'avgLossGrad'})`}
                        opacity={activeBar === null || activeBar === entry.key ? 1 : 0.5}
                        onMouseEnter={() => setActiveBar(entry.key)}
                        onMouseLeave={() => setActiveBar(null)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Win / Loss amount labels */}
            <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {formatCurrency(avgWin, currencySymbol)} avg win
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                {formatCurrency(avgLoss, currencySymbol)} avg loss
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
