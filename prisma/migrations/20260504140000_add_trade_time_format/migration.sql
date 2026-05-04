-- Add per-trade `trade_time_format` marker so the UI can show legacy bucket
-- trades as "HH:00 – HH:59" while still showing exact-mode trades as "HH:MM".
--
-- Values:
--   'exact'    → trade was logged via the free-form <input type="time"> picker
--   'interval' → trade was logged via the legacy 2-hour TIME_INTERVALS Select
--
-- Backward compat: column is NULLABLE with no default. Existing rows stay NULL
-- and the formatter infers them as legacy interval (since interval-mode was the
-- only mode before this feature shipped). New writes always stamp explicitly,
-- so NULL is a clear "pre-feature" sentinel — not a write-side ambiguity.
--
-- CHECK constraint enforced at the DB layer per OV2 (VARCHAR enums must be
-- DB-enforced or drift bugs eventually leak through).

ALTER TABLE "public"."live_trades"
  ADD COLUMN IF NOT EXISTS "trade_time_format" VARCHAR(10);

ALTER TABLE "public"."demo_trades"
  ADD COLUMN IF NOT EXISTS "trade_time_format" VARCHAR(10);

ALTER TABLE "public"."backtesting_trades"
  ADD COLUMN IF NOT EXISTS "trade_time_format" VARCHAR(10);

ALTER TABLE "public"."live_trades"
  DROP CONSTRAINT IF EXISTS "live_trades_trade_time_format_check";
ALTER TABLE "public"."live_trades" ADD CONSTRAINT "live_trades_trade_time_format_check" CHECK (
  trade_time_format IS NULL OR trade_time_format = ANY (ARRAY['exact'::text, 'interval'::text])
);

ALTER TABLE "public"."demo_trades"
  DROP CONSTRAINT IF EXISTS "demo_trades_trade_time_format_check";
ALTER TABLE "public"."demo_trades" ADD CONSTRAINT "demo_trades_trade_time_format_check" CHECK (
  trade_time_format IS NULL OR trade_time_format = ANY (ARRAY['exact'::text, 'interval'::text])
);

ALTER TABLE "public"."backtesting_trades"
  DROP CONSTRAINT IF EXISTS "backtesting_trades_trade_time_format_check";
ALTER TABLE "public"."backtesting_trades" ADD CONSTRAINT "backtesting_trades_trade_time_format_check" CHECK (
  trade_time_format IS NULL OR trade_time_format = ANY (ARRAY['exact'::text, 'interval'::text])
);
