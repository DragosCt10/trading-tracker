-- Extend get_platform_stats:
--   - active_traders_count  -> users with at least one trade (previous "traders" definition)
--   - live/demo/backtesting trade counts (current + prev) returned directly by the RPC
--     so the admin panel can render period deltas for each trade mode.

CREATE OR REPLACE FUNCTION get_platform_stats(
  p_compare_interval text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_traders             bigint;
  v_active_traders      bigint;
  v_trades              bigint;
  v_boards              bigint;
  v_live                bigint;
  v_demo                bigint;
  v_backtesting         bigint;
  v_prev_traders        bigint;
  v_prev_active_traders bigint;
  v_prev_trades         bigint;
  v_prev_boards         bigint;
  v_prev_live           bigint;
  v_prev_demo           bigint;
  v_prev_backtesting    bigint;
  v_cutoff              date;
  v_result              jsonb;
BEGIN
  -- Current totals
  SELECT COUNT(*) INTO v_traders FROM auth.users;

  SELECT COUNT(*) INTO v_active_traders
  FROM (
    SELECT user_id FROM live_trades
    UNION
    SELECT user_id FROM demo_trades
    UNION
    SELECT user_id FROM backtesting_trades
  ) t;

  SELECT COUNT(*) INTO v_live         FROM live_trades;
  SELECT COUNT(*) INTO v_demo         FROM demo_trades;
  SELECT COUNT(*) INTO v_backtesting  FROM backtesting_trades;

  v_trades := v_live + v_demo + v_backtesting;

  SELECT COUNT(*) INTO v_boards FROM strategies;

  v_result := jsonb_build_object(
    'traders_count',             v_traders,
    'active_traders_count',      v_active_traders,
    'trades_count',              v_trades,
    'stats_boards_count',        v_boards,
    'live_trades_count',         v_live,
    'demo_trades_count',         v_demo,
    'backtesting_trades_count',  v_backtesting
  );

  IF p_compare_interval IS NOT NULL THEN
    IF p_compare_interval NOT IN ('7 days', '1 month', '3 months', '6 months', '1 year') THEN
      RAISE EXCEPTION 'Invalid interval: %', p_compare_interval;
    END IF;
    v_cutoff := CURRENT_DATE - p_compare_interval::interval;

    SELECT COUNT(*) INTO v_prev_traders
    FROM auth.users
    WHERE created_at < v_cutoff;

    SELECT COUNT(*) INTO v_prev_active_traders
    FROM (
      SELECT user_id FROM live_trades         WHERE created_at < v_cutoff
      UNION
      SELECT user_id FROM demo_trades         WHERE created_at < v_cutoff
      UNION
      SELECT user_id FROM backtesting_trades  WHERE created_at < v_cutoff
    ) t;

    SELECT COUNT(*) INTO v_prev_live         FROM live_trades         WHERE created_at < v_cutoff;
    SELECT COUNT(*) INTO v_prev_demo         FROM demo_trades         WHERE created_at < v_cutoff;
    SELECT COUNT(*) INTO v_prev_backtesting  FROM backtesting_trades  WHERE created_at < v_cutoff;

    v_prev_trades := v_prev_live + v_prev_demo + v_prev_backtesting;

    SELECT COUNT(*) INTO v_prev_boards
    FROM strategies WHERE created_at < v_cutoff;

    v_result := v_result || jsonb_build_object(
      'prev_traders_count',             v_prev_traders,
      'prev_active_traders_count',      v_prev_active_traders,
      'prev_trades_count',              v_prev_trades,
      'prev_stats_boards_count',        v_prev_boards,
      'prev_live_trades_count',         v_prev_live,
      'prev_demo_trades_count',         v_prev_demo,
      'prev_backtesting_trades_count',  v_prev_backtesting
    );
  END IF;

  RETURN v_result;
END;
$$;
