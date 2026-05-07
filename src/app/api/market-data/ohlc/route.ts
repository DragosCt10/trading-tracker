/**
 * GET /api/market-data/ohlc
 *
 * Returns historical OHLC bars for a whitelisted backtest symbol. Reads
 * Cloudflare R2 first; falls through to Dukascopy on cache miss and lazily
 * upserts whole-month/year chunks back into R2 for next time.
 *
 * No upstream auth — Dukascopy's historical feed is public and commercial
 * redistribution is permitted with attribution (the chart UI shows "Data
 * provided by Dukascopy Bank SA"; email of record from Dukascopy on file).
 *
 * Query params:
 *   symbol     — app symbol from `DUKASCOPY_SYMBOL_TO_INSTRUMENT`
 *   timeframe  — one of TIMEFRAMES (m1, m2, m3, m4, m5, m15, m30, h1, h4, d1, w1, mn1)
 *   from       — ISO 8601 start (inclusive)
 *   to         — ISO 8601 end
 *
 * Responses are cached at the edge via `unstable_cache` so concurrent users
 * collapse onto one R2/Dukascopy round trip per (symbol, tf, from, to) per
 * cache window. Closed-day responses cache for 24 h, today-inclusive for 60 s.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCachedUserSession } from '@/lib/server/session';
import { fetchOhlcWithCache } from '@/lib/marketData/cacheRouter';
import { DukascopyUpstreamError } from '@/lib/marketData/dukascopyProvider';
import { isBacktestableSymbol } from '@/lib/marketData/dukascopySymbols';
import {
  isTimeframe,
  maxDaysForTimeframe,
  type OhlcBar,
} from '@/lib/marketData/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// No `unstable_cache` here on purpose — Next caps cached entries at 2 MB and
// m1 over a multi-month range easily exceeds that. R2 is our cache: hits
// return in ~150 ms, which is fast enough that an additional in-memory cache
// adds no value. For network-level compression we rely on Next's automatic
// gzip on JSON responses.

export async function GET(req: NextRequest) {
  const { user } = await getCachedUserSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const timeframe = searchParams.get('timeframe');
  const fromIso = searchParams.get('from');
  const toIso = searchParams.get('to');

  if (!symbol || !timeframe || !fromIso || !toIso) {
    return NextResponse.json(
      { error: 'Missing required params: symbol, timeframe, from, to' },
      { status: 400 },
    );
  }
  if (!isBacktestableSymbol(symbol)) {
    return NextResponse.json(
      { error: `Symbol "${symbol}" is not available for backtesting` },
      { status: 400 },
    );
  }
  if (!isTimeframe(timeframe)) {
    return NextResponse.json(
      { error: `Unsupported timeframe "${timeframe}"` },
      { status: 400 },
    );
  }

  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    return NextResponse.json({ error: 'Invalid from/to ISO timestamps' }, { status: 400 });
  }
  if (toMs <= fromMs) {
    return NextResponse.json({ error: '`to` must be after `from`' }, { status: 400 });
  }

  const rangeDays = (toMs - fromMs) / MS_PER_DAY;
  const maxDays = maxDaysForTimeframe(timeframe);
  if (rangeDays > maxDays) {
    return NextResponse.json(
      {
        error: `Range too large for ${timeframe}: max ${maxDays} days per request. Pick a smaller window or a higher timeframe.`,
      },
      { status: 400 },
    );
  }

  try {
    const bars: OhlcBar[] = await fetchOhlcWithCache(symbol, timeframe, fromMs, toMs);
    return NextResponse.json({ bars }, { status: 200 });
  } catch (err) {
    if (err instanceof DukascopyUpstreamError) {
      console.error('[market-data/ohlc] Dukascopy upstream error:', err.message);
      return NextResponse.json({ error: 'Failed to load market data' }, { status: 502 });
    }
    console.error('[market-data/ohlc] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
