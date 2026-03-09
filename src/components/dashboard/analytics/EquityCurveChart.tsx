'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { useDarkMode } from '@/hooks/useDarkMode';
import { format } from 'date-fns';

const EquityTooltipContent: React.FC<{
  date: string | Date;
  value: number;
  currencySymbol: string;
  isDark: boolean;
}> = ({ date, value, currencySymbol, isDark }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-100">
      {isDark && (
        <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />
      )}
      <div className="relative flex flex-col gap-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {format(new Date(date), 'MMM d, yyyy')}
        </p>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {currencySymbol}
          {value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
    </div>
  );
};

export type EquityPoint = {
  date: string | Date;
  profit: number;
};

export interface EquityCurveChartProps {
  data: EquityPoint[];
  currencySymbol: string;
  hasTrades: boolean;
  isLoading?: boolean;
  /**
   * compact  – sparkline style (no axes, used in StrategyCard / DailyJournal)
   * card     – full equity card style (axes, zero line, positive/negative fill)
   */
  variant?: 'compact' | 'card';
  /** When true and variant is card, hides X/Y axis labels and axis lines (e.g. for Daily Journal) */
  hideAxisLabels?: boolean;
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  data,
  currencySymbol,
  hasTrades,
  isLoading = false,
  variant = 'compact',
  hideAxisLabels = false,
}) => {
  const showNoTradesMessage = !isLoading && !hasTrades;
  const { isDark } = useDarkMode();

  // For the card variant we need equityPositive / equityNegative like the original EquityCurveCard.
  const cardData = useMemo(
    () =>
      data.map((point) => {
        const equity = point.profit;
        return {
          date: point.date,
          equity,
          equityPositive: equity >= 0 ? equity : 0,
          equityNegative: equity < 0 ? equity : 0,
        };
      }),
    [data]
  );

  const axisTextColor = isDark ? '#cbd5e1' : '#64748b';
  const zeroLineStroke = isDark ? '#e2e8f0' : '#64748b';

  if (!hasTrades || data.length === 0) {
    if (showNoTradesMessage) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/30 rounded-lg">
          <p className="text-xs text-slate-400 dark:text-slate-500">No trades yet</p>
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[128px]" aria-hidden>
        <BouncePulse size="md" />
      </div>
    );
  }

  // Detailed equity card variant (matches previous EquityCurveCard chart)
  if (variant === 'card') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cardData} margin={hideAxisLabels ? { top: 8, right: 8, left: 8, bottom: 8 } : { top: 24, right: 16, left: 8, bottom: 8 }}>
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
            tick={hideAxisLabels ? false : { fill: axisTextColor, fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => format(new Date(value), 'MMM d')}
            interval="preserveStartEnd"
            minTickGap={32}
            hide={hideAxisLabels}
          />
          <YAxis
            tick={hideAxisLabels ? false : { fill: axisTextColor, fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) =>
              `${currencySymbol}${value >= 0 ? '' : '-'}${Math.abs(value).toLocaleString('en-US', {
                maximumFractionDigits: 0,
              })}`
            }
            hide={hideAxisLabels}
          />
          <ReTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const dataPoint = payload[0].payload as {
                  date: string | Date;
                  equity: number;
                };
                return (
                  <EquityTooltipContent
                    date={dataPoint.date}
                    value={dataPoint.equity}
                    currencySymbol={currencySymbol}
                    isDark={isDark}
                  />
                );
              }
              return null;
            }}
          />
          {!hideAxisLabels && (
            <ReferenceLine y={0} stroke={zeroLineStroke} strokeWidth={1.5} strokeDasharray="2 2" />
          )}
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
    );
  }

  // Compact sparkline variant (used in StrategyCard / DailyJournal)
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tick={false}
            axisLine={false}
            tickLine={false}
            hide
          />
          <YAxis
            tick={false}
            axisLine={false}
            tickLine={false}
            hide
          />
          <ReTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const point = payload[0].payload as EquityPoint;
                return (
                  <EquityTooltipContent
                    date={point.date}
                    value={point.profit}
                    currencySymbol={currencySymbol}
                    isDark={isDark}
                  />
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="var(--tc-primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};


