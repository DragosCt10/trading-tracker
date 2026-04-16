-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_backtesting_trades_created_at" ON "public"."backtesting_trades"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_demo_trades_created_at" ON "public"."demo_trades"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_live_trades_created_at" ON "public"."live_trades"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_strategies_created_at" ON "public"."strategies"("created_at");

-- CreateFunction
CREATE OR REPLACE FUNCTION get_platform_stats(
  p_compare_interval text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  SELECT COUNT(*) INTO v_traders
  FROM (
    SELECT user_id FROM live_trades
    UNION
    SELECT user_id FROM demo_trades
    UNION
    SELECT user_id FROM backtesting_trades
  ) t;

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
    FROM (
      SELECT user_id FROM live_trades WHERE created_at < v_cutoff
      UNION
      SELECT user_id FROM demo_trades WHERE created_at < v_cutoff
      UNION
      SELECT user_id FROM backtesting_trades WHERE created_at < v_cutoff
    ) t;

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
