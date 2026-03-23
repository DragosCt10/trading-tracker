-- ============================================================
-- Seed: Performance Test Trades
-- ============================================================
-- Creates a perf-test user, account, and 3 strategies with:
--   Strategy A: 4,999 trades  (cache-fast path — below ≤5k cliff)
--   Strategy B: 5,001 trades  (RPC slow path — above ≤5k cliff)
--   Strategy C: 30,000 trades (primary load test target)
--
-- HOW TO RUN: Paste this file in sections into the Supabase SQL editor,
-- one section at a time (each separated by a blank line + comment).
-- The file is split into 6 independent statements — no transaction wrapper.
--
-- Usage:
--   psql "$DATABASE_URL" -f tests/load/seed/seed-perf-trades.sql
--   or paste section-by-section into Supabase SQL editor
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- SECTION 1: User + Account + Strategies  (run first)
-- ════════════════════════════════════════════════════════════

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, role, aud
) VALUES (
  'cafef00d-0000-0000-0000-000000000001',
  'perf_stats@perf-test.invalid',
  crypt('PerfStats123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}', '{}',
  NOW(), NOW(), 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO account_settings (
  id, user_id, name, account_balance, currency, mode, created_at
) VALUES (
  'cafef00d-0000-0000-0000-000000000002',
  'cafef00d-0000-0000-0000-000000000001',
  'Perf Test Account', 50000.00, 'USD', 'backtesting', NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO strategies (
  id, user_id, account_id, name, slug, is_active, extra_cards, created_at
) VALUES
  ('cafef00d-0000-0000-0000-000000000003',
   'cafef00d-0000-0000-0000-000000000001',
   'cafef00d-0000-0000-0000-000000000002',
   'Perf Test — 4999 Trades (Cache Path)', 'perf-test-4999', false, '{}', NOW()),
  ('cafef00d-0000-0000-0000-000000000004',
   'cafef00d-0000-0000-0000-000000000001',
   'cafef00d-0000-0000-0000-000000000002',
   'Perf Test — 5001 Trades (RPC Path)', 'perf-test-5001', false, '{}', NOW()),
  ('cafef00d-0000-0000-0000-000000000005',
   'cafef00d-0000-0000-0000-000000000001',
   'cafef00d-0000-0000-0000-000000000002',
   'Perf Test — 30000 Trades (Load Test)', 'perf-test-30k', false, '{}', NOW())
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- SECTION 2: Disable triggers + Strategy A — 4,999 trades
-- (Triggers fire per-row and cause timeouts at scale.
--  Re-enable in Section 6 after all trades are inserted.)
-- ════════════════════════════════════════════════════════════

ALTER TABLE backtesting_trades DISABLE TRIGGER USER;

INSERT INTO backtesting_trades (
  user_id, account_id, strategy_id, mode,
  trade_date, trade_time, day_of_week, market, setup_type,
  liquidity, sl_size, direction, trade_outcome, session,
  break_even, reentry, news_related, mss,
  risk_reward_ratio, risk_reward_ratio_long, local_high_low,
  risk_per_trade, calculated_profit, pnl_percentage,
  quarter, evaluation, partials_taken, executed,
  launch_hour, displacement_size, trend
)
SELECT
  'cafef00d-0000-0000-0000-000000000001'::uuid,
  'cafef00d-0000-0000-0000-000000000002'::uuid,
  'cafef00d-0000-0000-0000-000000000003'::uuid,
  'backtesting',
  CURRENT_DATE - ((i % 700) || ' days')::INTERVAL,
  (LPAD((i % 24)::TEXT, 2, '0') || ':' || LPAD((i % 60)::TEXT, 2, '0'))::TIME,
  (ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'])[1 + ((i-1) % 5)],
  (ARRAY['EURUSD','GBPUSD','NAS100','BTCUSD','XAUUSD','USDJPY','AUDUSD','SPX500','ETHUSD','XAGUSD'])[1 + ((i-1) % 10)],
  (ARRAY['BOS','CHoCH','FVG','OB','LIQ'])[1 + ((i-1) % 5)],
  CASE (i % 2) WHEN 0 THEN 'SSL' ELSE 'BSL' END,
  ROUND((0.5 + (i % 10) * 0.5)::NUMERIC, 1),
  (ARRAY['Long','Long','Long','Short','Short'])[1 + ((i-1) % 5)],
  outcome,
  (ARRAY['New York','London','Tokyo','Sydney'])[1 + ((i-1) % 4)],
  outcome = 'BE', (i % 10) = 0, (i % 7) = 0,
  CASE (i % 3) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' ELSE 'None' END,
  rr, rr, (i % 5) = 0,
  risk,
  CASE outcome WHEN 'Win' THEN risk * rr WHEN 'Lose' THEN -risk ELSE 0 END,
  CASE outcome WHEN 'Win' THEN risk * rr WHEN 'Lose' THEN -risk ELSE 0 END,
  'Q' || CEIL(EXTRACT(MONTH FROM (CURRENT_DATE - ((i % 700) || ' days')::INTERVAL)) / 3.0)::INTEGER,
  (ARRAY['A+','A','B','C','Not Evaluated'])[1 + ((i-1) % 5)],
  (i % 3) = 0, TRUE,
  (i % 20) = 0, (i % 20) + 5,
  CASE (i % 4) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' WHEN 2 THEN 'Ranging' ELSE NULL END
FROM generate_series(1, 4999) AS gs(i)
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['Win','Win','Win','Win','Win','Win','Win','Win','Win','Win','Win','Win',
           'Lose','Lose','Lose','Lose','Lose','BE','BE','BE'])[1 + ((i-1) % 20)] AS outcome,
    ROUND((1.5 + (i % 7) * 0.5)::NUMERIC, 1)                                    AS rr,
    CASE (i % 7) WHEN 0 THEN 0.25 WHEN 1 THEN 0.3
      WHEN 2 THEN 0.5 WHEN 3 THEN 0.5 WHEN 4 THEN 0.5 WHEN 5 THEN 0.7 ELSE 1.0 END AS risk
) AS d;

-- ════════════════════════════════════════════════════════════
-- SECTION 3: Strategy B — 5,001 trades
-- ════════════════════════════════════════════════════════════

INSERT INTO backtesting_trades (
  user_id, account_id, strategy_id, mode,
  trade_date, trade_time, day_of_week, market, setup_type,
  liquidity, sl_size, direction, trade_outcome, session,
  break_even, reentry, news_related, mss,
  risk_reward_ratio, risk_reward_ratio_long, local_high_low,
  risk_per_trade, calculated_profit, pnl_percentage,
  quarter, evaluation, partials_taken, executed,
  launch_hour, displacement_size, trend
)
SELECT
  'cafef00d-0000-0000-0000-000000000001'::uuid,
  'cafef00d-0000-0000-0000-000000000002'::uuid,
  'cafef00d-0000-0000-0000-000000000004'::uuid,
  'backtesting',
  CURRENT_DATE - ((i % 700) || ' days')::INTERVAL,
  (LPAD((i % 24)::TEXT, 2, '0') || ':' || LPAD((i % 60)::TEXT, 2, '0'))::TIME,
  (ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'])[1 + ((i-1) % 5)],
  (ARRAY['EURUSD','GBPUSD','NAS100','BTCUSD','XAUUSD','USDJPY','AUDUSD','SPX500','ETHUSD','XAGUSD'])[1 + ((i-1) % 10)],
  (ARRAY['BOS','CHoCH','FVG','OB','LIQ'])[1 + ((i-1) % 5)],
  CASE (i % 2) WHEN 0 THEN 'SSL' ELSE 'BSL' END,
  ROUND((0.5 + (i % 10) * 0.5)::NUMERIC, 1),
  (ARRAY['Long','Long','Long','Short','Short'])[1 + ((i-1) % 5)],
  outcome,
  (ARRAY['New York','London','Tokyo','Sydney'])[1 + ((i-1) % 4)],
  outcome = 'BE', (i % 10) = 0, (i % 7) = 0,
  CASE (i % 3) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' ELSE 'None' END,
  rr, rr, (i % 5) = 0,
  risk,
  CASE outcome WHEN 'Win' THEN risk * rr WHEN 'Lose' THEN -risk ELSE 0 END,
  CASE outcome WHEN 'Win' THEN risk * rr WHEN 'Lose' THEN -risk ELSE 0 END,
  'Q' || CEIL(EXTRACT(MONTH FROM (CURRENT_DATE - ((i % 700) || ' days')::INTERVAL)) / 3.0)::INTEGER,
  (ARRAY['A+','A','B','C','Not Evaluated'])[1 + ((i-1) % 5)],
  (i % 3) = 0, TRUE,
  (i % 20) = 0, (i % 20) + 5,
  CASE (i % 4) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' WHEN 2 THEN 'Ranging' ELSE NULL END
FROM generate_series(1, 5001) AS gs(i)
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['Win','Win','Win','Win','Win','Win','Win','Win','Win','Win','Win','Win',
           'Lose','Lose','Lose','Lose','Lose','BE','BE','BE'])[1 + ((i-1) % 20)] AS outcome,
    ROUND((1.5 + (i % 7) * 0.5)::NUMERIC, 1)                                    AS rr,
    CASE (i % 7) WHEN 0 THEN 0.25 WHEN 1 THEN 0.3
      WHEN 2 THEN 0.5 WHEN 3 THEN 0.5 WHEN 4 THEN 0.5 WHEN 5 THEN 0.7 ELSE 1.0 END AS risk
) AS d;

-- ════════════════════════════════════════════════════════════
-- SECTION 4: Strategy C — 30,000 trades (batch 1: rows 1–10000)
-- ════════════════════════════════════════════════════════════

INSERT INTO backtesting_trades (
  user_id, account_id, strategy_id, mode,
  trade_date, trade_time, day_of_week, market, setup_type,
  liquidity, sl_size, direction, trade_outcome, session,
  break_even, reentry, news_related, mss,
  risk_reward_ratio, risk_reward_ratio_long, local_high_low,
  risk_per_trade, calculated_profit, pnl_percentage,
  quarter, evaluation, partials_taken, executed,
  launch_hour, displacement_size, trend
)
SELECT
  'cafef00d-0000-0000-0000-000000000001'::uuid,
  'cafef00d-0000-0000-0000-000000000002'::uuid,
  'cafef00d-0000-0000-0000-000000000005'::uuid,
  'backtesting',
  CURRENT_DATE - ((i % 700) || ' days')::INTERVAL,
  (LPAD((i % 24)::TEXT, 2, '0') || ':' || LPAD((i % 60)::TEXT, 2, '0'))::TIME,
  (ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'])[1 + ((i-1) % 5)],
  (ARRAY['EURUSD','GBPUSD','NAS100','BTCUSD','XAUUSD','USDJPY','AUDUSD','SPX500','ETHUSD','XAGUSD'])[1 + ((i-1) % 10)],
  (ARRAY['BOS','CHoCH','FVG','OB','LIQ'])[1 + ((i-1) % 5)],
  CASE (i % 2) WHEN 0 THEN 'SSL' ELSE 'BSL' END,
  ROUND((0.5 + (i % 10) * 0.5)::NUMERIC, 1),
  (ARRAY['Long','Long','Long','Short','Short'])[1 + ((i-1) % 5)],
  outcome,
  (ARRAY['New York','London','Tokyo','Sydney'])[1 + ((i-1) % 4)],
  outcome = 'BE', (i % 10) = 0, (i % 7) = 0,
  CASE (i % 3) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' ELSE 'None' END,
  rr, rr, (i % 5) = 0,
  risk,
  CASE outcome WHEN 'Win' THEN risk * rr WHEN 'Lose' THEN -risk ELSE 0 END,
  CASE outcome WHEN 'Win' THEN risk * rr WHEN 'Lose' THEN -risk ELSE 0 END,
  'Q' || CEIL(EXTRACT(MONTH FROM (CURRENT_DATE - ((i % 700) || ' days')::INTERVAL)) / 3.0)::INTEGER,
  (ARRAY['A+','A','B','C','Not Evaluated'])[1 + ((i-1) % 5)],
  (i % 3) = 0, TRUE,
  (i % 20) = 0, (i % 20) + 5,
  CASE (i % 4) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' WHEN 2 THEN 'Ranging' ELSE NULL END
FROM generate_series(1, 10000) AS gs(i)
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['Win','Win','Win','Win','Win','Win','Win','Win','Win','Win','Win','Win',
           'Lose','Lose','Lose','Lose','Lose','BE','BE','BE'])[1 + ((i-1) % 20)] AS outcome,
    ROUND((1.5 + (i % 7) * 0.5)::NUMERIC, 1)                                    AS rr,
    CASE (i % 7) WHEN 0 THEN 0.25 WHEN 1 THEN 0.3
      WHEN 2 THEN 0.5 WHEN 3 THEN 0.5 WHEN 4 THEN 0.5 WHEN 5 THEN 0.7 ELSE 1.0 END AS risk
) AS d;

