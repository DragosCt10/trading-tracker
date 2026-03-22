/**
 * k6 Load Test: Full-Text Search Under Load
 *
 * 20 VUs concurrently querying the feed_posts full-text search.
 * The CRITICAL test: if the GIN index on feed_posts.content is missing,
 * every search triggers a Seq Scan → this test will be very slow.
 *
 * Pass thresholds:
 *   p95 search < 500ms at 20 VUs
 *   Error rate < 1%
 *
 * If p95 > 500ms AND Q7 in feed-queries.sql shows Seq Scan:
 *   → Create the GIN index (Quick Win QW3):
 *   CREATE INDEX CONCURRENTLY idx_feed_posts_content_fts
 *   ON feed_posts USING GIN (to_tsvector('english', content));
 *
 * Usage:
 *   k6 run --env-file .env.test tests/load/scenarios/search-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const searchDuration = new Trend('search_duration', true);
const searchErrors = new Rate('search_error_rate');

// Realistic search terms that would hit the GIN index
const SEARCH_TERMS = [
  'bitcoin',
  'forex trade',
  'stop loss',
  'profit',
  'eurusd',
  'strategy',
  'risk management',
  'market analysis',
  'gold',
  'support resistance',
  'breakout',
  'trend',
  'scalp',
  'swing trade',
  'position size',
  'gbpusd',
  'indices',
  'momentum',
  'volume',
  'chart pattern',
];

export const options = {
  vus: 20,
  duration: '3m',
  thresholds: {
    'search_duration': ['p(95)<500'],
    'search_error_rate': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],
  },
};

const SUPABASE_URL = __ENV.K6_SUPABASE_URL;

export default function () {
  const token = __ENV.K6_TOKEN_PUBLIC;
  const headers = {
    'apikey': __ENV.K6_ANON_KEY || '',
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  // Pick a random search term
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];

  // Use Supabase's full-text search (mirrors feedSearch.ts:searchPosts)
  // websearch_to_tsquery format via PostgREST: plfts (phrase, language, full-text)
  const searchRes = http.get(
    `${SUPABASE_URL}/rest/v1/feed_posts?is_hidden=eq.false&content=wfts(english).${encodeURIComponent(term)}&order=created_at.desc&limit=21&select=id,content,created_at,like_count,comment_count`,
    { headers, tags: { name: 'fts_search' } }
  );

  const ok = check(searchRes, {
    'search status 200': (r) => r.status === 200,
    'search returns array': (r) => r.body && r.body.startsWith('['),
    'search < 800ms': (r) => r.timings.duration < 800,
  });

  searchDuration.add(searchRes.timings.duration);
  searchErrors.add(!ok);

  if (searchRes.timings.duration > 500) {
    console.warn(`SLOW SEARCH: "${term}" took ${searchRes.timings.duration}ms — check GIN index (Q7 in feed-queries.sql)`);
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const duration = data.metrics['search_duration'];
  const errors = data.metrics['search_error_rate'];

  return {
    'tests/load/results/search-load-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== Full-Text Search Load Test Summary ===
Duration p50: ${duration?.values?.['p(50)']?.toFixed(0) ?? 'N/A'}ms
Duration p95: ${duration?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms  (threshold: < 500ms)
Duration p99: ${duration?.values?.['p(99)']?.toFixed(0) ?? 'N/A'}ms
Error rate:   ${((errors?.values?.rate ?? 0) * 100).toFixed(2)}%

${(duration?.values?.['p(95)'] ?? 0) > 500
  ? '⚠ SLOW: p95 > 500ms. Check GIN index with Q7 in tests/db/feed-queries.sql'
  : '✓ FAST: p95 within threshold. GIN index likely present.'}

If slow, apply Quick Win QW3:
  CREATE INDEX CONCURRENTLY idx_feed_posts_content_fts
  ON feed_posts USING GIN (to_tsvector('english', content));
`,
  };
}
