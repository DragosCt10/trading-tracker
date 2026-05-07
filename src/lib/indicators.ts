/**
 * Pure technical-indicator computations from OHLCV bars. Provider-agnostic
 * (works on any `OhlcBar[]` regardless of where the bars came from). Each
 * function returns `LinePoint[]` aligned to bar timestamps so the result
 * can be fed straight into a lightweight-charts `LineSeries`.
 *
 * Convention: bars must be ascending by `time`. Output starts at the first
 * bar where the indicator is defined (e.g. period-1 for SMA), so the
 * upstream chart will show a clean leading gap rather than stretched
 * extrapolation.
 */

import type { OhlcBar } from '@/lib/marketData/types';

export interface LinePoint {
  time: number;
  value: number;
}

/** Simple Moving Average of close prices over the last `period` bars. */
export function computeSMA(bars: OhlcBar[], period: number): LinePoint[] {
  if (period < 1 || bars.length < period) return [];
  const out: LinePoint[] = [];
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= period) sum -= bars[i - period].close;
    if (i >= period - 1) {
      out.push({ time: bars[i].time, value: sum / period });
    }
  }
  return out;
}

/**
 * Exponential Moving Average of close prices.
 * Seed = SMA over the first `period` bars (Wilder/standard convention),
 * then `EMA_t = close_t * k + EMA_{t-1} * (1-k)` with `k = 2 / (period+1)`.
 */
export function computeEMA(bars: OhlcBar[], period: number): LinePoint[] {
  if (period < 1 || bars.length < period) return [];
  const out: LinePoint[] = [];
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += bars[i].close;
  let ema = sum / period;
  out.push({ time: bars[period - 1].time, value: ema });
  for (let i = period; i < bars.length; i++) {
    ema = bars[i].close * k + ema * (1 - k);
    out.push({ time: bars[i].time, value: ema });
  }
  return out;
}

/**
 * Bollinger Bands: middle = SMA(period); upper/lower = middle ± k·σ where
 * σ is the population standard deviation of close over the same window.
 * Returns three aligned series so the caller can render them as separate
 * LineSeries on the price pane.
 */
export function computeBollingerBands(
  bars: OhlcBar[],
  period: number,
  stdDevMultiplier: number,
): { middle: LinePoint[]; upper: LinePoint[]; lower: LinePoint[] } {
  if (period < 1 || bars.length < period) {
    return { middle: [], upper: [], lower: [] };
  }
  const middle = computeSMA(bars, period);
  const upper: LinePoint[] = [];
  const lower: LinePoint[] = [];
  // middle[j] aligns with bars[j + period - 1]
  for (let j = 0; j < middle.length; j++) {
    const i = j + period - 1;
    let sumSq = 0;
    for (let k = i - period + 1; k <= i; k++) {
      const diff = bars[k].close - middle[j].value;
      sumSq += diff * diff;
    }
    const sd = Math.sqrt(sumSq / period);
    upper.push({ time: middle[j].time, value: middle[j].value + stdDevMultiplier * sd });
    lower.push({ time: middle[j].time, value: middle[j].value - stdDevMultiplier * sd });
  }
  return { middle, upper, lower };
}
