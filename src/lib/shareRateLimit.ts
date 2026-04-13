/**
 * Rate limiting for public share pages.
 *
 * Enabled only when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are
 * set in the environment. Without them every call returns { allowed: true }
 * so the feature is fully operational in local dev and staging without setup.
 *
 * Two budgets are applied — both must pass:
 *   per_ip   — 60 requests / 60 s  (catches bots hammering from one IP)
 *   per_token — 300 requests / 1 h  (caps damage if a token leaks publicly)
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ipLimiter: Ratelimit | null = null;
let tokenLimiter: Ratelimit | null = null;

function getLimiters(): { ipLimiter: Ratelimit; tokenLimiter: Ratelimit } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  if (!ipLimiter || !tokenLimiter) {
    const redis = new Redis({ url, token });
    ipLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      prefix: 'share_rl:ip',
      ephemeralCache: new Map(),
    });
    tokenLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(300, '1 h'),
      prefix: 'share_rl:token',
      ephemeralCache: new Map(),
    });
  }

  return { ipLimiter, tokenLimiter };
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the client may retry. Only set when allowed = false. */
  retryAfter?: number;
}

/**
 * Check whether a share-page request should be allowed through.
 *
 * Fails open on any Upstash error — an Upstash outage must never take down
 * share pages for legitimate users.
 *
 * @param ip   - The request's originating IP address
 * @param shareToken - The share token from the URL path
 */
export async function checkShareRateLimit(
  ip: string,
  shareToken: string
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) {
    // Upstash not configured — fail open.
    return { allowed: true };
  }

  try {
    const [ipResult, tokenResult] = await Promise.all([
      limiters.ipLimiter.limit(`ip:${ip}`),
      limiters.tokenLimiter.limit(`token:${shareToken}`),
    ]);

    if (!ipResult.success) {
      const retryAfter = Math.ceil((ipResult.reset - Date.now()) / 1000);
      return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
    }

    if (!tokenResult.success) {
      const retryAfter = Math.ceil((tokenResult.reset - Date.now()) / 1000);
      return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
    }

    return { allowed: true };
  } catch (err) {
    // Fail open — log but never block legitimate users due to Upstash outage.
    console.error('[shareRateLimit] Upstash error (failing open):', err);
    return { allowed: true };
  }
}
