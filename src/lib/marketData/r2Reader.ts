/**
 * R2 reader — fetches and inflates pre-cached OHLC bars from R2.
 *
 * Storage convention:
 *   - Intraday TFs (m1, m5, m15, m30, h1, h4): one file per (symbol, tf, month)
 *   - Daily/monthly (d1, mn1): one file per (symbol, tf, year)
 *
 * For a given range, the reader determines which chunk files cover it,
 * fetches them in parallel, gunzips, parses, concatenates, and filters
 * down to bars whose `time` falls within `[fromMs, toMs)`.
 *
 * A missing file (404) is NOT an error — it just means "not in the cache."
 * The caller (cache router) can fall through to Dukascopy. Other errors
 * (auth, network) propagate as `R2ReadError`.
 */

// Server-only module. Uses `node:zlib` and `@aws-sdk/client-s3` — both
// browser-incompatible, both blocked by `serverExternalPackages`.
import { GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';
import { gunzipSync } from 'node:zlib';
import { getR2Client, r2KeyForMonth, r2KeyForYear } from './r2Client';
import type { NativeTimeframe, OhlcBar } from './types';

export class R2ReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'R2ReadError';
  }
}

/** TFs chunked by month vs by year. */
const MONTH_CHUNKED: NativeTimeframe[] = ['m1', 'm5', 'm15', 'm30', 'h1', 'h4'];
const YEAR_CHUNKED: NativeTimeframe[] = ['d1', 'mn1'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Enumerate the YYYY-MM chunks covering [fromMs, toMs] inclusive. */
function monthChunks(fromMs: number, toMs: number): string[] {
  const chunks: string[] = [];
  const d = new Date(fromMs);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  const end = new Date(toMs);
  while (d.getTime() <= end.getTime()) {
    chunks.push(`${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`);
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return chunks;
}

/** Enumerate the YYYY chunks covering [fromMs, toMs]. */
function yearChunks(fromMs: number, toMs: number): string[] {
  const chunks: string[] = [];
  const startY = new Date(fromMs).getUTCFullYear();
  const endY = new Date(toMs).getUTCFullYear();
  for (let y = startY; y <= endY; y++) chunks.push(String(y));
  return chunks;
}

async function fetchAndDecode(
  bucket: string,
  key: string,
  client: ReturnType<typeof getR2Client>['client'],
): Promise<OhlcBar[] | null> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    // Streaming → buffer. R2 chunks are small (KB range) so a single read is fine.
    const chunks: Uint8Array[] = [];
    // @ts-expect-error AWS SDK readable stream type elides .on()
    for await (const chunk of res.Body) {
      chunks.push(chunk as Uint8Array);
    }
    const gz = Buffer.concat(chunks);
    const json = gunzipSync(gz).toString('utf8');
    const parsed = JSON.parse(json) as OhlcBar[];
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    if (err instanceof NoSuchKey) return null;
    // S3 SDK returns 404s as NoSuchKey, but some endpoints throw a generic error
    // with `$metadata.httpStatusCode === 404` instead — handle both.
    const httpStatus =
      err && typeof err === 'object' && '$metadata' in err
        ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined;
    if (httpStatus === 404 || httpStatus === 403) return null; // 403 also treated as miss (not yet uploaded)
    throw new R2ReadError(
      `R2 read failed for ${key}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Read a range of bars for a native timeframe from R2.
 *
 * Returns:
 *   - `bars` — bars whose `time` is in `[fromMs/1000, toMs/1000)`
 *   - `complete` — true iff every chunk file in the range was found in R2.
 *     The cache router uses this to decide whether to fall through to
 *     Dukascopy. (E.g., a 60-day m1 query may hit 2 months of files; if
 *     either is missing we need Dukascopy to fill the gap.)
 */
export async function readNativeRangeFromR2(
  symbol: string,
  timeframe: NativeTimeframe,
  fromMs: number,
  toMs: number,
): Promise<{ bars: OhlcBar[]; complete: boolean }> {
  const { client, bucket } = getR2Client();
  const monthChunked = MONTH_CHUNKED.includes(timeframe);
  const isYearChunked = YEAR_CHUNKED.includes(timeframe);
  const chunks = monthChunked
    ? monthChunks(fromMs, toMs)
    : isYearChunked
      ? yearChunks(fromMs, toMs)
      : [];

  if (chunks.length === 0) {
    return { bars: [], complete: false };
  }

  const keys = chunks.map((c) =>
    monthChunked ? r2KeyForMonth(symbol, timeframe, c) : r2KeyForYear(symbol, timeframe, c),
  );
  const results = await Promise.all(keys.map((k) => fetchAndDecode(bucket, k, client)));

  const fromSec = Math.floor(fromMs / 1000);
  const toSec = Math.floor(toMs / 1000);
  const bars: OhlcBar[] = [];
  let complete = true;
  for (const res of results) {
    if (res === null) {
      complete = false;
      continue;
    }
    for (const b of res) {
      if (b.time >= fromSec && b.time < toSec) bars.push(b);
    }
  }
  // Files are pre-sorted in time, but a defensive sort costs nothing at this size.
  bars.sort((a, b) => a.time - b.time);
  return { bars, complete };
}
