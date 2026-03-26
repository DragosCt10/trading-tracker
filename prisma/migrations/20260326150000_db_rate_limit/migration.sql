-- ============================================================
-- DB-backed rate limiter — D-4.1
-- Replaces the in-memory Map in src/lib/rateLimit.ts which
-- resets on every Vercel cold-start and doesn't work across
-- multiple instances.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key      text    PRIMARY KEY,
  count    int     NOT NULL DEFAULT 0,
  reset_at bigint  NOT NULL  -- epoch ms when the window expires
);

-- No RLS needed — this table is only written via SECURITY DEFINER function.
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

-- ── check_rate_limit ──────────────────────────────────────────────────────────
-- Atomically increments the counter for `p_key` within a sliding window of
-- `p_window_ms` milliseconds.  Returns TRUE if the request is within the limit,
-- FALSE if it should be rejected.
--
-- The INSERT ... ON CONFLICT is a single atomic statement in Postgres, so there
-- is no TOCTOU race between the read and the write.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key       text,
  p_limit     int,
  p_window_ms bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now   bigint := (extract(epoch from now()) * 1000)::bigint;
  v_count int;
BEGIN
  INSERT INTO public.rate_limits(key, count, reset_at)
  VALUES (p_key, 1, v_now + p_window_ms)
  ON CONFLICT (key) DO UPDATE
    SET count    = CASE
                     WHEN rate_limits.reset_at < v_now THEN 1
                     ELSE rate_limits.count + 1
                   END,
        reset_at = CASE
                     WHEN rate_limits.reset_at < v_now THEN v_now + p_window_ms
                     ELSE rate_limits.reset_at
                   END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;
