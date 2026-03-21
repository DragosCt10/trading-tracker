'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
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
import { Info, Crown } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { calculateAvgWinLoss } from '@/utils/analyticsCalculations';
import { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';
import { buildPreviewTrade } from '@/utils/previewTrades';

interface AvgWinLossCardProps {
  trades: Trade[];
  currencySymbol?: string;
  isLoading?: boolean;
  isPro?: boolean;
}
const LOCKED_CARD_TOOLTIP_TEXT = 'The data shown under the blur card is fictive and for demo purposes only.';
const LOCKED_CARD_TOOLTIP_CLASS =
  'max-w-sm text-xs rounded-2xl p-3 border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50';

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

export function AvgWinLossCard({ trades: rawTrades, currencySymbol = '$', isLoading, isPro }: AvgWinLossCardProps) {
  const { mounted, isDark } = useDarkMode();
  const isLocked = !isPro;

  const previewTrades = useMemo<Trade[]>(
    () => [
      buildPreviewTrade({
        id: 'preview-avg-win',
        trade_outcome: 'Win',
        calculated_profit: 200,
      }),
      buildPreviewTrade({
        id: 'preview-avg-loss',
        trade_outcome: 'Lose',
        calculated_profit: -100,
      }),
    ],
    []
  );

  const trades = isPro ? rawTrades : previewTrades;

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

  const card = (
    <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      {isLocked && (
        <span className="absolute right-3 top-3 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
          <Crown className="w-3 h-3" /> PRO
        </span>
      )}

      {isLocked && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
      )}

      <div
        className={cn(
          'relative z-0',
          isLocked && 'blur-[3px] opacity-70 pointer-events-none select-none'
        )}
      >
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Avg Win / Avg Loss
            </CardTitle>
          </div>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Win size vs loss size
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center w-full min-h-[160px]">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading…</div>
            </div>
          ) : isPro && !hasData ? (
            <div className="flex flex-col justify-center items-center w-full min-h-[160px]">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                There are no trades to display for this category yet. Start trading to see your statistics here!
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={cn('text-2xl font-bold tabular-nums', ratioColor)}>{ratioLabel}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">W/L Ratio</span>
              </div>

              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="avgWinLossGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--tc-primary, #8b5cf6)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="var(--tc-primary, #8b5cf6)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={isDark ? 'rgba(30,41,59,0.7)' : 'rgba(226,232,240,0.7)'}
                      vertical={false}
                      strokeDasharray="3 3"
                    />
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
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--tc-primary, #8b5cf6)"
                      strokeWidth={2.5}
                      fill="url(#avgWinLossGrad)"
                      dot={{ r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {hasData ? formatCurrency(avgWin, currencySymbol) : '–'} avg win
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {hasData ? formatCurrency(avgLoss, currencySymbol) : '–'} avg loss
                </span>
              </div>
            </>
          )}
        </CardContent>
      </div>
    </Card>
  );

  if (!isLocked) {
    return card;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={120}>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={8}
          className={LOCKED_CARD_TOOLTIP_CLASS}
        >
          {LOCKED_CARD_TOOLTIP_TEXT}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
