-- ============================================================
-- Seed: Performance Test Trades
-- ============================================================
-- Creates a perf-test user, account, and 3 strategies with:
--   Strategy A: 4,999 trades  (cache-fast path — below ≤5k cliff)
--   Strategy B: 5,001 trades  (RPC slow path — above ≤5k cliff)
--   Strategy C: 30,000 trades (primary load test target)
--
-- All trades are synthetic backtesting_trades with realistic distributions.
-- Tagged with @perf-test.invalid so teardown.sql can clean them up.
--
-- IMPORTANT: After running this seed, copy the printed UUIDs into .env.test:
--   K6_STATS_USER_ID
--   K6_STATS_ACCOUNT_ID
--   K6_STATS_STRATEGY_5K_ID
--   K6_STATS_STRATEGY_5K1_ID
--   K6_STATS_STRATEGY_30K_ID
--   PERF_STRATEGY_SLUG (for Playwright + Lighthouse)
--
-- Usage:
--   psql "$DATABASE_URL" -f tests/load/seed/seed-perf-trades.sql
--   or paste into Supabase SQL editor
-- ============================================================

BEGIN;

-- ── 1. Create perf-test user (if not exists) ─────────────────────────────
-- Note: In Supabase, auth.users requires insertion via the auth schema.
-- If running directly in Supabase SQL editor, use the dashboard to create
-- the user first (email: perf_stats@perf-test.invalid, password: PerfStats123!),
-- then set K6_STATS_USER_ID to the created user's UUID and skip this block.
-- For CI/CD via psql with service role, this INSERT works directly.

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  '00000000-perf-stat-user-000000000001',
  'perf_stats@perf-test.invalid',
  crypt('PerfStats123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- ── 2. Create perf-test account ──────────────────────────────────────────
INSERT INTO accounts (
  id,
  user_id,
  name,
  balance,
  currency,
  mode,
  created_at
) VALUES (
  '00000000-perf-stat-acct-000000000001',
  '00000000-perf-stat-user-000000000001',
  'Perf Test Account',
  50000.00,
  'USD',
  'backtesting',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ── 3. Create 3 perf-test strategies ────────────────────────────────────
INSERT INTO strategies (
  id,
  user_id,
  account_id,
  name,
  slug,
  description,
  created_at
) VALUES
  (
    '00000000-perf-stat-str1-000000000001',
    '00000000-perf-stat-user-000000000001',
    '00000000-perf-stat-acct-000000000001',
    'Perf Test — 4999 Trades (Cache Path)',
    'perf-test-4999',
    'Scalability test strategy: 4,999 trades (below ≤5k cache-first cliff)',
    NOW()
  ),
  (
    '00000000-perf-stat-str2-000000000002',
    '00000000-perf-stat-user-000000000001',
    '00000000-perf-stat-acct-000000000001',
    'Perf Test — 5001 Trades (RPC Path)',
    'perf-test-5001',
    'Scalability test strategy: 5,001 trades (above ≤5k cliff, forces RPC)',
    NOW()
  ),
  (
    '00000000-perf-stat-str3-000000000003',
    '00000000-perf-stat-user-000000000001',
    '00000000-perf-stat-acct-000000000001',
    'Perf Test — 30000 Trades (Load Test)',
    'perf-test-30k',
    'Scalability test strategy: 30,000 trades (primary load test target)',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ── 4. Generate trades via generate_series ───────────────────────────────
-- Markets: realistic mix across Forex, Indices, Crypto, Commodities
-- Outcomes: ~60% Win, ~25% Lose, ~15% BE
-- Dates: spread over last 2 years

-- Helper: outcome array for cycling (60% W, 25% L, 15% BE)
-- Pattern of 20: 12 Win, 5 Lose, 3 BE = 60/25/15
DO $$
DECLARE
  outcomes TEXT[] := ARRAY[
    'Win','Win','Win','Win','Win','Win',
    'Win','Win','Win','Win','Win','Win',
    'Lose','Lose','Lose','Lose','Lose',
    'BE','BE','BE'
  ];
  markets TEXT[] := ARRAY[
    'EURUSD','GBPUSD','NAS100','BTCUSD','XAUUSD',
    'USDJPY','AUDUSD','SPX500','ETHUSD','XAGUSD'
  ];
  setups TEXT[] := ARRAY['BOS','CHoCH','FVG','OB','LIQ'];
  sessions TEXT[] := ARRAY['New York','London','Tokyo','Sydney'];
  days TEXT[] := ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'];
  directions TEXT[] := ARRAY['Long','Long','Long','Short','Short']; -- 60% long

  -- Strategy A: 4,999 trades
  v_strat_a UUID := '00000000-perf-stat-str1-000000000001';
  -- Strategy B: 5,001 trades
  v_strat_b UUID := '00000000-perf-stat-str2-000000000002';
  -- Strategy C: 30,000 trades
  v_strat_c UUID := '00000000-perf-stat-str3-000000000003';

  v_user    UUID := '00000000-perf-stat-user-000000000001';
  v_account UUID := '00000000-perf-stat-acct-000000000001';

  v_outcome TEXT;
  v_market  TEXT;
  v_setup   TEXT;
  v_session TEXT;
  v_dir     TEXT;
  v_date    DATE;
  v_rr      NUMERIC;
  v_risk    NUMERIC;
  v_profit  NUMERIC;
  i         INTEGER;
BEGIN

  -- ── Strategy A: 4,999 trades ──────────────────────────────────────────
  FOR i IN 1..4999 LOOP
    v_outcome := outcomes[1 + ((i - 1) % 20)];
    v_market  := markets [1 + ((i - 1) % 10)];
    v_setup   := setups  [1 + ((i - 1) % 5)];
    v_session := sessions[1 + ((i - 1) % 4)];
    v_dir     := directions[1 + ((i - 1) % 5)];
    v_date    := CURRENT_DATE - ((i % 700) || ' days')::INTERVAL;
    v_rr      := ROUND((1.5 + (i % 7) * 0.5)::NUMERIC, 1);
    v_risk    := CASE (i % 7) WHEN 0 THEN 0.25 WHEN 1 THEN 0.3 WHEN 2 THEN 0.5 WHEN 3 THEN 0.5 WHEN 4 THEN 0.5 WHEN 5 THEN 0.7 ELSE 1.0 END;
    v_profit  := CASE v_outcome WHEN 'Win' THEN v_risk * v_rr WHEN 'Lose' THEN -v_risk ELSE 0 END;

    INSERT INTO backtesting_trades (
      user_id, account_id, strategy_id, mode,
      trade_date, trade_time, day_of_week, market, setup_type,
      liquidity, sl_size, direction, trade_outcome, session,
      break_even, reentry, news_related, mss,
      risk_reward_ratio, risk_reward_ratio_long, local_high_low,
      risk_per_trade, calculated_profit, pnl_percentage,
      quarter, evaluation, partials_taken, executed,
      launch_hour, displacement_size, trend
    ) VALUES (
      v_user, v_account, v_strat_a, 'backtesting',
      v_date,
      LPAD((i % 24)::TEXT, 2, '0') || ':' || LPAD((i % 60)::TEXT, 2, '0'),
      v_day := days[1 + ((i-1) % 5)],
      v_market, v_setup,
      CASE (i % 2) WHEN 0 THEN 'SSL' ELSE 'BSL' END,
      ROUND((0.5 + (i % 10) * 0.5)::NUMERIC, 1),
      v_dir, v_outcome, v_session,
      v_outcome = 'BE', (i % 10) = 0, (i % 7) = 0,
      CASE (i % 3) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' ELSE 'None' END,
      v_rr, v_rr, (i % 5) = 0,
      v_risk, v_profit, v_profit,
      'Q' || CEIL(EXTRACT(MONTH FROM v_date) / 3.0)::INTEGER,
      CASE (i % 5) WHEN 0 THEN 'A+' WHEN 1 THEN 'A' WHEN 2 THEN 'B' WHEN 3 THEN 'C' ELSE 'Not Evaluated' END,
      (i % 3) = 0, TRUE,
      (i % 20) = 0, (i % 20) + 5,
      CASE (i % 4) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' WHEN 2 THEN 'Ranging' ELSE NULL END
    );
  END LOOP;

  -- ── Strategy B: 5,001 trades ──────────────────────────────────────────
  FOR i IN 1..5001 LOOP
    v_outcome := outcomes[1 + ((i - 1) % 20)];
    v_market  := markets [1 + ((i - 1) % 10)];
    v_setup   := setups  [1 + ((i - 1) % 5)];
    v_session := sessions[1 + ((i - 1) % 4)];
    v_dir     := directions[1 + ((i - 1) % 5)];
    v_date    := CURRENT_DATE - ((i % 700) || ' days')::INTERVAL;
    v_rr      := ROUND((1.5 + (i % 7) * 0.5)::NUMERIC, 1);
    v_risk    := CASE (i % 7) WHEN 0 THEN 0.25 WHEN 1 THEN 0.3 WHEN 2 THEN 0.5 WHEN 3 THEN 0.5 WHEN 4 THEN 0.5 WHEN 5 THEN 0.7 ELSE 1.0 END;
    v_profit  := CASE v_outcome WHEN 'Win' THEN v_risk * v_rr WHEN 'Lose' THEN -v_risk ELSE 0 END;

    INSERT INTO backtesting_trades (
      user_id, account_id, strategy_id, mode,
      trade_date, trade_time, day_of_week, market, setup_type,
      liquidity, sl_size, direction, trade_outcome, session,
      break_even, reentry, news_related, mss,
      risk_reward_ratio, risk_reward_ratio_long, local_high_low,
      risk_per_trade, calculated_profit, pnl_percentage,
      quarter, evaluation, partials_taken, executed,
      launch_hour, displacement_size, trend
    ) VALUES (
      v_user, v_account, v_strat_b, 'backtesting',
      v_date,
      LPAD((i % 24)::TEXT, 2, '0') || ':' || LPAD((i % 60)::TEXT, 2, '0'),
      days[1 + ((i-1) % 5)],
      v_market, v_setup,
      CASE (i % 2) WHEN 0 THEN 'SSL' ELSE 'BSL' END,
      ROUND((0.5 + (i % 10) * 0.5)::NUMERIC, 1),
      v_dir, v_outcome, v_session,
      v_outcome = 'BE', (i % 10) = 0, (i % 7) = 0,
      CASE (i % 3) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' ELSE 'None' END,
      v_rr, v_rr, (i % 5) = 0,
      v_risk, v_profit, v_profit,
      'Q' || CEIL(EXTRACT(MONTH FROM v_date) / 3.0)::INTEGER,
      CASE (i % 5) WHEN 0 THEN 'A+' WHEN 1 THEN 'A' WHEN 2 THEN 'B' WHEN 3 THEN 'C' ELSE 'Not Evaluated' END,
      (i % 3) = 0, TRUE,
      (i % 20) = 0, (i % 20) + 5,
      CASE (i % 4) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' WHEN 2 THEN 'Ranging' ELSE NULL END
    );
  END LOOP;

  -- ── Strategy C: 30,000 trades ─────────────────────────────────────────
  FOR i IN 1..30000 LOOP
    v_outcome := outcomes[1 + ((i - 1) % 20)];
    v_market  := markets [1 + ((i - 1) % 10)];
    v_setup   := setups  [1 + ((i - 1) % 5)];
    v_session := sessions[1 + ((i - 1) % 4)];
    v_dir     := directions[1 + ((i - 1) % 5)];
    v_date    := CURRENT_DATE - ((i % 700) || ' days')::INTERVAL;
    v_rr      := ROUND((1.5 + (i % 7) * 0.5)::NUMERIC, 1);
    v_risk    := CASE (i % 7) WHEN 0 THEN 0.25 WHEN 1 THEN 0.3 WHEN 2 THEN 0.5 WHEN 3 THEN 0.5 WHEN 4 THEN 0.5 WHEN 5 THEN 0.7 ELSE 1.0 END;
    v_profit  := CASE v_outcome WHEN 'Win' THEN v_risk * v_rr WHEN 'Lose' THEN -v_risk ELSE 0 END;

    INSERT INTO backtesting_trades (
      user_id, account_id, strategy_id, mode,
      trade_date, trade_time, day_of_week, market, setup_type,
      liquidity, sl_size, direction, trade_outcome, session,
      break_even, reentry, news_related, mss,
      risk_reward_ratio, risk_reward_ratio_long, local_high_low,
      risk_per_trade, calculated_profit, pnl_percentage,
      quarter, evaluation, partials_taken, executed,
      launch_hour, displacement_size, trend
    ) VALUES (
      v_user, v_account, v_strat_c, 'backtesting',
      v_date,
      LPAD((i % 24)::TEXT, 2, '0') || ':' || LPAD((i % 60)::TEXT, 2, '0'),
      days[1 + ((i-1) % 5)],
      v_market, v_setup,
      CASE (i % 2) WHEN 0 THEN 'SSL' ELSE 'BSL' END,
      ROUND((0.5 + (i % 10) * 0.5)::NUMERIC, 1),
      v_dir, v_outcome, v_session,
      v_outcome = 'BE', (i % 10) = 0, (i % 7) = 0,
      CASE (i % 3) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' ELSE 'None' END,
      v_rr, v_rr, (i % 5) = 0,
      v_risk, v_profit, v_profit,
      'Q' || CEIL(EXTRACT(MONTH FROM v_date) / 3.0)::INTEGER,
      CASE (i % 5) WHEN 0 THEN 'A+' WHEN 1 THEN 'A' WHEN 2 THEN 'B' WHEN 3 THEN 'C' ELSE 'Not Evaluated' END,
      (i % 3) = 0, TRUE,
      (i % 20) = 0, (i % 20) + 5,
      CASE (i % 4) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' WHEN 2 THEN 'Ranging' ELSE NULL END
    );
  END LOOP;

END $$;

-- ── 5. Verify seed counts ────────────────────────────────────────────────
SELECT
  s.name,
  s.slug,
  s.id AS strategy_id,
  COUNT(t.id) AS trade_count
FROM strategies s
LEFT JOIN backtesting_trades t
  ON t.strategy_id = s.id
  AND t.user_id = '00000000-perf-stat-user-000000000001'
WHERE s.user_id = '00000000-perf-stat-user-000000000001'
GROUP BY s.id, s.name, s.slug
ORDER BY trade_count;

-- Expected output:
-- | name                              | trade_count |
-- | Perf Test — 4999 Trades ...       | 4999        |
-- | Perf Test — 5001 Trades ...       | 5001        |
-- | Perf Test — 30000 Trades ...      | 30000       |

-- ── Add to .env.test after running this seed: ────────────────────────────
-- K6_STATS_USER_ID=00000000-perf-stat-user-000000000001
-- K6_STATS_ACCOUNT_ID=00000000-perf-stat-acct-000000000001
-- K6_STATS_STRATEGY_5K_ID=00000000-perf-stat-str1-000000000001
-- K6_STATS_STRATEGY_5K1_ID=00000000-perf-stat-str2-000000000002
-- K6_STATS_STRATEGY_30K_ID=00000000-perf-stat-str3-000000000003
-- PERF_STRATEGY_SLUG_4999=perf-test-4999
-- PERF_STRATEGY_SLUG_5001=perf-test-5001
-- PERF_STRATEGY_SLUG_30K=perf-test-30k

COMMIT;
