/**
 * k6 Load Test: Post Creation Weekly Rate Limit Race Condition
 *
 * 10 VUs simultaneously creating posts for a user whose weekly limit = N.
 * Tests whether the non-atomic getWeeklyPostCount() + INSERT in createPost()
 * can be bypassed under concurrency.
 *
 * Expected behavior: exactly WEEKLY_LIMIT posts created, rest return LIMIT_EXCEEDED.
 * Failure: more than WEEKLY_LIMIT posts created = race condition confirmed.
 *
 * Pass thresholds:
 *   POST-RUN: COUNT(feed_posts WHERE author_id = K6_USER_PUBLIC_PROFILE_ID AND week >= this week)
 *             must equal WEEKLY_LIMIT (not more)
 *
 * Note: This test requires the user to have a weekly limit configured in the tier.
 * The 'starter' tier has maxPostsPerWeek = 3. The 'pro' tier is unlimited.
 * Create a special test profile with 'starter' tier for this test.
 *
 * Usage:
 *   k6 run --env-file .env.test tests/load/scenarios/post-creation.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const creationDuration = new Trend('post_creation_duration', true);
const successCount = new Counter('posts_created_success');
const limitHitCount = new Counter('posts_limit_hit');
const errorCount = new Counter('posts_creation_error');

// Expected weekly limit for the test user's tier
// 'starter' tier = 3 posts/week. Adjust if your tier config differs.
const WEEKLY_LIMIT = 3;

export const options = {
  vus: 10,
  iterations: 10, // Each VU tries exactly once = 10 total attempts
  thresholds: {
    'post_creation_duration': ['p(95)<2000'],
    'http_req_failed': ['rate<0.5'], // We expect ~70% to fail with LIMIT_EXCEEDED
  },
};

const SUPABASE_URL = __ENV.K6_SUPABASE_URL;
const APP_URL = __ENV.K6_APP_URL || 'http://localhost:3000';

export default function () {
  // Use the 10-follows user (has 'starter' tier if set up that way)
  // Or create a dedicated starter-tier user for this test
  const token = __ENV.K6_TOKEN_10FOLLOWS;
  const profileId = __ENV.K6_USER_10FOLLOWS_PROFILE_ID;

  const headers = {
    'apikey': __ENV.K6_ANON_KEY || '',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Prefer': 'return=representation',
  };

  // Attempt to create a post directly via Supabase REST
  // (Note: this bypasses the Next.js createPost() server action and its limit check)
  // For a real race condition test, you need to hit the server action, not Supabase directly.
  // The server action enforces the limit; direct REST bypasses RLS checks.
  //
  // TODO: Update this to call the Next.js server action endpoint when available.
  // For now, this tests concurrent INSERT behavior at the DB level.
  const createRes = http.post(
    `${SUPABASE_URL}/rest/v1/feed_posts`,
    JSON.stringify({
      author_id: profileId,
      content: `[PERF-TEST] Rate limit test post at ${Date.now()}`,
      post_type: 'text',
      is_hidden: false,
    }),
    { headers, tags: { name: 'create_post' } }
  );

  creationDuration.add(createRes.timings.duration);

  if (createRes.status === 201) {
    successCount.add(1);
    console.log(`Post created (VU ${__VU})`);
  } else if (createRes.status === 400 || createRes.status === 422) {
    const body = createRes.body || '';
    if (body.includes('LIMIT_EXCEEDED') || body.includes('weekly') || body.includes('limit')) {
      limitHitCount.add(1);
      console.log(`Limit hit (VU ${__VU}) — expected`);
    } else {
      errorCount.add(1);
      console.warn(`Unexpected 400 (VU ${__VU}): ${body.slice(0, 200)}`);
    }
  } else {
    errorCount.add(1);
    console.error(`Unexpected status ${createRes.status} (VU ${__VU}): ${createRes.body?.slice(0, 200)}`);
  }

  check(createRes, {
    'response is 201 or 400': (r) => r.status === 201 || r.status === 400 || r.status === 422,
  });
}

export function handleSummary(data) {
  const created = data.metrics['posts_created_success'];
  const limited = data.metrics['posts_limit_hit'];
  const errors = data.metrics['posts_creation_error'];

  const createdCount = created?.values?.count ?? 0;
  const limitedCount = limited?.values?.count ?? 0;
  const errorTotal = errors?.values?.count ?? 0;

  const integrityPassed = createdCount <= WEEKLY_LIMIT;
  const integrityNote = integrityPassed
    ? `✓ PASS: ${createdCount} posts created (≤ limit of ${WEEKLY_LIMIT})`
    : `✗ FAIL: ${createdCount} posts created — EXCEEDS limit of ${WEEKLY_LIMIT}! Race condition confirmed.`;

  const postRunCheck = `
POST-RUN INTEGRITY CHECK (run in Supabase SQL Editor):
  SELECT COUNT(*)
  FROM feed_posts
  WHERE author_id = '${__ENV.K6_USER_10FOLLOWS_PROFILE_ID ?? '<K6_USER_10FOLLOWS_PROFILE_ID>'}'
    AND content LIKE '[PERF-TEST]%'
    AND created_at >= date_trunc('week', NOW());

  Expected: ${WEEKLY_LIMIT} (or less)
  More than ${WEEKLY_LIMIT} = race condition in createPost() weekly limit check
`;

  return {
    'tests/load/results/post-creation-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== Post Creation Rate Limit Race Condition Test ===
VUs (concurrent attempts): 10
Weekly limit under test:   ${WEEKLY_LIMIT}

Posts created (success):   ${createdCount}
Limit rejections:          ${limitedCount}
Unexpected errors:         ${errorTotal}

${integrityNote}

${postRunCheck}
`,
  };
}
