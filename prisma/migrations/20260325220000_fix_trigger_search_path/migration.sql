-- Fix: _refresh_strategy_cache_row signature mismatch
--
-- trg_refresh_strategy_stats_cache passes TG_TABLE_NAME (type `name`) as the
-- last argument, but the function was declared with `p_table text`. PostgreSQL
-- does not implicitly cast `name` → `text` in function resolution, causing:
--   "function _refresh_strategy_cache_row(uuid, uuid, text, uuid, name) does not exist"
--
-- Also sets search_path = public so the strategy_stats_cache table reference
-- resolves correctly (the previous fix_function_search_path migration set it
-- to '' which would break unqualified table/function refs inside the body).

CREATE OR REPLACE FUNCTION public._refresh_strategy_cache_row(
  p_user_id     uuid,
  p_account_id  uuid,
  p_mode        text,
  p_strategy_id uuid,
  p_table       name          -- was `text`; TG_TABLE_NAME is type `name`
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_trades  INTEGER;
  v_win_rate      NUMERIC;
  v_avg_rr        NUMERIC;
  v_total_rr      NUMERIC;
  v_total_profit  NUMERIC;
  v_equity_curve  JSONB;
BEGIN
  EXECUTE format($q$
    SELECT
      COUNT(*)::integer,
      ROUND(
        COUNT(*) FILTER (WHERE NOT COALESCE(break_even,false) AND trade_outcome = 'Win')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE NOT COALESCE(break_even,false)
            AND trade_outcome IN ('Win','Lose')), 0) * 100,
        2),
      ROUND(AVG(COALESCE(risk_reward_ratio,0)) FILTER (WHERE risk_reward_ratio > 0), 2),
      ROUND(SUM(CASE
        WHEN COALESCE(break_even,false)     THEN 0
        WHEN trade_outcome = 'Win'  THEN COALESCE(risk_reward_ratio, 2.0)
        WHEN trade_outcome = 'Lose' THEN -1
        ELSE 0
      END), 2),
      ROUND(SUM(COALESCE(calculated_profit,0))
        FILTER (WHERE NOT COALESCE(break_even,false)), 4)
    FROM %I
    WHERE user_id    = $1
      AND account_id = $2
      AND strategy_id = $3
      AND executed   = true
  $q$, p_table)
  USING p_user_id, p_account_id, p_strategy_id
  INTO v_total_trades, v_win_rate, v_avg_rr, v_total_rr, v_total_profit;

  IF COALESCE(v_total_trades, 0) = 0 THEN
    DELETE FROM strategy_stats_cache
    WHERE user_id    = p_user_id
      AND account_id = p_account_id
      AND mode       = p_mode
      AND strategy_id = p_strategy_id;
    RETURN;
  END IF;

  EXECUTE format($q$
    SELECT jsonb_agg(
      jsonb_build_object('d', trade_date, 'p', ROUND(cum_profit::numeric, 4))
      ORDER BY trade_date, trade_time
    )
    FROM (
      SELECT
        trade_date,
        COALESCE(trade_time, '00:00') AS trade_time,
        SUM(COALESCE(calculated_profit, 0)) OVER (
          ORDER BY trade_date, COALESCE(trade_time, '00:00')
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cum_profit
      FROM %I
      WHERE user_id    = $1
        AND account_id = $2
        AND strategy_id = $3
        AND executed   = true
    ) _eq
  $q$, p_table)
  USING p_user_id, p_account_id, p_strategy_id
  INTO v_equity_curve;

  INSERT INTO strategy_stats_cache (
    user_id, account_id, mode, strategy_id,
    total_trades, win_rate, avg_rr, total_rr, total_profit, equity_curve, updated_at
  ) VALUES (
    p_user_id, p_account_id, p_mode, p_strategy_id,
    v_total_trades,
    COALESCE(v_win_rate,     0),
    COALESCE(v_avg_rr,       0),
    COALESCE(v_total_rr,     0),
    COALESCE(v_total_profit, 0),
    COALESCE(v_equity_curve, '[]'::jsonb),
    now()
  )
  ON CONFLICT (user_id, account_id, mode, strategy_id) DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    win_rate     = EXCLUDED.win_rate,
    avg_rr       = EXCLUDED.avg_rr,
    total_rr     = EXCLUDED.total_rr,
    total_profit = EXCLUDED.total_profit,
    equity_curve = EXCLUDED.equity_curve,
    updated_at   = EXCLUDED.updated_at;
END;
$$;
