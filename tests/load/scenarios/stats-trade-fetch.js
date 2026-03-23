/**
 * k6 Load Test: Trade Fetch Parallel Pagination
 *
 * Tests the /api/dashboard-stats endpoint with includeCompactTrades=true,
 * which triggers the full trade list fetch path (parallel Promise.all pagination).
 * At 30k trades: 15 concurrent Supabase pages of 2,000 trades each.
 *
 * This measures the server's ability to handle the data-volume bottleneck
 * identified in the performance analysis — not just the RPC aggregation.
 *
 * Pass thresholds:
 *   p95 response time < 3000ms  (looser than stats-only — fetching full trade list)
 *   Error rate < 1%
 *
 * Prerequisites:
 *   Same as stats-dashboard.js (seed-perf-trades.sql + dev server)
 *
 * Usage:
 *   k6 run --env-file .env.test tests/load/scenarios/stats-trade-fetch.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const fetchDuration  = new Trend('trade_fetch_duration', true);
const fetchErrorRate = new Rate('trade_fetch_error_rate');

export const options = {
  // Smaller ramp — this endpoint is more resource-intensive
  stages: [
    { duration: '30s', target: 5  },
    { duration: '2m',  target: 20 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    'trade_fetch_duration':  ['p(95)<3000'],
    'trade_fetch_error_rate': ['rate<0.01'],
    'http_req_failed':        ['rate<0.01'],
  },
};

const APP_URL     = __ENV.K6_APP_URL || 'http://localhost:3000';
const TOKEN       = __ENV.K6_TOKEN_PUBLIC;
const ACCOUNT_ID  = __ENV.K6_STATS_ACCOUNT_ID;
const STRATEGY_ID = __ENV.K6_STATS_STRATEGY_30K_ID;

const START_DATE = `${new Date().getFullYear() - 2}-01-01`;
const END_DATE   = new Date().toISOString().slice(0, 10);

export function setup() {
  if (!TOKEN || !ACCOUNT_ID || !STRATEGY_ID) {
    console.error('Missing required env vars. Check .env.test');
    return { seedValid: false };
  }
  return { seedValid: true };
}

export default function (data) {
  if (data && data.seedValid === false) return;

  const params = new URLSearchParams({
    accountId:           ACCOUNT_ID,
    mode:                'backtesting',
    startDate:           START_DATE,
    endDate:             END_DATE,
    strategyId:          STRATEGY_ID,
    accountBalance:      '50000',
    execution:           'executed',
    market:              'all',
    includeCompactTrades: 'true',  // triggers parallel pagination fetch
  });

  const res = http.get(`${APP_URL}/api/dashboard-stats?${params}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    timeout: '10s',
  });

  fetchDuration.add(res.timings.duration);
  fetchErrorRate.add(res.status !== 200);

  check(res, {
    'status is 200':           (r) => r.status === 200,
    'compact_trades present':  (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.compact_trades);
      } catch {
        return false;
      }
    },
    'trade count > 0':         (r) => {
      try {
        const body = JSON.parse(r.body);
        return (body.compact_trades?.length ?? 0) > 0;
      } catch {
        return false;
      }
    },
  });

  sleep(1 + Math.random()); // 1–2s think time (heavier endpoint)
}
