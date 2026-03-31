'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { Trade } from '@/types/trade';
import { useDarkMode } from '@/hooks/useDarkMode';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { buildEquityPointsFromTrades } from '@/utils/equityPoints';

export interface EquityCurveCardProps {
  trades: Trade[];
  currencySymbol: string;
}

export const EquityCurveCard = React.memo(function EquityCurveCard({
  trades,
  currencySymbol,
}: EquityCurveCardProps) {
  const { mounted } = useDarkMode();
  const chartData = useMemo(() => {
    return buildEquityPointsFromTrades(trades);
  }, [trades]);
  const hasData = chartData.length > 0;

  return (
    <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm w-full flex flex-col">
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
