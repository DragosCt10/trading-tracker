-- Redefine get_platform_stats so that "traders_count" reflects registered users
-- (auth.users) rather than only users who have logged at least one trade.
-- This keeps admin + landing consistent (both call this RPC).

CREATE OR REPLACE FUNCTION get_platform_stats(
  p_compare_interval text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_traders      bigint;
  v_trades       bigint;
  v_boards       bigint;
  v_prev_traders bigint;
  v_prev_trades  bigint;
  v_prev_boards  bigint;
  v_cutoff       date;
  v_result       jsonb;
BEGIN
  -- Current totals
  SELECT COUNT(*) INTO v_traders FROM auth.users;

  SELECT (SELECT COUNT(*) FROM live_trades)
       + (SELECT COUNT(*) FROM demo_trades)
       + (SELECT COUNT(*) FROM backtesting_trades)
  INTO v_trades;

  SELECT COUNT(*) INTO v_boards FROM strategies;

  v_result := jsonb_build_object(
    'traders_count',      v_traders,
    'trades_count',       v_trades,
    'stats_boards_count', v_boards
  );

  -- Comparison (only when interval provided, with allowlist validation)
  IF p_compare_interval IS NOT NULL THEN
    IF p_compare_interval NOT IN ('7 days', '1 month', '3 months', '6 months', '1 year') THEN
      RAISE EXCEPTION 'Invalid interval: %', p_compare_interval;
    END IF;
    v_cutoff := CURRENT_DATE - p_compare_interval::interval;

    SELECT COUNT(*) INTO v_prev_traders
    FROM auth.users
    WHERE created_at < v_cutoff;

    SELECT (SELECT COUNT(*) FROM live_trades WHERE created_at < v_cutoff)
         + (SELECT COUNT(*) FROM demo_trades WHERE created_at < v_cutoff)
         + (SELECT COUNT(*) FROM backtesting_trades WHERE created_at < v_cutoff)
    INTO v_prev_trades;

    SELECT COUNT(*) INTO v_prev_boards
    FROM strategies WHERE created_at < v_cutoff;

    v_result := v_result || jsonb_build_object(
      'prev_traders_count',      v_prev_traders,
      'prev_trades_count',       v_prev_trades,
      'prev_stats_boards_count', v_prev_boards
    );
  END IF;

  RETURN v_result;
END;
$$;
