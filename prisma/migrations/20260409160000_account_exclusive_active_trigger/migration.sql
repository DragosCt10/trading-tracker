-- account_settings: enforce "at most one active account per (user_id, mode)"
-- at the database level, so the application can stop doing a 2-step
-- clear-then-set UPDATE. The clear-then-set pattern had two latent bugs:
--
--   1. TOCTOU: if the clear succeeded but the set failed (partial write),
--      the caller ended up with NO active account in that mode.
--   2. Authorization ordering: the clear step ran BEFORE the set step
--      validated that accountId belonged to the caller, so a forged id
--      could wipe the caller's active flag.
--
-- After this migration, `setActiveAccount` is a single atomic UPDATE
-- gated by user_id in the WHERE clause. The trigger clears siblings and
-- the partial unique index prevents any two rows in the same
-- (user_id, mode) slice from being active simultaneously.

-- -------- Partial unique index --------
CREATE UNIQUE INDEX IF NOT EXISTS account_active_per_user_mode
  ON public.account_settings (user_id, mode)
  WHERE is_active = true;

-- -------- Trigger function --------
CREATE OR REPLACE FUNCTION public.account_settings_exclusive_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only act when is_active is transitioning from false/null → true.
  IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
    UPDATE public.account_settings
      SET is_active = false
      WHERE user_id = NEW.user_id
        AND mode = NEW.mode
        AND id <> NEW.id
        AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

-- -------- Trigger --------
DROP TRIGGER IF EXISTS account_settings_exclusive_active_trg ON public.account_settings;

CREATE TRIGGER account_settings_exclusive_active_trg
  BEFORE UPDATE ON public.account_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.account_settings_exclusive_active();
