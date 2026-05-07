/**
 * GET /api/market-data/cron
 *
 * Nightly job (Vercel Cron at 01:00 UTC) that ingests yesterday's bars for
 * every (symbol × native timeframe) into R2. Authenticated by the
 * `Authorization: Bearer <CRON_SECRET>` header that Vercel adds automatically
 * when cron invokes the route — see vercel.json.
 *
 * Strategy:
 *   - For month-chunked TFs (m1..h4): re-fetch yesterday's full month and
 *     overwrite that month's R2 chunk. Upserting the whole month is simpler
 *     than incremental merge and only happens once per (symbol, tf, month).
 *   - For year-chunked TFs (d1, mn1): re-fetch yesterday's full year and
 *     overwrite that year's chunk. Same reasoning.
 *
 * If the cron has been missed for several days (e.g. deployment outage), the
 * next run still re-fetches "yesterday's" month/year — older months stay
 * intact because we only touch the cursor month/year. A separate manual
 * backfill run with the same script can fill any gaps.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BACKTESTABLE_SYMBOLS } from '@/lib/marketData/dukascopySymbols';
import { fetchDukascopyOhlc } from '@/lib/marketData/dukascopyProvider';
import { writeNativeBarsToR2 } from '@/lib/marketData/r2Writer';
import { isR2Configured } from '@/lib/marketData/r2Client';
import { NATIVE_TIMEFRAMES, type NativeTimeframe } from '@/lib/marketData/types';

// Vercel cron timeouts — the default 10s for hobby is too short for a 50-symbol
// sweep. Pro accounts get 60s on `maxDuration`. The route will still chunk
// across runs if it can't finish (idempotent overwrite is safe).
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MONTH_CHUNKED: NativeTimeframe[] = ['m1', 'm5', 'm15', 'm30', 'h1', 'h4'];

/** UTC start-of-yesterday → start-of-today, as ISO strings for the month/year that contains "yesterday". */
function yesterdayChunkBounds(tf: NativeTimeframe): { fromIso: string; toIso: string } {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86_400_000);

  if (MONTH_CHUNKED.includes(tf)) {
    const y = yesterday.getUTCFullYear();
    const m = yesterday.getUTCMonth();
    const fromIso = new Date(Date.UTC(y, m, 1)).toISOString();
    const toIso = new Date(Date.UTC(y, m + 1, 1)).toISOString();
    return { fromIso, toIso };
  }
  // Year-chunked
  const y = yesterday.getUTCFullYear();
  const fromIso = new Date(Date.UTC(y, 0, 1)).toISOString();
  const toIso = new Date(Date.UTC(y + 1, 0, 1)).toISOString();
  return { fromIso, toIso };
}

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Defensive: in dev with no secret, only allow localhost so this doesn't
    // become an open scraping endpoint if accidentally deployed without it.
    const host = req.headers.get('host') ?? '';
    return host.startsWith('localhost') || host.startsWith('127.0.0.1');
  }
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${expected}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: 'R2 not configured — cron disabled until env is set' },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  let chunksWritten = 0;
  let barsWritten = 0;
  const errors: { symbol: string; tf: string; message: string }[] = [];

  for (const symbol of BACKTESTABLE_SYMBOLS) {
    for (const tf of NATIVE_TIMEFRAMES) {
      const { fromIso, toIso } = yesterdayChunkBounds(tf);
      try {
        const bars = await fetchDukascopyOhlc({ symbol, timeframe: tf, fromIso, toIso });
        if (bars.length > 0) {
          const stats = await writeNativeBarsToR2(symbol, tf, bars);
          chunksWritten += stats.length;
          barsWritten += bars.length;
        }
      } catch (err) {
        errors.push({
          symbol,
          tf,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return NextResponse.json({
    chunksWritten,
    barsWritten,
    errors: errors.length,
    errorSamples: errors.slice(0, 5),
    elapsedMs: Date.now() - startedAt,
  });
}
