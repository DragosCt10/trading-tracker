/**
 * k6 Load Test: Stats Dashboard API — /api/dashboard-stats
 *
 * Simulates concurrent users loading the strategy stats page.
 * Tests the SQL RPC that aggregates all stats for a given account/strategy.
 *
 * Ramp: 1 VU → 10 VUs → 50 VUs → ramp down
 * Data: 30,000 backtesting_trades (seeded via seed-perf-trades.sql)
 *
 * Pass thresholds:
 *   p95 response time < 2000ms
 *   Error rate < 1%
 *
 * Prerequisites:
 *   1. Run seed: tests/load/seed/seed-perf-trades.sql (sections 1–7)
 *   2. Start dev server: npm run dev
 *   3. Set env vars in .env.test (see below)
 *
 * Required env vars (.env.test):
 *   K6_APP_URL                   — app URL, default http://localhost:3000
 *   NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key
 *   K6_PERF_EMAIL                — perf-test user email
 *   K6_PERF_PASSWORD             — perf-test user password
 *   K6_STATS_ACCOUNT_ID          — UUID of the perf-test account (from seed output)
 *   K6_STATS_STRATEGY_30K_ID     — UUID of the 30k-trade strategy (from seed output)
 *
 * Usage:
 *   source .env.test && k6 run tests/load/scenarios/stats-dashboard.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const statsDuration  = new Trend('stats_api_duration', true);
const statsErrorRate = new Rate('stats_error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // ramp up
    { duration: '2m',  target: 50  },  // sustained load
    { duration: '30s', target: 0   },  // ramp down
  ],
  thresholds: {
    'stats_api_duration': ['p(95)<2000'],
    'stats_error_rate':   ['rate<0.01'],
    'http_req_failed':    ['rate<0.01'],
  },
};

const APP_URL         = __ENV.K6_APP_URL || 'http://localhost:3000';
const SUPABASE_URL    = __ENV.NEXT_PUBLIC_SUPABASE_URL || __ENV.K6_SUPABASE_URL || '';
const ANON_KEY        = __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY || __ENV.K6_ANON_KEY || '';
const PERF_EMAIL      = __ENV.K6_PERF_EMAIL || 'perf_stats@perf-test.invalid';
const PERF_PASSWORD   = __ENV.K6_PERF_PASSWORD || 'PerfStats123!';
const ACCOUNT_ID      = __ENV.K6_STATS_ACCOUNT_ID || '';
const STRATEGY_ID     = __ENV.K6_STATS_STRATEGY_30K_ID || '';

// Derive Supabase project ref from URL → cookie name used by @supabase/ssr
const PROJECT_REF     = SUPABASE_URL ? SUPABASE_URL.split('//')[1].split('.')[0] : '';
const AUTH_COOKIE     = `sb-${PROJECT_REF}-auth-token`;

const START_DATE = `${new Date().getFullYear() - 2}-01-01`;
const END_DATE   = new Date().toISOString().slice(0, 10);

/** Sign in and return the full session JSON string (for use as auth cookie). */
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
    console.error(`Sign-in failed: HTTP ${res.status} — ${res.body}`);
    return null;
  }

  // @supabase/ssr expects the full session JSON stored in the auth cookie.
  // URL-encode so double quotes don't produce invalid cookie bytes.
  return encodeURIComponent(res.body);
}

/** Validate seed was run before starting load test. */
export function setup() {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error('Missing SUPABASE_URL (NEXT_PUBLIC_SUPABASE_URL or K6_SUPABASE_URL) in .env.test');
    return { seedValid: false };
  }

  if (!ACCOUNT_ID || !STRATEGY_ID) {
    console.error(
      'Missing env vars: K6_STATS_ACCOUNT_ID, K6_STATS_STRATEGY_30K_ID\n' +
      'Run seed-perf-trades.sql first and add the UUIDs to .env.test'
    );
    return { seedValid: false };
  }

  const sessionJson = signIn();
  if (!sessionJson) {
    return { seedValid: false };
  }

  // Quick validation: hit the API once to ensure auth + seed data work
  const validationRes = http.get(
    `${APP_URL}/api/dashboard-stats?` +
      `accountId=${ACCOUNT_ID}&mode=backtesting` +
      `&startDate=${START_DATE}&endDate=${END_DATE}` +
      `&strategyId=${STRATEGY_ID}&accountBalance=50000`,
    {
      cookies: { [AUTH_COOKIE]: sessionJson },
    }
  );

  if (validationRes.status !== 200) {
    console.error(
      `Seed validation failed: HTTP ${validationRes.status}. ` +
      `Body: ${validationRes.body.slice(0, 200)}`
    );
    return { seedValid: false, sessionJson };
  }

  console.log(`Seed validated — auth cookie: ${AUTH_COOKIE}`);
  return { seedValid: true, sessionJson };
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
  ].join('&');

  const res = http.get(`${APP_URL}/api/dashboard-stats?${qs}`, {
    cookies: { [AUTH_COOKIE]: data.sessionJson },
  });

  statsDuration.add(res.timings.duration);
  statsErrorRate.add(res.status !== 200);

  check(res, {
    'status is 200':     (r) => r.status === 200,
    'has stats in body': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.core !== undefined || body.macro !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(0.5 + Math.random() * 0.5); // 0.5–1.0s think time between requests
}
