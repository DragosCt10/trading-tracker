'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export type GaugeVariant = 'winRate' | 'avgDrawdown';

export interface SummaryHalfGaugeProps {
  variant: GaugeVariant;
  /** 0–100 normalized value */
  valueNormalized: number;
  /** Center text inside the gauge (e.g. "60.0%") */
  centerLabel: string;
  /** Left scale label (e.g. "0" or "0%") */
  minLabel: string;
  /** Right scale label (e.g. "100" or "20%") */
  maxLabel: string;
  /** Raw value used for tooltip interpretation (e.g. 3.5 for 3.5% drawdown) */
  rawValueForTooltip?: number;
}

export function SummaryHalfGauge({
  variant,
  valueNormalized,
  centerLabel,
  minLabel,
  maxLabel,
  rawValueForTooltip,
}: SummaryHalfGaugeProps) {
  let gradientId: string;
  let gradientDefs: React.ReactNode;

  if (variant === 'winRate') {
    gradientId = 'winRateGaugeGradient';
    gradientDefs = (
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.9} />
      </linearGradient>
    );
  } else {
    const avgValue = rawValueForTooltip ?? (Math.max(0, Math.min(valueNormalized, 100)) / 100) * 20;

    if (avgValue <= 2) gradientId = 'avgDrawdownBlue';
    else if (avgValue <= 5) gradientId = 'avgDrawdownEmerald';
    else if (avgValue <= 10) gradientId = 'avgDrawdownAmber';
    else if (avgValue <= 15) gradientId = 'avgDrawdownOrange';
    else gradientId = 'avgDrawdownRed';

    gradientDefs = (
      <>
        <linearGradient id="avgDrawdownBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id="avgDrawdownEmerald" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
          <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
          <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id="avgDrawdownAmber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
          <stop offset="100%" stopColor="#d97706" stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id="avgDrawdownOrange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
          <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id="avgDrawdownRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
          <stop offset="100%" stopColor="#dc2626" stopOpacity={0.9} />
        </linearGradient>
      </>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>{gradientDefs}</defs>
          <Pie
            data={[
              { name: 'Value', value: Math.max(0, Math.min(valueNormalized, 100)) },
              { name: 'Remaining', value: Math.max(0, 100 - valueNormalized) },
            ]}
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius={48}
            outerRadius={60}
            paddingAngle={2}
            cornerRadius={7}
            dataKey="value"
          >
            <Cell fill={`url(#${gradientId})`} stroke="none" />
            <Cell
              fill="rgba(148, 163, 184, 0.35)"
              stroke="none"
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 top-10 flex items-center justify-center pointer-events-none">
        <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
          {centerLabel}
        </span>
      </div>
      <div className="absolute left-4 bottom-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {minLabel}
      </div>
      <div className="absolute right-4 bottom-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {maxLabel}
      </div>
    </>
  );
}
