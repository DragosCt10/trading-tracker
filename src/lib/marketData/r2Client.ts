/**
 * Cloudflare R2 client (S3-compatible). Server-only.
 *
 * R2 hosts pre-cached OHLC bars as gzipped JSON files keyed by
 *   bars/{symbol}/{timeframe}/{yyyy-MM}.json.gz
 *
 * Why R2: free 10 GB storage + zero egress fees, generous Class-A/B op
 * limits. Keeps the entire backtest data layer at $0 for our scope.
 *
 * Credentials are read once at module load. The four env vars are required:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *
 * If any are missing the module throws a clear error — fail-fast on misconfig
 * rather than silently degrading to "no cache, always Dukascopy".
 */

// Server-only module. `@aws-sdk/client-s3` is in `serverExternalPackages` and
// uses Node built-ins (http/crypto/stream) so it can't bundle for the browser.
import { S3Client } from '@aws-sdk/client-s3';

export class R2ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'R2ConfigError';
  }
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;

function loadR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new R2ConfigError(
      'R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET in .env.local. ' +
        'Sign up at https://www.cloudflare.com → R2 → create bucket → API tokens.',
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/**
 * Lazily-initialised R2 client. Reused across calls so the underlying HTTP
 * connection pool is shared — important for serverless cold starts.
 */
export function getR2Client(): { client: S3Client; bucket: string } {
  if (cachedClient && cachedBucket) {
    return { client: cachedClient, bucket: cachedBucket };
  }
  const cfg = loadR2Config();
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  cachedBucket = cfg.bucket;
  return { client: cachedClient, bucket: cachedBucket };
}

/** Bucket key for a (symbol, timeframe, year-month) chunk. */
export function r2KeyForMonth(symbol: string, timeframe: string, yyyyMm: string): string {
  return `bars/${symbol}/${timeframe}/${yyyyMm}.json.gz`;
}

/** Bucket key for a (symbol, timeframe, year) chunk — used for d1 / mn1 / w1. */
export function r2KeyForYear(symbol: string, timeframe: string, yyyy: string): string {
  return `bars/${symbol}/${timeframe}/${yyyy}.json.gz`;
}

/** Returns true if R2 is configured (used to skip cache layer in dev when env is unset). */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}