-- ════════════════════════════════════════════════════════════
-- SECTION 5: Strategy C — 30,000 trades (batch 2: rows 10001–20000)
-- ════════════════════════════════════════════════════════════

INSERT INTO backtesting_trades (
  user_id, account_id, strategy_id, mode,
  trade_date, trade_time, day_of_week, market, setup_type,
  liquidity, sl_size, direction, trade_outcome, session,
  break_even, reentry, news_related, mss,
  risk_reward_ratio, risk_reward_ratio_long, local_high_low,
  risk_per_trade, calculated_profit, pnl_percentage,
  quarter, evaluation, partials_taken, executed,
  launch_hour, displacement_size, trend
)
SELECT
  'cafef00d-0000-0000-0000-000000000001'::uuid,
  'cafef00d-0000-0000-0000-000000000002'::uuid,
  'cafef00d-0000-0000-0000-000000000005'::uuid,
  'backtesting',
  CURRENT_DATE - ((i % 700) || ' days')::INTERVAL,
  (LPAD((i % 24)::TEXT, 2, '0') || ':' || LPAD((i % 60)::TEXT, 2, '0'))::TIME,
  (ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'])[1 + ((i-1) % 5)],
  (ARRAY['EURUSD','GBPUSD','NAS100','BTCUSD','XAUUSD','USDJPY','AUDUSD','SPX500','ETHUSD','XAGUSD'])[1 + ((i-1) % 10)],
  (ARRAY['BOS','CHoCH','FVG','OB','LIQ'])[1 + ((i-1) % 5)],
  CASE (i % 2) WHEN 0 THEN 'SSL' ELSE 'BSL' END,
  ROUND((0.5 + (i % 10) * 0.5)::NUMERIC, 1),
  (ARRAY['Long','Long','Long','Short','Short'])[1 + ((i-1) % 5)],
  outcome,
  (ARRAY['New York','London','Tokyo','Sydney'])[1 + ((i-1) % 4)],
  outcome = 'BE', (i % 10) = 0, (i % 7) = 0,
  CASE (i % 3) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' ELSE 'None' END,
  rr, rr, (i % 5) = 0,
  risk,
  CASE outcome WHEN 'Win' THEN risk * rr WHEN 'Lose' THEN -risk ELSE 0 END,
  CASE outcome WHEN 'Win' THEN risk * rr WHEN 'Lose' THEN -risk ELSE 0 END,
  'Q' || CEIL(EXTRACT(MONTH FROM (CURRENT_DATE - ((i % 700) || ' days')::INTERVAL)) / 3.0)::INTEGER,
  (ARRAY['A+','A','B','C','Not Evaluated'])[1 + ((i-1) % 5)],
  (i % 3) = 0, TRUE,
  (i % 20) = 0, (i % 20) + 5,
  CASE (i % 4) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' WHEN 2 THEN 'Ranging' ELSE NULL END
FROM generate_series(10001, 20000) AS gs(i)
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['Win','Win','Win','Win','Win','Win','Win','Win','Win','Win','Win','Win',
           'Lose','Lose','Lose','Lose','Lose','BE','BE','BE'])[1 + ((i-1) % 20)] AS outcome,
    ROUND((1.5 + (i % 7) * 0.5)::NUMERIC, 1)                                    AS rr,
    CASE (i % 7) WHEN 0 THEN 0.25 WHEN 1 THEN 0.3
      WHEN 2 THEN 0.5 WHEN 3 THEN 0.5 WHEN 4 THEN 0.5 WHEN 5 THEN 0.7 ELSE 1.0 END AS risk
) AS d;

