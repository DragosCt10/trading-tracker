-- ============================================================
-- Enable RLS on rate_limits — no direct client access allowed.
-- All writes go through check_rate_limit() which is SECURITY
-- DEFINER (runs as its owner = postgres, bypasses RLS).
-- ============================================================

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Explicit deny-all for anon and authenticated roles.
-- With RLS enabled and no permissive policies the default is
-- already deny, but making it explicit documents the intent.

CREATE POLICY "rate_limits_no_select" ON public.rate_limits
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
