/**
 * k6 Load Test: Following Feed — IN() Clause Scaling
 *
 * Tests getTimeline() performance as the number of follows grows.
 * Confirms the known bottleneck: WHERE author_id = ANY(ARRAY[...N UUIDs])
 * degrades as N grows.
 *
 * Uses Supabase REST API directly to isolate DB performance
 * from Next.js SSR overhead.
 *
 * Pass thresholds:
 *   p95 @ 10 follows  < 200ms
 *   p95 @ 100 follows < 500ms
 *   p95 @ 500 follows < 1200ms (warn if > 800ms)
 *   http_req_failed   < 1%
 *
 * Prerequisites:
 *   1. Run generate-tokens.mjs → .env.test
 *   2. Run seed-follows.sql (inserts follows rows for 10/100/500-follow users)
 *
 * Usage:
 *   k6 run --env-file .env.test tests/load/scenarios/following-feed.js
 *
 * Save baseline:
 *   k6 run --env-file .env.test \
 *     --out json=tests/load/results/following-feed-baseline-$(date +%Y%m%d).json \
 *     tests/load/scenarios/following-feed.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import exec from 'k6/execution';

const timeline10 = new Trend('timeline_10follows', true);
const timeline100 = new Trend('timeline_100follows', true);
const timeline500 = new Trend('timeline_500follows', true);
const failRate = new Rate('following_fail_rate');

export const options = {
  scenarios: {
    follows_10: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      tags: { follows: '10' },
    },
    follows_100: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      startTime: '3m30s',
      tags: { follows: '100' },
    },
    follows_500: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      startTime: '7m',
      tags: { follows: '500' },
    },
  },
  thresholds: {
    'timeline_10follows': ['p(95)<200'],
    'timeline_100follows': ['p(95)<500'],
    'timeline_500follows': ['p(95)<1200'],
    'following_fail_rate': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],
  },
};

const SUPABASE_URL = __ENV.K6_SUPABASE_URL;

// Simulate getTimeline: fetch follows, then query feed_posts IN(following_ids)
// We query Supabase REST directly to match what feedPosts.ts:getTimeline() does
function timelineRequest(token, profileId) {
  if (!SUPABASE_URL || !profileId) {
    return { duration: 0, ok: false };
  }

  const headers = {
    'apikey': __ENV.K6_ANON_KEY || '',
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  const startTime = Date.now();

  // Step 1: Fetch follows (mirrors getTimeline step 1)
  const followsRes = http.get(
    `${SUPABASE_URL}/rest/v1/follows?follower_id=eq.${profileId}&select=following_id`,
    { headers, tags: { name: 'timeline_follows_fetch' } }
  );

  if (followsRes.status !== 200) return { duration: Date.now() - startTime, ok: false };

  let followingIds;
  try {
    followingIds = JSON.parse(followsRes.body).map(r => r.following_id);
  } catch {
    return { duration: Date.now() - startTime, ok: false };
  }

  // Step 2: Fetch posts from followed profiles (mirrors getTimeline step 2)
  const allIds = [profileId, ...followingIds];
  const inClause = allIds.map(id => `"${id}"`).join(',');

  const postsRes = http.get(
    `${SUPABASE_URL}/rest/v1/feed_posts?is_hidden=eq.false&author_id=in.(${inClause})&order=created_at.desc&limit=21&select=*`,
    { headers, tags: { name: 'timeline_posts_fetch' } }
  );

  const totalDuration = Date.now() - startTime;
  const ok = postsRes.status === 200;

  return { duration: totalDuration, ok };
}

export default function () {
  // Determine which scenario is running based on the tag
  const scenario = __ENV.K6_SCENARIO_NAME || exec.scenario.name;

  if (scenario === 'follows_10') {
    group('10 follows timeline', () => {
      const token = __ENV.K6_TOKEN_10FOLLOWS;
      const profileId = __ENV.K6_USER_10FOLLOWS_PROFILE_ID;
      const { duration, ok } = timelineRequest(token, profileId);

      timeline10.add(duration);
      failRate.add(!ok);

      check({ duration, ok }, {
        '10-follow timeline ok': ({ ok }) => ok,
        '10-follow timeline < 300ms': ({ duration }) => duration < 300,
      });
    });
  } else if (scenario === 'follows_100') {
    group('100 follows timeline', () => {
      const token = __ENV.K6_TOKEN_100FOLLOWS;
      const profileId = __ENV.K6_USER_100FOLLOWS_PROFILE_ID;
      const { duration, ok } = timelineRequest(token, profileId);

      timeline100.add(duration);
      failRate.add(!ok);

      check({ duration, ok }, {
        '100-follow timeline ok': ({ ok }) => ok,
        '100-follow timeline < 600ms': ({ duration }) => duration < 600,
      });
    });
  } else if (scenario === 'follows_500') {
    group('500 follows timeline', () => {
      const token = __ENV.K6_TOKEN_500FOLLOWS;
      const profileId = __ENV.K6_USER_500FOLLOWS_PROFILE_ID;
      const { duration, ok } = timelineRequest(token, profileId);

      timeline500.add(duration);
      failRate.add(!ok);

      check({ duration, ok }, {
        '500-follow timeline ok': ({ ok }) => ok,
        '500-follow timeline < 1500ms': ({ duration }) => duration < 1500,
      });

      if (duration > 800) {
        console.warn(`WARN: 500-follow timeline took ${duration}ms — IN() bottleneck likely`);
      }
    });
  }

  sleep(1);
}

export function handleSummary(data) {
  const t10 = data.metrics['timeline_10follows'];
  const t100 = data.metrics['timeline_100follows'];
  const t500 = data.metrics['timeline_500follows'];

  const summary = `
=== Following Feed IN() Scaling Test Summary ===

10 follows:
  p50: ${t10?.values?.['p(50)']?.toFixed(0) ?? 'N/A'}ms
  p95: ${t10?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms  (threshold: < 200ms)

100 follows:
  p50: ${t100?.values?.['p(50)']?.toFixed(0) ?? 'N/A'}ms
  p95: ${t100?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms  (threshold: < 500ms)

500 follows:
  p50: ${t500?.values?.['p(50)']?.toFixed(0) ?? 'N/A'}ms
  p95: ${t500?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms  (threshold: < 1200ms, warn > 800ms)

Degradation ratio (500 vs 10):
  p95 ratio: ${t500 && t10 ? (t500.values['p(95)'] / t10.values['p(95)']).toFixed(1) : 'N/A'}x
  (> 5x ratio confirms IN() bottleneck requires architectural fix)
`;

  return {
    'tests/load/results/following-feed-summary.json': JSON.stringify(data, null, 2),
    stdout: summary,
  };
}