-- ════════════════════════════════════════════════════════════
-- SECTION 6: Strategy C — 30,000 trades (batch 3: rows 20001–30000)
-- ════════════════════════════════════════════════════════════

INSERT INTO backtesting_trades (
  user_id, account_id, strategy_id, mode,
  trade_date, trade_time, day_of_week, market, setup_type,
  liquidity, sl_size, direction, trade_outcome, session,
  break_even, reentry, news_related, mss,
  risk_reward_ratio, risk_reward_ratio_long, local_high_low,
  risk_per_trade, calculated_profit, pnl_percentage,
  quarter, evaluation, partials_taken, executed,
  launch_hour, displacement_size, trend
)
SELECT
  'cafef00d-0000-0000-0000-000000000001'::uuid,
  'cafef00d-0000-0000-0000-000000000002'::uuid,
  'cafef00d-0000-0000-0000-000000000005'::uuid,
  'backtesting',
  CURRENT_DATE - ((i % 700) || ' days')::INTERVAL,
  (LPAD((i % 24)::TEXT, 2, '0') || ':' || LPAD((i % 60)::TEXT, 2, '0'))::TIME,
  (ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'])[1 + ((i-1) % 5)],
  (ARRAY['EURUSD','GBPUSD','NAS100','BTCUSD','XAUUSD','USDJPY','AUDUSD','SPX500','ETHUSD','XAGUSD'])[1 + ((i-1) % 10)],
  (ARRAY['BOS','CHoCH','FVG','OB','LIQ'])[1 + ((i-1) % 5)],
  CASE (i % 2) WHEN 0 THEN 'SSL' ELSE 'BSL' END,
  ROUND((0.5 + (i % 10) * 0.5)::NUMERIC, 1),
  (ARRAY['Long','Long','Long','Short','Short'])[1 + ((i-1) % 5)],
  outcome,
  (ARRAY['New York','London','Tokyo','Sydney'])[1 + ((i-1) % 4)],
  outcome = 'BE', (i % 10) = 0, (i % 7) = 0,
  CASE (i % 3) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' ELSE 'None' END,
  rr, rr, (i % 5) = 0,
  risk,
  CASE outcome WHEN 'Win' THEN risk * rr WHEN 'Lose' THEN -risk ELSE 0 END,
  CASE outcome WHEN 'Win' THEN risk * rr WHEN 'Lose' THEN -risk ELSE 0 END,
  'Q' || CEIL(EXTRACT(MONTH FROM (CURRENT_DATE - ((i % 700) || ' days')::INTERVAL)) / 3.0)::INTEGER,
  (ARRAY['A+','A','B','C','Not Evaluated'])[1 + ((i-1) % 5)],
  (i % 3) = 0, TRUE,
  (i % 20) = 0, (i % 20) + 5,
  CASE (i % 4) WHEN 0 THEN 'Bullish' WHEN 1 THEN 'Bearish' WHEN 2 THEN 'Ranging' ELSE NULL END
FROM generate_series(20001, 30000) AS gs(i)
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['Win','Win','Win','Win','Win','Win','Win','Win','Win','Win','Win','Win',
           'Lose','Lose','Lose','Lose','Lose','BE','BE','BE'])[1 + ((i-1) % 20)] AS outcome,
    ROUND((1.5 + (i % 7) * 0.5)::NUMERIC, 1)                                    AS rr,
    CASE (i % 7) WHEN 0 THEN 0.25 WHEN 1 THEN 0.3
      WHEN 2 THEN 0.5 WHEN 3 THEN 0.5 WHEN 4 THEN 0.5 WHEN 5 THEN 0.7 ELSE 1.0 END AS risk
) AS d;

