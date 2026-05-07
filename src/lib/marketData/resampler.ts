/**
 * Server-side OHLC resampler.
 *
 * Dukascopy doesn't natively serve m2/m3/m4 (resampled from m1) or w1
 * (resampled from d1). We bucket parent bars into output bars on the fly:
 *
 *   - m2/m3/m4: contiguous N-bar buckets anchored at midnight UTC.
 *     The bucket index for a bar at unix-second `t` is `floor((t - utcMidnight) / N*60)`.
 *   - w1: ISO-week buckets. Each output bar = Mon–Sun of one ISO week.
 *
 * For each bucket, the output bar is:
 *   open  = first bar's open
 *   high  = max(highs)
 *   low   = min(lows)
 *   close = last bar's close
 *   volume = sum(volumes)
 *   time   = first bar's time (the bucket's anchor in chart units)
 */

import type { OhlcBar } from './types';

/**
 * Bucket m1 bars into N-minute groups, anchored to UTC midnight.
 * Returns one output bar per bucket; partial leading/trailing buckets are
 * still emitted so the chart doesn't have visible gaps at the range edges.
 */
export function resampleByMinutes(bars: OhlcBar[], n: 2 | 3 | 4): OhlcBar[] {
  if (n < 2 || bars.length === 0) return bars;
  const bucketSec = n * 60;
  const out: OhlcBar[] = [];
  let bucketStart: number | null = null;
  let cur: OhlcBar | null = null;

  for (const bar of bars) {
    const bIdx = Math.floor(bar.time / bucketSec);
    const bStart = bIdx * bucketSec;
    if (bucketStart === null || bStart !== bucketStart) {
      if (cur) out.push(cur);
      bucketStart = bStart;
      cur = {
        time: bStart,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume ?? 0,
      };
    } else if (cur) {
      if (bar.high > cur.high) cur.high = bar.high;
      if (bar.low < cur.low) cur.low = bar.low;
      cur.close = bar.close;
      cur.volume = (cur.volume ?? 0) + (bar.volume ?? 0);
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Bucket d1 bars into ISO-week buckets (Monday-anchored, 1970-01-05 was a
 * Monday). Returns one output bar per ISO week, anchored at the Monday's
 * unix second.
 */
export function resampleToWeekly(bars: OhlcBar[]): OhlcBar[] {
  if (bars.length === 0) return bars;
  // 1970-01-05 (Mon) at 00:00 UTC = 4 days × 86400s = 345600s
  const MONDAY_EPOCH = 4 * 86400;
  const WEEK_SEC = 7 * 86400;
  const out: OhlcBar[] = [];
  let bucketStart: number | null = null;
  let cur: OhlcBar | null = null;

  for (const bar of bars) {
    const offset = bar.time - MONDAY_EPOCH;
    const bIdx = Math.floor(offset / WEEK_SEC);
    const bStart = MONDAY_EPOCH + bIdx * WEEK_SEC;
    if (bucketStart === null || bStart !== bucketStart) {
      if (cur) out.push(cur);
      bucketStart = bStart;
      cur = {
        time: bStart,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume ?? 0,
      };
    } else if (cur) {
      if (bar.high > cur.high) cur.high = bar.high;
      if (bar.low < cur.low) cur.low = bar.low;
      cur.close = bar.close;
      cur.volume = (cur.volume ?? 0) + (bar.volume ?? 0);
    }
  }
  if (cur) out.push(cur);
  return out;
}
