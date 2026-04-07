'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface PnLBadgeProps {
  value: number;
  size?: 'xs' | 'sm' | 'md';
  suffix?: string;
}

const sizeConfig = {
  xs: { icon: 'w-3.5 h-3.5', badge: 'px-1.5 py-0.5 text-[11px]' },
  sm: { icon: 'w-4 h-4', badge: 'px-2 py-0.5 text-xs' },
  md: { icon: 'w-4 h-4', badge: 'px-3 py-1 text-sm' },
} as const;

export function PnLBadge({ value, size = 'sm', suffix }: PnLBadgeProps) {
  const positive = value >= 0;
  const { icon, badge } = sizeConfig[size];

  return (
    <div className="inline-flex items-center gap-1.5">
      {positive ? (
        <TrendingUp className={`${icon} text-emerald-500`} />
      ) : (
        <TrendingDown className={`${icon} text-rose-500`} />
      )}
      <span
        className={`inline-flex items-center ${badge} rounded-full font-bold ${
          positive
            ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
        }`}
      >
        {positive ? '+' : ''}{value.toFixed(2)}%{suffix}
      </span>
    </div>
  );
}
