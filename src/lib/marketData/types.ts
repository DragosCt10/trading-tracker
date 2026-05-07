/**
 * Shared OHLC types for the backtesting chart. Provider-agnostic — the
 * Dukascopy provider in `dukascopyProvider.ts` maps Dukascopy's response into
 * `OhlcBar[]`, and any future provider will map into the same shape so the
 * chart stays unaware of where bars came from.
 */

/** UNIX seconds timestamp (lightweight-charts native format for time-scale items). */
export type UnixTimeSeconds = number;

export interface OhlcBar {
  time: UnixTimeSeconds;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * The 12 timeframes exposed in the picker. 8 are Dukascopy native; the
 * other 4 (m2, m3, m4, w1) are resampled server-side from a native parent.
 * Resampled TFs never have their own files in R2 — we read the parent and
 * bucket on the way out. Convention: midnight-UTC anchor, contiguous N-bar
 * buckets (industry standard, matches FX Replay).
 */
export const TIMEFRAMES = [
  'm1', 'm2', 'm3', 'm4', 'm5',
  'm15', 'm30',
  'h1', 'h4',
  'd1', 'w1', 'mn1',
] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export function isTimeframe(v: unknown): v is Timeframe {
  return typeof v === 'string' && (TIMEFRAMES as readonly string[]).includes(v);
}

/** Native Dukascopy granularities — the only ones we store on R2. */
export const NATIVE_TIMEFRAMES = [
  'm1', 'm5', 'm15', 'm30', 'h1', 'h4', 'd1', 'mn1',
] as const satisfies readonly Timeframe[];
export type NativeTimeframe = (typeof NATIVE_TIMEFRAMES)[number];

export function isNativeTimeframe(tf: Timeframe): tf is NativeTimeframe {
  return (NATIVE_TIMEFRAMES as readonly Timeframe[]).includes(tf);
}

/**
 * For a resampled timeframe, the native parent we read from R2 and the
 * bucket size in number-of-parent-bars per output bar (w1 uses ISO-week
 * bucketing; the 7 here is sizing context, not a strict count).
 */
export const RESAMPLE_PARENT: Record<
  Exclude<Timeframe, NativeTimeframe>,
  { parent: NativeTimeframe; bucketSize: number }
> = {
  m2: { parent: 'm1', bucketSize: 2 },
  m3: { parent: 'm1', bucketSize: 3 },
  m4: { parent: 'm1', bucketSize: 4 },
  w1: { parent: 'd1', bucketSize: 7 },
};

/** Backfill depth — 10 years uniform across all native TFs. */
export const BACKFILL_YEARS_BY_TIMEFRAME: Record<NativeTimeframe, number> = {
  m1: 10, m5: 10, m15: 10, m30: 10,
  h1: 10, h4: 10, d1: 10, mn1: 10,
};

/**
 * Practical cap on how big a single API request can be. Not an upstream
 * limit (R2 has no cap; Dukascopy CDN is generous) — just a UX guard so
 * a runaway query doesn't spawn thousands of file fetches.
 */
const MAX_DAYS_BY_TIMEFRAME: Record<Timeframe, number> = {
  m1: 90, m2: 180, m3: 270, m4: 360, m5: 365,
  m15: 730, m30: 1460,
  h1: 1825, h4: 3650,
  d1: 3650, w1: 3650, mn1: 3650,
};

export function maxDaysForTimeframe(tf: Timeframe): number {
  return MAX_DAYS_BY_TIMEFRAME[tf];
}

/**
 * Bar duration in seconds. Used by the backtest replay to find the
 * "parent bar" boundary for any UNIX-second timestamp (e.g. for h1:
 * `floor(t / 3600) * 3600` is the start of the bar containing `t`).
 * mn1 is approximated as 30 days — month boundaries are not equispaced
 * but this is only used for partial-bar rendering of the in-progress
 * candle, where exact alignment isn't critical.
 */
const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  m1: 60,
  m2: 120,
  m3: 180,
  m4: 240,
  m5: 300,
  m15: 900,
  m30: 1800,
  h1: 3600,
  h4: 14400,
  d1: 86400,
  w1: 604800,
  mn1: 2592000,
};

export function timeframeToSeconds(tf: Timeframe): number {
  return TIMEFRAME_SECONDS[tf];
}
