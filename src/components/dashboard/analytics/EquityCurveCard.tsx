'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { Trade } from '@/types/trade';
import { useDarkMode } from '@/hooks/useDarkMode';
import { format } from 'date-fns';

export interface EquityCurveCardProps {
  trades: Trade[];
  currencySymbol: string;
}

type EquityDatum = { date: string; equity: number; equityPositive: number; equityNegative: number };

/** Normalize to YYYY-MM-DD for grouping by day */
function toDayKey(tradeDate: string): string {
  const d = new Date(tradeDate);
  return format(d, 'yyyy-MM-dd');
}

/** Aggregate P&L by day, then build cumulative equity (one data point per day). */
function buildEquityChartData(trades: Trade[]): EquityDatum[] {
  const profitByDay = new Map<string, number>();
  for (const t of trades) {
    const day = toDayKey(t.trade_date);
    profitByDay.set(day, (profitByDay.get(day) ?? 0) + (t.calculated_profit ?? 0));
  }
  const sortedDays = Array.from(profitByDay.keys()).sort();
  let cumulative = 0;
  return sortedDays.map((date) => {
    cumulative += profitByDay.get(date) ?? 0;
    return {
      date,
      equity: cumulative,
      equityPositive: cumulative >= 0 ? cumulative : 0,
      equityNegative: cumulative < 0 ? cumulative : 0,
    };
  });
}

export const EquityCurveCard = React.memo(function EquityCurveCard({
  trades,
  currencySymbol,
}: EquityCurveCardProps) {
  const { mounted, isDark } = useDarkMode();
  const chartData = useMemo(() => buildEquityChartData(trades), [trades]);
  const hasData = chartData.length > 0;
  // Same axis label color as AccountOverviewCard (slate-300 dark, slate-500 light)
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b';
  // Zero line: more opaque in dark mode so it stays visible
  const zeroLineStroke = isDark ? '#e2e8f0' : '#64748b';

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm w-full flex flex-col">
      <CardContent className="flex-1 min-h-[320px] px-4 pt-6 pb-4">
        {!mounted ? (
          <div className="w-full h-[320px] flex items-center justify-center">
            <BouncePulse size="md" />
          </div>
        ) : !hasData ? (
          <div className="w-full h-[320px] flex flex-col items-center justify-center rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
            <p className="text-base font-medium text-slate-600 dark:text-slate-300">No data yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Add trades to see your equity curve.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id="equityPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--tc-primary, #8b5cf6)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--tc-primary, #8b5cf6)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="equityNegative" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: axisTextColor, fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis
                tick={{ fill: axisTextColor, fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  `${currencySymbol}${value >= 0 ? '' : '-'}${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                }
              />
              <ReTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as EquityDatum;
                    return (
                      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-50">
                        <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
                        <div className="relative flex flex-col gap-2">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {format(new Date(data.date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {currencySymbol}
                            {data.equity.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke={zeroLineStroke} strokeWidth={1.5} strokeDasharray="2 2" />
              <Area
                type="monotone"
                dataKey="equityPositive"
                baseValue={0}
                fill="url(#equityPositive)"
                stroke="none"
              />
              <Area
                type="monotone"
                dataKey="equityNegative"
                baseValue={0}
                fill="url(#equityNegative)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="var(--tc-primary, #8b5cf6)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});
