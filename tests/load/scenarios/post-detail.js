/**
 * k6 Load Test: Post Detail Page — SSR + Comment Fetch
 *
 * 20 VUs hitting /feed/post/[id] for a seeded post.
 * Tests the second most-visited feed route: post detail SSR
 * which includes getPost() + getComments() in parallel.
 *
 * Pass thresholds:
 *   p95 SSR post detail < 1200ms
 *   Error rate < 1%
 *
 * Usage:
 *   k6 run --env-file .env.test tests/load/scenarios/post-detail.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const detailDuration = new Trend('post_detail_duration', true);
const commentsDuration = new Trend('post_comments_duration', true);
const failRate = new Rate('post_detail_fail_rate');

export const options = {
  vus: 20,
  duration: '3m',
  thresholds: {
    'post_detail_duration': ['p(95)<1200'],
    'post_comments_duration': ['p(95)<300'],
    'post_detail_fail_rate': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],
  },
};

const APP_URL = __ENV.K6_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = __ENV.K6_SUPABASE_URL;

// Use the comment post (has 1000 comments) to stress test the detail page
const POST_ID = __ENV.K6_COMMENT_POST_ID || __ENV.K6_DETAIL_POST_ID || __ENV.K6_LIKE_POST_ID;

export default function () {
  if (!POST_ID) {
    console.error('No post ID set — set K6_COMMENT_POST_ID or K6_DETAIL_POST_ID in .env.test');
    return;
  }

  const token = __ENV.K6_TOKEN_PUBLIC;
  const headers = {
    'Accept': 'text/html,application/xhtml+xml',
    'Authorization': token ? `Bearer ${token}` : '',
  };

  // 1. SSR page load for post detail
  const detailRes = http.get(
    `${APP_URL}/feed/post/${POST_ID}`,
    { headers, tags: { name: 'post_detail_ssr' } }
  );

  const detailOk = check(detailRes, {
    'Post detail status 200': (r) => r.status === 200,
    'Post detail has content': (r) => r.body && (r.body.includes('post') || r.body.includes('comment')),
    'Post detail < 2s': (r) => r.timings.duration < 2000,
  });

  detailDuration.add(detailRes.timings.duration);
  failRate.add(!detailOk);

  sleep(0.3);

  // 2. Separately benchmark comment fetch (mirrors getComments server action)
  if (SUPABASE_URL) {
    const commentsHeaders = {
      'apikey': __ENV.K6_ANON_KEY || '',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    const commentsRes = http.get(
      `${SUPABASE_URL}/rest/v1/feed_comments?post_id=eq.${POST_ID}&is_hidden=eq.false&parent_id=is.null&order=created_at.asc&limit=31&select=*`,
      { headers: commentsHeaders, tags: { name: 'post_comments_fetch' } }
    );

    const commentsOk = check(commentsRes, {
      'Comments status 200': (r) => r.status === 200,
      'Comments returns array': (r) => r.body && r.body.startsWith('['),
      'Comments < 500ms': (r) => r.timings.duration < 500,
    });

    commentsDuration.add(commentsRes.timings.duration);
    failRate.add(!commentsOk);
  }

  sleep(1);
}

export function handleSummary(data) {
  const detail = data.metrics['post_detail_duration'];
  const comments = data.metrics['post_comments_duration'];
  const fails = data.metrics['post_detail_fail_rate'];

  return {
    'tests/load/results/post-detail-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== Post Detail Load Test Summary ===
Post ID under test: ${POST_ID ?? 'NOT SET'}

Detail SSR:
  p50: ${detail?.values?.['p(50)']?.toFixed(0) ?? 'N/A'}ms
  p95: ${detail?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms  (threshold: < 1200ms)
  p99: ${detail?.values?.['p(99)']?.toFixed(0) ?? 'N/A'}ms

Comment Fetch:
  p50: ${comments?.values?.['p(50)']?.toFixed(0) ?? 'N/A'}ms
  p95: ${comments?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms  (threshold: < 300ms)

Fail Rate: ${((fails?.values?.rate ?? 0) * 100).toFixed(2)}%

Note: If testing with seed-1000-comments.sql post, the page only loads the first
30 comments (getComments limit=30) — the rest are deferred. Total 1000 comments
in DB should NOT significantly impact SSR time if Q8 index is working.
`,
  };
}
