/**
 * k6 Load Test: Public Feed — SSR + Pagination
 *
 * Tests the /feed page SSR load + 3 subsequent pagination calls
 * under increasing concurrency (10 → 50 → 100 VUs).
 *
 * Pass thresholds:
 *   p95 SSR /feed < 800ms  @ 10 VUs
 *   p95 SSR /feed < 1500ms @ 50 VUs
 *   p95 SSR /feed < 2500ms @ 100 VUs
 *   p95 pagination call    < 300ms at all levels
 *   http_req_failed        < 1%
 *
 * Usage:
 *   k6 run --env-file .env.test tests/load/scenarios/public-feed.js
 *
 * Save baseline:
 *   k6 run --env-file .env.test --out json=tests/load/results/public-feed-baseline-$(date +%Y%m%d).json \
 *     tests/load/scenarios/public-feed.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics per phase for granular reporting
const ssrDuration = new Trend('feed_ssr_duration', true);
const paginationDuration = new Trend('feed_pagination_duration', true);
const failRate = new Rate('feed_fail_rate');

const BASE_URL = __ENV.K6_SUPABASE_URL
  ? __ENV.K6_SUPABASE_URL.replace(/\/$/, '').replace('supabase.co', 'vercel.app')
  : 'http://localhost:3000';

// Use the app URL, not Supabase URL
const APP_URL = __ENV.K6_APP_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    // Stage 1: 10 VUs
    low_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      startTime: '30s', // 30s ramp-up handled by arrival rate below
      tags: { phase: '10vus' },
    },
    // Stage 2: 50 VUs
    medium_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      startTime: '3m30s',
      tags: { phase: '50vus' },
    },
    // Stage 3: 100 VUs
    high_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '2m',
      startTime: '7m',
      tags: { phase: '100vus' },
    },
  },
  thresholds: {
    // Overall thresholds across all phases
    'feed_ssr_duration{phase:10vus}': ['p(95)<800'],
    'feed_ssr_duration{phase:50vus}': ['p(95)<1500'],
    'feed_ssr_duration{phase:100vus}': ['p(95)<2500'],
    'feed_pagination_duration': ['p(95)<300'],
    'feed_fail_rate': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],
  },
};

// Cursors: simulate real cursor-based pagination by using relative timestamps
// In production, cursors are ISO timestamp strings from the previous page's last item
function makeCursor(minutesAgo) {
  const d = new Date(Date.now() - minutesAgo * 60 * 1000);
  return encodeURIComponent(d.toISOString());
}

export default function () {
  const token = __ENV.K6_TOKEN_PUBLIC;
  const headers = {
    'Accept': 'text/html,application/xhtml+xml',
    'Cookie': token ? `sb-access-token=${token}` : '',
  };

  // 1. SSR page load — this hits Next.js + triggers getPublicFeed SSR
  const ssrRes = http.get(`${APP_URL}/feed`, { headers, tags: { name: 'feed_ssr' } });

  const ssrOk = check(ssrRes, {
    'SSR status 200': (r) => r.status === 200,
    'SSR contains feed content': (r) => r.body && r.body.includes('feed'),
    'SSR response time < 3s': (r) => r.timings.duration < 3000,
  });

  ssrDuration.add(ssrRes.timings.duration);
  failRate.add(!ssrOk);

  sleep(0.5); // Brief pause between SSR and pagination

  // 2-4. Simulate 3 scroll pages (pagination via server actions)
  // In Next.js App Router, server actions are called as POST to /_next/action
  // We test the Supabase REST endpoint directly for pagination to isolate DB perf
  const supabaseUrl = __ENV.K6_SUPABASE_URL;
  const anonKey = __ENV.K6_ANON_KEY || '';

  if (supabaseUrl) {
    const restHeaders = {
      'apikey': anonKey,
      'Authorization': `Bearer ${token || anonKey}`,
      'Accept': 'application/json',
    };

    // Simulate pagination: page 2, 3, 4
    for (let page = 2; page <= 4; page++) {
      const minutesAgo = (page - 1) * 30; // Simulate cursor from previous page
      const cursor = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

      const pageRes = http.get(
        `${supabaseUrl}/rest/v1/feed_posts?is_hidden=eq.false&created_at=lt.${cursor}&order=created_at.desc&limit=21&select=*`,
        { headers: restHeaders, tags: { name: `feed_page_${page}` } }
      );

      const pageOk = check(pageRes, {
        [`Page ${page} status 200`]: (r) => r.status === 200,
        [`Page ${page} returns array`]: (r) => r.body && r.body.startsWith('['),
        [`Page ${page} < 500ms`]: (r) => r.timings.duration < 500,
      });

      paginationDuration.add(pageRes.timings.duration);
      failRate.add(!pageOk);

      sleep(0.3); // Think time between page loads
    }
  }

  sleep(1); // Think time between VU iterations
}

export function handleSummary(data) {
  return {
    'tests/load/results/public-feed-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const ssr = data.metrics['feed_ssr_duration'];
  const page = data.metrics['feed_pagination_duration'];
  const fails = data.metrics['feed_fail_rate'];

  return `
=== Public Feed Load Test Summary ===
SSR Duration:
  p50: ${ssr?.values?.['p(50)']?.toFixed(0) ?? 'N/A'}ms
  p95: ${ssr?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms
  p99: ${ssr?.values?.['p(99)']?.toFixed(0) ?? 'N/A'}ms

Pagination Duration:
  p50: ${page?.values?.['p(50)']?.toFixed(0) ?? 'N/A'}ms
  p95: ${page?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms

Fail Rate: ${((fails?.values?.rate ?? 0) * 100).toFixed(2)}%
`;
}
