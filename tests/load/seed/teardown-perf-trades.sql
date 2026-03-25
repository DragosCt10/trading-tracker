-- ============================================================
-- Teardown: Performance Test Trades (seed-perf-trades.sql)
-- ============================================================
-- Removes all data created by seed-perf-trades.sql:
--   - 40,000 backtesting_trades (4999 + 5001 + 30000)
--   - 3 strategies
--   - 1 account
--   - auth user perf_stats@perf-test.invalid
--
-- Deletes in FK-safe order (children before parents).
-- Safe to run multiple times (all DELETEs are idempotent).
--
-- User UUID: 69e636da-0d07-4b4e-b1b5-397191952164
--   (created via Supabase admin API; original cafef00d-...0001 placeholder
--    was migrated to this UUID after GoTrue registration)
--
-- Usage:
--   psql "$DATABASE_URL" -f tests/load/seed/teardown-perf-trades.sql
--   or paste into Supabase SQL editor
-- ============================================================

BEGIN;

-- 1. Trades (must go before strategies + accounts)
DELETE FROM backtesting_trades
WHERE user_id = '69e636da-0d07-4b4e-b1b5-397191952164';

-- 2. Strategies
DELETE FROM strategies
WHERE user_id = '69e636da-0d07-4b4e-b1b5-397191952164';

-- 3. Account
DELETE FROM account_settings
WHERE id = 'cafef00d-0000-0000-0000-000000000002';

-- 4. Auth user (last — dependent rows already removed above)
DELETE FROM auth.users
WHERE id = '69e636da-0d07-4b4e-b1b5-397191952164';

-- Verify everything is gone
SELECT
  (SELECT COUNT(*) FROM backtesting_trades WHERE user_id = '69e636da-0d07-4b4e-b1b5-397191952164') AS remaining_trades,
  (SELECT COUNT(*) FROM strategies         WHERE user_id = '69e636da-0d07-4b4e-b1b5-397191952164') AS remaining_strategies,
  (SELECT COUNT(*) FROM account_settings   WHERE id      = 'cafef00d-0000-0000-0000-000000000002') AS remaining_accounts,
  (SELECT COUNT(*) FROM auth.users         WHERE id      = '69e636da-0d07-4b4e-b1b5-397191952164') AS remaining_users;

-- Expected: all zeros

COMMIT;
