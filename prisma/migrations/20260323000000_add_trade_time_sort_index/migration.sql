-- Add trade_time to the sort index used by get_dashboard_aggregates window functions.
-- The RPC uses ORDER BY (trade_date, trade_time) in two window function CTEs:
--   _equity_ordered (drawdown/running balance)
--   _non_be_streaks (win/lose streak detection)
-- The existing idx_backtesting_trades_user_account_strategy_date ends at trade_date,
-- so PostgreSQL sorts 30k rows in memory for each window function.
-- Adding trade_time allows index-ordered scans, removing the sort step.
-- CONCURRENTLY: no table lock, safe to run on production.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_backtesting_trades_user_account_strategy_date_time"
ON "backtesting_trades"("user_id", "account_id", "strategy_id", "trade_date", "trade_time");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_live_trades_user_account_strategy_date_time"
ON "live_trades"("user_id", "account_id", "strategy_id", "trade_date", "trade_time");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_demo_trades_user_account_strategy_date_time"
ON "demo_trades"("user_id", "account_id", "strategy_id", "trade_date", "trade_time");
