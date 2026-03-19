'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { formatPercent } from '@/lib/utils';
import type { SessionStats } from '@/types/dashboard';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useBECalc } from '@/contexts/BECalcContext';
import { SESSION_PALETTE, SESSION_FALLBACK_FILLS } from '@/constants/sessionPalette';

export interface SessionStatisticsCardProps {
  sessionStats: SessionStats[];
  isLoading?: boolean;
  /** unused — kept for API compatibility */
  includeTotalTrades?: boolean;
}

function CustomTooltip({
  active,
  payload,
  isDark,
  totalTrades,
  beCalcEnabled,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { name: string; value: number; color: string; wins: number; losses: number; breakEven: number; winRate: number; winRateWithBE: number } }>;
  isDark?: boolean;
  totalTrades: number;
  beCalcEnabled: boolean;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;
  const pct = totalTrades > 0 ? (d.value / totalTrades) * 100 : 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-100">
      {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full shadow-sm ring-2 ring-slate-200/50 dark:ring-slate-500/30" style={{ backgroundColor: d.color }} />
          <div className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {d.name} — {pct.toFixed(1)}% — {d.value} {d.value === 1 ? 'trade' : 'trades'}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{d.wins}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses</span>
            <span className="text-base font-bold text-rose-600 dark:text-rose-400">{d.losses}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Break Even</span>
            <span className="text-base font-bold text-slate-600 dark:text-slate-300">{d.breakEven}</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatPercent(beCalcEnabled ? d.winRateWithBE : d.winRate)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const CARD_CLS = 'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col';

export const SessionStatisticsCard: React.FC<SessionStatisticsCardProps> = React.memo(
  function SessionStatisticsCard({ sessionStats, isLoading }) {
    const { mounted, isDark } = useDarkMode();
    const { beCalcEnabled } = useBECalc();

    const totalTrades = sessionStats.reduce((s, st) => s + (st.total ?? 0), 0);
    const pieData = sessionStats
      .filter(st => (st.total ?? 0) > 0)
      .map((st, i) => ({
        name: st.session,
        value: st.total ?? 0,
        wins: st.wins ?? 0,
        losses: st.losses ?? 0,
        breakEven: st.breakEven ?? 0,
        winRate: st.winRate ?? 0,
        winRateWithBE: st.winRateWithBE ?? 0,
        color: SESSION_PALETTE[st.session]?.fill ?? SESSION_FALLBACK_FILLS[i % SESSION_FALLBACK_FILLS.length],
      }));

    if (!mounted || isLoading) {
      return (
        <Card className={CARD_CLS}>
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Session Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades by session
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (pieData.length === 0) {
      return (
        <Card className={CARD_CLS}>
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Session Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades by session
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
              No trades found
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
              There are no trades to display for this category yet. Start trading to see your statistics here!
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={CARD_CLS}>
        <div className="relative z-0 flex h-full flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Session Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades by session
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-start pt-0 pb-4 overflow-hidden">
            {/* Half-pie chart */}
            <div className="w-full relative" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="85%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    cornerRadius={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}
                    wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                    cursor={false}
                    content={(props) => (
                      <CustomTooltip {...props} isDark={isDark} totalTrades={totalTrades} beCalcEnabled={beCalcEnabled} />
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Total label at the flat edge */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">
                  {totalTrades}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Total Trades
                </span>
              </div>
            </div>

            {/* Per-session win rates — 2 per row */}
            <div className="w-full px-4 pt-4 mt-2 flex flex-col gap-3">
              {[0, 2].map((rowStart) => {
                const row = pieData.slice(rowStart, rowStart + 2);
                if (row.length === 0) return null;
                return (
                  <div key={rowStart} className="flex items-center justify-center gap-6">
                    {row.map((entry, i) => (
                      <React.Fragment key={entry.name}>
                        {i > 0 && <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {entry.name}
                          </span>
                          <span className="text-lg font-bold" style={{ color: entry.color }}>
                            {entry.wins + entry.losses > 0
                              ? formatPercent((entry.wins / (entry.wins + entry.losses)) * 100)
                              : '0'}%
                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-0.5">wr</span>
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }
);
