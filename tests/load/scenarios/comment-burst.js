/**
 * k6 Load Test: Comment Creation Burst
 *
 * 20 VUs submitting comments to the same post simultaneously.
 * Validates that comment_count (trigger-maintained) stays consistent
 * under concurrent comment creation.
 *
 * Pass thresholds:
 *   p95 comment creation < 600ms
 *   Error rate < 1%
 *   POST-RUN: comment_count == COUNT(feed_comments WHERE post_id = K6_COMMENT_POST_ID AND parent_id IS NULL)
 *
 * Usage:
 *   k6 run --env-file .env.test tests/load/scenarios/comment-burst.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const commentDuration = new Trend('comment_creation_duration', true);
const commentErrors = new Rate('comment_error_rate');
const commentCount = new Counter('comments_created');

export const options = {
  vus: 20,
  duration: '2m',
  thresholds: {
    'comment_creation_duration': ['p(95)<600'],
    'comment_error_rate': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],
  },
};

const SUPABASE_URL = __ENV.K6_SUPABASE_URL;
const POST_ID = __ENV.K6_COMMENT_POST_ID || __ENV.K6_LIKE_POST_ID; // Fallback to like test post

export default function () {
  if (!POST_ID) {
    console.error('K6_COMMENT_POST_ID not set in .env.test — run seed-post-likes.sql first');
    return;
  }

  const token = __ENV.K6_TOKEN_PUBLIC;
  const profileId = __ENV.K6_USER_PUBLIC_PROFILE_ID;
  const headers = {
    'apikey': __ENV.K6_ANON_KEY || '',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Prefer': 'return=minimal',
  };

  const commentRes = http.post(
    `${SUPABASE_URL}/rest/v1/feed_comments`,
    JSON.stringify({
      post_id: POST_ID,
      author_id: profileId,
      content: `[PERF-TEST] Burst comment from VU at ${Date.now()}`,
      parent_id: null,
      is_hidden: false,
    }),
    { headers, tags: { name: 'create_comment' } }
  );

  const ok = check(commentRes, {
    'comment created': (r) => r.status === 201,
    'comment creation < 800ms': (r) => r.timings.duration < 800,
  });

  commentDuration.add(commentRes.timings.duration);
  commentErrors.add(!ok);
  if (ok) commentCount.add(1);

  sleep(0.5);
}

export function handleSummary(data) {
  const duration = data.metrics['comment_creation_duration'];
  const errors = data.metrics['comment_error_rate'];
  const created = data.metrics['comments_created'];

  const postRunCheck = POST_ID ? `
POST-RUN INTEGRITY CHECK (run in Supabase SQL Editor):
  SELECT
    comment_count AS denormalized_count,
    (SELECT COUNT(*)::int FROM feed_comments WHERE post_id = '${POST_ID}' AND parent_id IS NULL AND is_hidden = false) AS actual_count,
    comment_count = (SELECT COUNT(*)::int FROM feed_comments WHERE post_id = '${POST_ID}' AND parent_id IS NULL AND is_hidden = false) AS counts_match
  FROM feed_posts WHERE id = '${POST_ID}';

  PASS: counts_match = true
  FAIL: counts_match = false → comment_count trigger has race condition
` : '';

  return {
    'tests/load/results/comment-burst-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== Comment Burst Test Summary ===
Comments created:  ${created?.values?.count ?? 'N/A'}
Duration p50:      ${duration?.values?.['p(50)']?.toFixed(0) ?? 'N/A'}ms
Duration p95:      ${duration?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms  (threshold: < 600ms)
Error rate:        ${((errors?.values?.rate ?? 0) * 100).toFixed(2)}%

${postRunCheck}
`,
  };
}
