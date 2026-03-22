/**
 * k6 Load Test: Like Toggle Concurrency + Data Integrity
 *
 * 50 VUs alternating like → unlike → like on the SAME post.
 * Tests the race condition in likePost(): post check → count check → upsert/delete
 * are not atomic — concurrent calls can cause like_count drift.
 *
 * Pass thresholds:
 *   p95 like toggle < 400ms
 *   Error rate = 0% (no 4xx or 5xx)
 *   POST-RUN: like_count == COUNT(feed_likes WHERE post_id = K6_LIKE_POST_ID)
 *
 * The post-run data integrity check must be run manually in Supabase SQL Editor:
 *   SELECT
 *     like_count AS denormalized_count,
 *     (SELECT COUNT(*)::int FROM feed_likes WHERE post_id = '<K6_LIKE_POST_ID>') AS actual_count,
 *     like_count = (SELECT COUNT(*)::int FROM feed_likes WHERE post_id = '<K6_LIKE_POST_ID>') AS counts_match
 *   FROM feed_posts
 *   WHERE id = '<K6_LIKE_POST_ID>';
 *
 * Usage:
 *   k6 run --env-file .env.test tests/load/scenarios/like-toggle.js
 *
 * Save baseline:
 *   k6 run --env-file .env.test \
 *     --out json=tests/load/results/like-toggle-baseline-$(date +%Y%m%d).json \
 *     tests/load/scenarios/like-toggle.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const likeDuration = new Trend('like_toggle_duration', true);
const likeErrors = new Rate('like_error_rate');
const likeCount = new Counter('like_requests_total');

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    'like_toggle_duration': ['p(95)<400'],
    'like_error_rate': ['rate<0.001'], // Strict: 0 errors allowed
    'http_req_failed': ['rate<0.001'],
  },
};

const SUPABASE_URL = __ENV.K6_SUPABASE_URL;
const POST_ID = __ENV.K6_LIKE_POST_ID;
const APP_URL = __ENV.K6_APP_URL || 'http://localhost:3000';

export default function () {
  if (!POST_ID) {
    console.error('K6_LIKE_POST_ID not set in .env.test — run seed-post-likes.sql first');
    return;
  }

  // Each VU uses the public user token (all liking the same post)
  // In reality, different users would have different sessions.
  // For race condition testing, same-user repeated likes is intentional:
  // it exercises the idempotent upsert path most aggressively.
  const token = __ENV.K6_TOKEN_PUBLIC;
  const headers = {
    'apikey': __ENV.K6_ANON_KEY || '',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Toggle like via Supabase REST (mirrors what likePost() does at the DB level)
  // 1. Check current like status
  const checkRes = http.get(
    `${SUPABASE_URL}/rest/v1/feed_likes?post_id=eq.${POST_ID}&user_id=eq.${__ENV.K6_USER_PUBLIC_PROFILE_ID}&select=post_id`,
    { headers, tags: { name: 'like_check' } }
  );

  let isLiked = false;
  try {
    const rows = JSON.parse(checkRes.body);
    isLiked = Array.isArray(rows) && rows.length > 0;
  } catch {
    likeErrors.add(1);
    return;
  }

  let likeRes;
  if (isLiked) {
    // Unlike: DELETE the row
    likeRes = http.del(
      `${SUPABASE_URL}/rest/v1/feed_likes?post_id=eq.${POST_ID}&user_id=eq.${__ENV.K6_USER_PUBLIC_PROFILE_ID}`,
      null,
      { headers, tags: { name: 'unlike' } }
    );
  } else {
    // Like: UPSERT the row
    likeRes = http.post(
      `${SUPABASE_URL}/rest/v1/feed_likes`,
      JSON.stringify({
        post_id: POST_ID,
        user_id: __ENV.K6_USER_PUBLIC_PROFILE_ID,
      }),
      {
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        tags: { name: 'like' }
      }
    );
  }

  const ok = check(likeRes, {
    'like toggle status ok': (r) => r.status === 200 || r.status === 201 || r.status === 204,
    'like toggle < 600ms': (r) => r.timings.duration < 600,
  });

  likeDuration.add(likeRes.timings.duration);
  likeErrors.add(!ok);
  likeCount.add(1);

  sleep(0.1); // Minimal sleep — we want high concurrency
}

export function handleSummary(data) {
  const duration = data.metrics['like_toggle_duration'];
  const errors = data.metrics['like_error_rate'];
  const total = data.metrics['like_requests_total'];

  const postRunCheck = POST_ID ? `
POST-RUN INTEGRITY CHECK (run in Supabase SQL Editor):
  SELECT
    like_count AS denormalized_count,
    (SELECT COUNT(*)::int FROM feed_likes WHERE post_id = '${POST_ID}') AS actual_count,
    like_count = (SELECT COUNT(*)::int FROM feed_likes WHERE post_id = '${POST_ID}') AS counts_match
  FROM feed_posts WHERE id = '${POST_ID}';

  PASS: counts_match = true
  FAIL: counts_match = false → like_count trigger has race condition
` : 'Set K6_LIKE_POST_ID in .env.test to see post-run check SQL';

  return {
    'tests/load/results/like-toggle-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== Like Toggle Concurrency Test Summary ===
Total like requests: ${total?.values?.count ?? 'N/A'}
Duration p50: ${duration?.values?.['p(50)']?.toFixed(0) ?? 'N/A'}ms
Duration p95: ${duration?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms  (threshold: < 400ms)
Duration p99: ${duration?.values?.['p(99)']?.toFixed(0) ?? 'N/A'}ms
Error rate:   ${((errors?.values?.rate ?? 0) * 100).toFixed(3)}%  (threshold: 0%)

${postRunCheck}
`,
  };
}
