/**
 * R2 writer — uploads gzipped OHLC chunk files.
 *
 * Splits an in-memory bars array by chunk boundary (month or year, depending
 * on timeframe) and uploads one gzipped JSON file per chunk. Idempotent:
 * uploading the same key overwrites; safe to re-run a backfill if it fails
 * partway.
 */

// Server-only module. Uses `node:zlib` and `@aws-sdk/client-s3` — both
// browser-incompatible.
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { gzipSync } from 'node:zlib';
import { getR2Client, r2KeyForMonth, r2KeyForYear } from './r2Client';
import type { NativeTimeframe, OhlcBar } from './types';

const MONTH_CHUNKED: NativeTimeframe[] = ['m1', 'm5', 'm15', 'm30', 'h1', 'h4'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Group bars by their chunk key (YYYY-MM or YYYY). */
function groupBars(
  timeframe: NativeTimeframe,
  bars: OhlcBar[],
): Map<string, OhlcBar[]> {
  const monthChunked = MONTH_CHUNKED.includes(timeframe);
  const groups = new Map<string, OhlcBar[]>();
  for (const b of bars) {
    const d = new Date(b.time * 1000);
    const key = monthChunked
      ? `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`
      : String(d.getUTCFullYear());
    let g = groups.get(key);
    if (!g) {
      g = [];
      groups.set(key, g);
    }
    g.push(b);
  }
  return groups;
}

export interface UploadStat {
  key: string;
  bytes: number;
  bars: number;
}

/**
 * Upload all chunks of `bars` to R2. Existing chunks are overwritten —
 * callers wanting merge semantics must read-merge-write themselves.
 */
export async function writeNativeBarsToR2(
  symbol: string,
  timeframe: NativeTimeframe,
  bars: OhlcBar[],
): Promise<UploadStat[]> {
  if (bars.length === 0) return [];
  const { client, bucket } = getR2Client();
  const groups = groupBars(timeframe, bars);
  const monthChunked = MONTH_CHUNKED.includes(timeframe);

  const stats: UploadStat[] = [];
  for (const [chunkKey, chunkBars] of groups) {
    chunkBars.sort((a, b) => a.time - b.time);
    const key = monthChunked
      ? r2KeyForMonth(symbol, timeframe, chunkKey)
      : r2KeyForYear(symbol, timeframe, chunkKey);
    const json = JSON.stringify(chunkBars);
    const gz = gzipSync(Buffer.from(json, 'utf8'), { level: 9 });
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: gz,
        ContentType: 'application/json',
        ContentEncoding: 'gzip',
      }),
    );
    stats.push({ key, bytes: gz.length, bars: chunkBars.length });
  }
  return stats;
}
