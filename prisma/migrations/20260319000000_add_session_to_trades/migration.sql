-- Add session column to all three trades tables
-- Values: 'Sydney' | 'Tokyo' | 'London' | 'New York' | NULL

ALTER TABLE "public"."live_trades"
  ADD COLUMN IF NOT EXISTS "session" TEXT;

ALTER TABLE "public"."demo_trades"
  ADD COLUMN IF NOT EXISTS "session" TEXT;

ALTER TABLE "public"."backtesting_trades"
  ADD COLUMN IF NOT EXISTS "session" TEXT;
