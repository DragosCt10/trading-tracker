// src/utils/calculateRollingMetrics.ts
import type { Trade } from '@/types/trade';
import { calculatePeriodMetrics, type PeriodMetrics } from '@/utils/calculatePeriodMetrics';
import { CLIENT_COMPUTE_MAX_TRADES } from '@/utils/computeAllDashboardStats';
import { subDays, addDays, format, differenceInDays } from 'date-fns';

export interface RollingPoint {
  date: string;           // yyyy-MM-dd — the end date of the window
  metrics: PeriodMetrics;
}

export interface RollingMetrics {
  /** One data series per metric name, each array has the same length as points. */
  points: RollingPoint[];
  /** True when data was skipped because allTrades.length > CLIENT_COMPUTE_MAX_TRADES. */
  skippedDueToSize: boolean;
}

const WINDOW_DAYS = 30;   // rolling window size
const STRIDE_DAYS = 7;    // step between points (weekly stride)

/**
 * Compute rolling 30-day window metrics over allTrades (sorted by date).
 *
 * Complexity: O(n * windowCount).
 * For 5,000 trades over 5 years → ~260 windows → ~1.3M ops → < 50ms in modern browsers.
 *
 * Performance guard: if allTrades.length > CLIENT_COMPUTE_MAX_TRADES, returns empty
 * to avoid blocking the main thread for large backtesting strategies.
 */
export function calculateRollingMetrics(
  allTrades: Trade[],
  accountBalance: number,
): RollingMetrics {
  if (allTrades.length > CLIENT_COMPUTE_MAX_TRADES) {
    return { points: [], skippedDueToSize: true };
  }

  if (allTrades.length < 7) {
    return { points: [], skippedDueToSize: false };
  }

  // Sort ascending by trade_date
  const sorted = [...allTrades].sort((a, b) => a.trade_date.localeCompare(b.trade_date));

  const firstDate = new Date(sorted[0].trade_date);
  const lastDate = new Date(sorted[sorted.length - 1].trade_date);

  const totalDays = differenceInDays(lastDate, firstDate);
  if (totalDays < WINDOW_DAYS) {
    return { points: [], skippedDueToSize: false };
  }

  const points: RollingPoint[] = [];

  // Walk from (firstDate + WINDOW_DAYS) to lastDate, stepping by STRIDE_DAYS
  let windowEnd = addDays(firstDate, WINDOW_DAYS);
  while (windowEnd <= lastDate) {
    const windowStart = subDays(windowEnd, WINDOW_DAYS);
    const endStr = format(windowEnd, 'yyyy-MM-dd');
    const startStr = format(windowStart, 'yyyy-MM-dd');

    const windowTrades = sorted.filter(
      (t) => t.trade_date >= startStr && t.trade_date <= endStr,
    );

    const metrics = calculatePeriodMetrics(windowTrades, accountBalance, WINDOW_DAYS);
    points.push({ date: endStr, metrics });

    windowEnd = addDays(windowEnd, STRIDE_DAYS);
  }

  return { points, skippedDueToSize: false };
}