-- ════════════════════════════════════════════════════════════
-- SECTION 6: Re-enable triggers
-- ════════════════════════════════════════════════════════════

ALTER TABLE backtesting_trades ENABLE TRIGGER USER;

-- ════════════════════════════════════════════════════════════
-- SECTION 7: Verify counts
-- ════════════════════════════════════════════════════════════

SELECT
  s.name, s.slug, s.id AS strategy_id, COUNT(t.id) AS trade_count
FROM strategies s
LEFT JOIN backtesting_trades t
  ON t.strategy_id = s.id
  AND t.user_id = 'cafef00d-0000-0000-0000-000000000001'
WHERE s.user_id = 'cafef00d-0000-0000-0000-000000000001'
GROUP BY s.id, s.name, s.slug
ORDER BY trade_count;

-- Expected:
-- | Perf Test — 4999 ...  | 4999  |
-- | Perf Test — 5001 ...  | 5001  |
-- | Perf Test — 30000 ... | 30000 |

-- ── Add to .env.test after running this seed: ────────────────────────────
-- K6_STATS_USER_ID=cafef00d-0000-0000-0000-000000000001
-- K6_STATS_ACCOUNT_ID=cafef00d-0000-0000-0000-000000000002
-- K6_STATS_STRATEGY_5K_ID=cafef00d-0000-0000-0000-000000000003
-- K6_STATS_STRATEGY_5K1_ID=cafef00d-0000-0000-0000-000000000004
-- K6_STATS_STRATEGY_30K_ID=cafef00d-0000-0000-0000-000000000005
-- PERF_STRATEGY_SLUG_4999=perf-test-4999
-- PERF_STRATEGY_SLUG_5001=perf-test-5001
-- PERF_STRATEGY_SLUG_30K=perf-test-30k
