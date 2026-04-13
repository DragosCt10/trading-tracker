-- Add expires_at to strategy_shares
--
-- Share links previously lived forever (only revocable via active = false).
-- A leaked URL (forwarded email, referrer header, shared screenshot) would
-- expose PnL data indefinitely. This migration adds a 90-day rolling expiry
-- so shares self-revoke without any owner action.
--
-- Backfill:
--   - New rows default to now() + 90 days (set in DB default below).
--   - Legacy rows get now() + 180 days — a longer grace period so existing
--     shares aren't suddenly broken for owners who shared them in good faith.

-- 1. Add the column as nullable first so the backfill can run without violating NOT NULL.
ALTER TABLE public.strategy_shares
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. Backfill existing rows with 180-day grace period.
UPDATE public.strategy_shares
  SET expires_at = NOW() + INTERVAL '180 days'
  WHERE expires_at IS NULL;

-- 3. Now that every row has a value, enforce NOT NULL.
ALTER TABLE public.strategy_shares
  ALTER COLUMN expires_at SET NOT NULL;

-- 4. Set the default for future inserts (90 days).
ALTER TABLE public.strategy_shares
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '90 days');

-- 5. Index so the active-share lookup (token + active + expires_at) stays fast.
CREATE INDEX IF NOT EXISTS idx_strategy_shares_token_active_expires
  ON public.strategy_shares (share_token, active, expires_at)
  WHERE active = true;
