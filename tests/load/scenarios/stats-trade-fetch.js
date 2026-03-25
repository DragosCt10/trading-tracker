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
 *   source .env.test && k6 run tests/load/scenarios/stats-trade-fetch.js
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
    'trade_fetch_duration':   ['p(95)<3000'],
    'trade_fetch_error_rate': ['rate<0.01'],
    'http_req_failed':        ['rate<0.01'],
  },
};

const APP_URL       = __ENV.K6_APP_URL || 'http://localhost:3000';
const SUPABASE_URL  = __ENV.NEXT_PUBLIC_SUPABASE_URL || __ENV.K6_SUPABASE_URL || '';
const ANON_KEY      = __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY || __ENV.K6_ANON_KEY || '';
const PERF_EMAIL    = __ENV.K6_PERF_EMAIL || 'perf_stats@perf-test.invalid';
const PERF_PASSWORD = __ENV.K6_PERF_PASSWORD || 'PerfStats123!';
const ACCOUNT_ID    = __ENV.K6_STATS_ACCOUNT_ID || '';
const STRATEGY_ID   = __ENV.K6_STATS_STRATEGY_30K_ID || '';

const PROJECT_REF   = SUPABASE_URL ? SUPABASE_URL.split('//')[1].split('.')[0] : '';
const AUTH_COOKIE   = `sb-${PROJECT_REF}-auth-token`;

const START_DATE = `${new Date().getFullYear() - 2}-01-01`;
const END_DATE   = new Date().toISOString().slice(0, 10);

function signIn() {
  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: PERF_EMAIL, password: PERF_PASSWORD }),
    {
      headers: {
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  if (res.status !== 200) {
    console.error(`Sign-in failed: HTTP ${res.status}`);
    return null;
  }
  return res.body;
}

export function setup() {
  if (!SUPABASE_URL || !ANON_KEY || !ACCOUNT_ID || !STRATEGY_ID) {
    console.error('Missing required env vars. Check .env.test');
    return { seedValid: false };
  }

  const sessionJson = signIn();
  if (!sessionJson) return { seedValid: false };

  // URL-encode so double quotes don't produce invalid cookie bytes
  return { seedValid: true, sessionJson: encodeURIComponent(sessionJson) };
}

export default function (data) {
  if (!data || data.seedValid === false) return;

  const qs = [
    `accountId=${ACCOUNT_ID}`,
    `mode=backtesting`,
    `startDate=${START_DATE}`,
    `endDate=${END_DATE}`,
    `strategyId=${STRATEGY_ID}`,
    `accountBalance=50000`,
    `execution=executed`,
    `market=all`,
    `includeCompactTrades=true`,  // triggers parallel pagination fetch
  ].join('&');

  const res = http.get(`${APP_URL}/api/dashboard-stats?${qs}`, {
    cookies: { [AUTH_COOKIE]: data.sessionJson },
    timeout: '30s',
  });

  fetchDuration.add(res.timings.duration);
  fetchErrorRate.add(res.status !== 200);

  check(res, {
    'status is 200':          (r) => r.status === 200,
    'compact_trades present': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.compact_trades);
      } catch {
        return false;
      }
    },
    'trade count > 0': (r) => {
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
