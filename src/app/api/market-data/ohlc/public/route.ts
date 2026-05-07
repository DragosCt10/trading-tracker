/**
 * GET /api/market-data/ohlc/public
 *
 * Public, no-auth variant of /api/market-data/ohlc. Used by the marketing
 * demo at /backtesting/landing.
 *
 * Two safety differences from the auth-gated sibling:
 *   1. Allowlist guard: only the curated DEMO_SYMBOLS × DEMO_TFS matrix is
 *      accepted. The picker UI is a hint; the gate lives here so people
 *      can't hit it with arbitrary high-bar-count combos like NAS100/m1.
 *   2. 31-day range cap: a single calendar month of bars is plenty for
 *      "look at the candles" and keeps anonymous payloads small.
 *
 * Same upstream — calls fetchOhlcWithCache() so R2 hits are free, Dukascopy
 * fallbacks lazily upsert into R2 for next time. Attribution to Dukascopy
 * is rendered under the chart by DemoChartSection.tsx.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchOhlcWithCache } from '@/lib/marketData/cacheRouter';
import { DukascopyUpstreamError } from '@/lib/marketData/dukascopyProvider';
import type { OhlcBar } from '@/lib/marketData/types';
import {
  DEMO_SYMBOLS,
  DEMO_TFS,
  type DemoSymbol,
  type DemoTimeframe,
} from '@/app/backtesting/landing/demoCatalog';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 31;

function isDemoSymbol(s: string): s is DemoSymbol {
  return (DEMO_SYMBOLS as readonly string[]).includes(s);
}

function isDemoTimeframe(tf: string): tf is DemoTimeframe {
  return (DEMO_TFS as readonly string[]).includes(tf);
}

export async function GET(req: NextRequest) {
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
  if (!isDemoSymbol(symbol)) {
    return NextResponse.json(
      { error: `Symbol "${symbol}" is not available on the public demo` },
      { status: 400 },
    );
  }
  if (!isDemoTimeframe(timeframe)) {
    return NextResponse.json(
      { error: `Timeframe "${timeframe}" is not available on the public demo` },
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
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Public demo is capped at ${MAX_RANGE_DAYS} days per request` },
      { status: 400 },
    );
  }

  try {
    const bars: OhlcBar[] = await fetchOhlcWithCache(symbol, timeframe, fromMs, toMs);
    return NextResponse.json({ bars }, { status: 200 });
  } catch (err) {
    if (err instanceof DukascopyUpstreamError) {
      console.error('[market-data/ohlc/public] Dukascopy upstream error:', err.message);
      return NextResponse.json({ error: 'Failed to load market data' }, { status: 502 });
    }
    console.error('[market-data/ohlc/public] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
