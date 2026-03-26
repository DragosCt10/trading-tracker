import { createAdminClient } from '@/lib/server/supabaseAdmin';

/**
 * DB-backed rate limiter using the `check_rate_limit` Postgres function.
 *
 * Returns true  → request is within the limit (allow).
 * Returns false → limit exceeded (reject).
 *
 * Unlike the previous in-memory Map, this survives Vercel cold-starts and
 * works correctly across multiple serverless instances.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) {
      console.error('[checkRateLimit] RPC error:', error);
      return true; // fail-open: don't block if rate-limit check itself errors
    }
    return data === true;
  } catch (err) {
    console.error('[checkRateLimit] unexpected error:', err);
    return true; // fail-open
  }
}
