/**
 * Cache router — orchestrates R2-first → Dukascopy fallback → lazy upsert.
 *
 * The route handler asks for `(symbol, timeframe, fromIso, toIso)`. We:
 *   1. If `timeframe` is native: read from R2.
 *      If complete → return.
 *      If incomplete → fetch missing range from Dukascopy, upsert any
 *        whole-month/year chunks we now have full coverage for, return
 *        the merged result.
 *   2. If `timeframe` is resampled (m2/m3/m4/w1): read the *parent*
 *      timeframe via the same path, then bucket the result.
 *
 * Today's still-forming bar is a deliberate edge case — we never persist a
 * chunk that includes today, because today's data isn't final. The route
 * handler's `unstable_cache` revalidation handles short-term caching of
 * "live-ish" requests.
 */

// Server-only orchestrator — see notes in the modules it imports.
import { fetchDukascopyOhlc } from './dukascopyProvider';
import { readNativeRangeFromR2, R2ReadError } from './r2Reader';
import { writeNativeBarsToR2 } from './r2Writer';
import { isR2Configured } from './r2Client';
import { resampleByMinutes, resampleToWeekly } from './resampler';
import {
  isNativeTimeframe,
  RESAMPLE_PARENT,
  type NativeTimeframe,
  type OhlcBar,
  type Timeframe,
} from './types';

const MS_PER_DAY = 86_400_000;

/**
 * Today (UTC) at 00:00:00. Used to decide whether a chunk we just fetched
 * from Dukascopy is "final enough" to persist to R2 — only past months/years
 * get cached.
 */
function utcStartOfTodayMs(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Extracts whole-chunk bar groups from a Dukascopy result that are eligible
 * for upsert into R2:
 *   - month-chunked TFs: keep groups for any month strictly before today's month
 *   - year-chunked TFs:  keep groups for any year strictly before today's year
 *
 * Today's chunk (and anything inside it) is intentionally not persisted.
 */
function chunksEligibleForUpsert(
  timeframe: NativeTimeframe,
  bars: OhlcBar[],
): OhlcBar[] {
  if (bars.length === 0) return [];
  const todayMs = utcStartOfTodayMs();
  const today = new Date(todayMs);
  const monthChunked = ['m1', 'm5', 'm15', 'm30', 'h1', 'h4'].includes(timeframe);
  const cutoffMs = monthChunked
    ? Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
    : Date.UTC(today.getUTCFullYear(), 0, 1);
  const cutoffSec = Math.floor(cutoffMs / 1000);
  return bars.filter((b) => b.time < cutoffSec);
}

async function readNativeWithFallback(
  symbol: string,
  timeframe: NativeTimeframe,
  fromMs: number,
  toMs: number,
): Promise<OhlcBar[]> {
  const fromIso = new Date(fromMs).toISOString();
  const toIso = new Date(toMs).toISOString();

  // Skip R2 entirely if not configured (dev convenience — feature still works
  // via Dukascopy on-demand, just slower).
  if (!isR2Configured()) {
    return fetchDukascopyOhlc({ symbol, timeframe, fromIso, toIso });
  }

  let cached: { bars: OhlcBar[]; complete: boolean };
  try {
    cached = await readNativeRangeFromR2(symbol, timeframe, fromMs, toMs);
  } catch (err) {
    if (err instanceof R2ReadError) {
      // R2 read errors are non-fatal — log and fall through.
      console.warn('[cacheRouter] R2 read failed, falling through:', err.message);
      cached = { bars: [], complete: false };
    } else {
      throw err;
    }
  }

  if (cached.complete && cached.bars.length > 0) {
    return cached.bars;
  }

  // Incomplete — fetch the full requested range from Dukascopy and use it as
  // the source of truth (simpler than gap-filling individual chunks).
  const fresh = await fetchDukascopyOhlc({ symbol, timeframe, fromIso, toIso });

  // Lazy-upsert eligible chunks for next time. Fire-and-forget — a write
  // failure shouldn't break this read.
  const eligible = chunksEligibleForUpsert(timeframe, fresh);
  if (eligible.length > 0) {
    writeNativeBarsToR2(symbol, timeframe, eligible).catch((err) => {
      console.warn('[cacheRouter] R2 upsert failed (non-fatal):', err);
    });
  }

  return fresh;
}

/**
 * Top-level entry: returns OHLC bars for any (symbol, timeframe, range).
 * For non-native timeframes the parent native is read and bucketed on the way out.
 */
export async function fetchOhlcWithCache(
  symbol: string,
  timeframe: Timeframe,
  fromMs: number,
  toMs: number,
): Promise<OhlcBar[]> {
  if (isNativeTimeframe(timeframe)) {
    return readNativeWithFallback(symbol, timeframe, fromMs, toMs);
  }
  // Resample from parent.
  const { parent } = RESAMPLE_PARENT[timeframe];

  // For m2/m3/m4 we expand the read window backward to the previous parent
  // boundary so the first bucket isn't truncated. Cheap; aligns to UTC midnight.
  const expandedFromMs = Math.floor(fromMs / MS_PER_DAY) * MS_PER_DAY;
  const parentBars = await readNativeWithFallback(symbol, parent, expandedFromMs, toMs);

  if (timeframe === 'w1') {
    return resampleToWeekly(parentBars);
  }
  const minutes = timeframe === 'm2' ? 2 : timeframe === 'm3' ? 3 : 4;
  // Filter resampled output back to the user-requested window.
  const fromSec = Math.floor(fromMs / 1000);
  return resampleByMinutes(parentBars, minutes).filter((b) => b.time >= fromSec);
}
