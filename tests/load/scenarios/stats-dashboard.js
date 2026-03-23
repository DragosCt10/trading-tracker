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
 *   1. Run seed: psql $DATABASE_URL < tests/load/seed/seed-perf-trades.sql
 *   2. Start dev server: npm run dev
 *   3. Set env vars in .env.test (see below)
 *
 * Required env vars (.env.test):
 *   K6_APP_URL                — app URL, default http://localhost:3000
 *   K6_TOKEN_PUBLIC           — Supabase JWT for the perf-test user
 *   K6_STATS_ACCOUNT_ID       — UUID of the perf-test account (from seed output)
 *   K6_STATS_STRATEGY_30K_ID  — UUID of the 30k-trade strategy (from seed output)
 *   K6_STATS_USER_ID          — UUID of the perf-test user (from seed output)
 *
 * Usage:
 *   k6 run --env-file .env.test tests/load/scenarios/stats-dashboard.js
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

const APP_URL      = __ENV.K6_APP_URL || 'http://localhost:3000';
const TOKEN        = __ENV.K6_TOKEN_PUBLIC;
const ACCOUNT_ID   = __ENV.K6_STATS_ACCOUNT_ID;
const STRATEGY_ID  = __ENV.K6_STATS_STRATEGY_30K_ID;

const START_DATE = `${new Date().getFullYear() - 2}-01-01`;
const END_DATE   = new Date().toISOString().slice(0, 10);

/** Validate seed was run before starting load test. */
export function setup() {
  if (!TOKEN || !ACCOUNT_ID || !STRATEGY_ID) {
    console.error(
      'Missing env vars: K6_TOKEN_PUBLIC, K6_STATS_ACCOUNT_ID, K6_STATS_STRATEGY_30K_ID\n' +
      'Run seed-perf-trades.sql first and add the UUIDs to .env.test'
    );
    return { seedValid: false };
  }

  // Quick validation: hit the API once to ensure seed data exists
  const validationRes = http.get(
    `${APP_URL}/api/dashboard-stats?` +
      `accountId=${ACCOUNT_ID}&mode=backtesting` +
      `&startDate=${START_DATE}&endDate=${END_DATE}` +
      `&strategyId=${STRATEGY_ID}&accountBalance=50000`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const valid = validationRes.status === 200;
  if (!valid) {
    console.error(`Seed validation failed: HTTP ${validationRes.status}. Run seed-perf-trades.sql first.`);
  }
  return { seedValid: valid };
}

export default function (data) {
  if (data && data.seedValid === false) {
    return; // abort if seed not present
  }

  const params = new URLSearchParams({
    accountId:      ACCOUNT_ID,
    mode:           'backtesting',
    startDate:      START_DATE,
    endDate:        END_DATE,
    strategyId:     STRATEGY_ID,
    accountBalance: '50000',
    execution:      'executed',
    market:         'all',
  });

  const res = http.get(`${APP_URL}/api/dashboard-stats?${params}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  statsDuration.add(res.timings.duration);
  statsErrorRate.add(res.status !== 200);

  check(res, {
    'status is 200':        (r) => r.status === 200,
    'has stats in body':    (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.total_trades === 'number' || typeof body.profit_factor === 'number';
      } catch {
        return false;
      }
    },
  });

  sleep(0.5 + Math.random() * 0.5); // 0.5–1.0s think time between requests
}
