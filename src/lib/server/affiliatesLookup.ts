import 'server-only';
import { cache } from 'react';

/**
 * Looks up whether a given email is already an active affiliate inside our
 * Lemon Squeezy store.
 *
 * Uses the raw Lemon Squeezy HTTP API (`GET /v1/affiliates`) because as of
 * `@lemonsqueezy/lemonsqueezy.js@4.0.0` the JS SDK does not yet wrap the
 * affiliates endpoints. The API is filterable by `store_id` and `user_email`
 * so we can target a single record without scanning.
 *
 * Failure posture: any error (missing env vars, network, timeout, non-2xx,
 * malformed payload) returns `{ status: 'none' }` so the affiliates page
 * renders the application form as a safe fallback. This function never throws.
 *
 * Wrapped in `React.cache` for request-level memoization, so multiple descendant
 * components in the same render tree share a single upstream call.
 */
export type AffiliateLookup =
  | { status: 'active'; hubUrl: string }
  | { status: 'pending' | 'inactive' | 'none' };

const LS_API_URL = 'https://api.lemonsqueezy.com/v1/affiliates';
const LS_HUB_URL = 'https://app.lemonsqueezy.com/my/affiliates';
const REQUEST_TIMEOUT_MS = 5000;

export const lookupAffiliateByEmail = cache(
  async (email: string): Promise<AffiliateLookup> => {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    if (!apiKey || !storeId || !email) return { status: 'none' };

    try {
      const url = new URL(LS_API_URL);
      url.searchParams.set('filter[store_id]', storeId);
      url.searchParams.set('filter[user_email]', email);

      const res = await fetch(url, {
        headers: {
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        // Affiliate state changes asynchronously via the LS dashboard (manual
        // approval flow), so request-cache memoization is enough — don't let
        // Next.js cache this across requests.
        cache: 'no-store',
      });

      if (!res.ok) {
        console.error(
          `[affiliates] LS lookup non-2xx status=${res.status} email_hash=${hashEmail(email)}`
        );
        return { status: 'none' };
      }

      const body = (await res.json()) as {
        data?: Array<{ attributes?: { status?: string } }>;
      };
      const first = body.data?.[0]?.attributes;
      if (!first || typeof first.status !== 'string') {
        return { status: 'none' };
      }

      // LS affiliate statuses observed in the API: 'active', 'pending', 'inactive'.
      // Anything else maps to 'none' so the page shows the application form.
      if (first.status === 'active') {
        return { status: 'active', hubUrl: LS_HUB_URL };
      }
      if (first.status === 'pending' || first.status === 'inactive') {
        return { status: first.status };
      }
      return { status: 'none' };
    } catch (err) {
      console.error('[affiliates] LS lookup failed', err);
      return { status: 'none' };
    }
  }
);

// Small non-reversible fingerprint for log correlation without leaking the
// actual email. Not a cryptographic hash — just enough to correlate lines.
function hashEmail(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i += 1) {
    h = (h * 31 + email.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
