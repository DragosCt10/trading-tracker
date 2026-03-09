'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { Trade } from '@/types/trade';
import { useDarkMode } from '@/hooks/useDarkMode';
import { format } from 'date-fns';
import { EquityCurveChart, type EquityPoint } from '@/components/dashboard/analytics/EquityCurveChart';

export interface EquityCurveCardProps {
  trades: Trade[];
  currencySymbol: string;
}

/** Normalize to YYYY-MM-DD for grouping by day */
function toDayKey(tradeDate: string): string {
  const d = new Date(tradeDate);
  return format(d, 'yyyy-MM-dd');
}

/** Aggregate P&L by day, then build cumulative equity (one data point per day). */
function buildDailyEquityChartData(trades: Trade[]): EquityPoint[] {
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
      profit: cumulative,
    };
  });
}

/** Build cumulative equity using each trade (used when all trades are on a single day). */
function buildIntradayEquityChartData(trades: Trade[]): EquityPoint[] {
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(a.trade_date).getTime();
    const dateB = new Date(b.trade_date).getTime();
    return dateA - dateB;
  });

  let cumulative = 0;
  return sortedTrades.map((trade) => {
    cumulative += trade.calculated_profit ?? 0;
    return {
      date: trade.trade_date,
      profit: cumulative,
    };
  });
}

export const EquityCurveCard = React.memo(function EquityCurveCard({
  trades,
  currencySymbol,
}: EquityCurveCardProps) {
  const { mounted } = useDarkMode();
  const chartData = useMemo(() => {
    if (trades.length === 0) return [];

    // If all trades occur on the same day, use intraday (per-trade) equity data.
    const uniqueDays = new Set(trades.map((t) => toDayKey(t.trade_date)));
    const isSingleDay = uniqueDays.size === 1;

    return isSingleDay ? buildIntradayEquityChartData(trades) : buildDailyEquityChartData(trades);
  }, [trades]);
  const hasData = chartData.length > 0;

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
          <div className="w-full h-[320px]">
            <EquityCurveChart
              data={chartData}
              currencySymbol={currencySymbol}
              hasTrades={hasData}
              isLoading={false}
              // Always use the full card variant here so axis labels remain visible,
              // even when all trades occur on a single day.
              variant="card"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});
