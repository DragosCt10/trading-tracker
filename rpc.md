-- Migration: get_dashboard_aggregates
-- Layer 1 of the 3-layer dashboard stats architecture.
-- Replaces the N-batch getFilteredTrades() loop (100+ calls for 50k trades)
-- with a single DB-level aggregation that returns ~5KB of pre-computed stats.
--
-- Called by: src/lib/server/dashboardAggregates.ts (Layer 1 wrapper)
-- Consumed by: src/app/api/dashboard-stats/route.ts (Layer 2 API Route)
-- series[] used by: src/utils/calculateFromSeries.ts (Layer 2 post-processor)
-- compact_trades[] used by: src/workers/dashboardStats.worker.ts (Layer 3)

CREATE OR REPLACE FUNCTION get_dashboard_aggregates(
p_user_id uuid,
p_account_id uuid,
p_mode text, -- 'live' | 'demo' | 'backtesting'
p_start_date date,
p_end_date date,
p_strategy_id uuid DEFAULT NULL,
p_execution text DEFAULT 'executed', -- 'executed' | 'non_executed' | 'all'
p_account_balance numeric DEFAULT 0,
p_include_compact_trades boolean DEFAULT true,
p_market text DEFAULT 'all' -- 'all' or specific market name
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE
v_table text;
v_result jsonb;
BEGIN
-- Whitelist table name to prevent SQL injection
v_table := CASE p_mode
WHEN 'live' THEN 'live_trades'
WHEN 'demo' THEN 'demo_trades'
WHEN 'backtesting' THEN 'backtesting_trades'
ELSE NULL
END;
IF v_table IS NULL THEN
RAISE EXCEPTION 'Invalid mode: %', p_mode;
END IF;

-- Auth check: caller must be the authenticated user
IF auth.uid() IS DISTINCT FROM p_user_id THEN
RAISE EXCEPTION 'Unauthorized';
END IF;

-- Single EXECUTE: all CTEs run in one DB round-trip.
-- $1...$9 are the USING params (see bottom of EXECUTE block).
  -- %1$I = v_table (stats filter), %2$I = v_table (compact_trades/all).
  EXECUTE format($dynamic$
    WITH
    -- ── Execution-filtered trades (for stats) ──────────────────────────────
    _t AS (
      SELECT *
      FROM %1$I
WHERE user_id = $1
AND account_id = $2
AND trade_date BETWEEN $3 AND $4
AND ($5::uuid IS NULL OR strategy_id = $5)
AND (
  -- Execution filter:
  -- - 'executed'      → executed = true
  -- - 'non_executed'  → executed is NOT true (false or NULL) so legacy rows with NULL
  --                    are treated as non-executed, matching MyTradesClient behavior
  -- - 'all'           → no execution filter
  ($7 = 'executed'     AND executed = true) OR
  ($7 = 'non_executed' AND COALESCE(executed, false) = false) OR
  ($7 = 'all')
)
AND ($8 = 'all' OR COALESCE(NULLIF(market, ''), 'Unknown') = $8)
),

    -- ── All trades (no execution filter) — for compact_trades ─────────────
    _all AS (
      SELECT
        id,
        trade_date,
        COALESCE(trade_time, '00:00')                  AS trade_time,
        trade_outcome,
        COALESCE(break_even, false)                    AS break_even,
        COALESCE(partials_taken, false)                AS partials_taken,
        COALESCE(executed, true)                       AS executed,
        COALESCE(NULLIF(market, ''), 'Unknown')        AS market,
        COALESCE(setup_type, '')                       AS setup_type,
        COALESCE(TRIM(liquidity), '')                  AS liquidity,
        COALESCE(direction, '')                        AS direction,
        COALESCE(calculated_profit, 0)::numeric        AS calculated_profit,
        COALESCE(risk_per_trade, 0.5)::numeric         AS risk_per_trade,
        COALESCE(risk_reward_ratio, 2.0)::numeric      AS risk_reward_ratio,
        COALESCE(NULLIF(mss, ''), 'Normal')            AS mss,
        COALESCE(news_related, false)                  AS news_related,
        COALESCE(day_of_week, '')                      AS day_of_week,
        COALESCE(sl_size, 0)::numeric                  AS sl_size,
        (local_high_low::text IN ('true', '1', 't'))   AS local_high_low,
        COALESCE(be_final_result, '')                  AS be_final_result,
        COALESCE(evaluation, '')                       AS evaluation,
        COALESCE(reentry, false)                       AS reentry,
        COALESCE(NULLIF(TRIM(trend), ''), '')          AS trend,
        -- Extra-card fields
        displacement_size,
        fvg_size,
        COALESCE(launch_hour, false)                   AS launch_hour,
        confidence_at_entry,
        mind_state_at_entry,
        news_name,
        news_intensity,
        risk_reward_ratio_long
      FROM %2$I
      WHERE user_id    = $1
        AND account_id = $2
        AND trade_date BETWEEN $3 AND $4
        AND ($5::uuid IS NULL OR strategy_id = $5)
        AND ($8 = 'all' OR COALESCE(NULLIF(market, ''), 'Unknown') = $8)
    ),

    -- ── Core aggregate stats ───────────────────────────────────────────────
    core AS (
      SELECT
        COUNT(*)                                                                AS total_trades,
        COUNT(*) FILTER (WHERE trade_outcome = 'Win')                          AS total_wins,
        COUNT(*) FILTER (WHERE trade_outcome = 'Win'  AND break_even)          AS be_wins,
        COUNT(*) FILTER (WHERE trade_outcome = 'Lose')                         AS total_losses,
        COUNT(*) FILTER (WHERE trade_outcome = 'Lose' AND break_even)          AS be_losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS be_count,
        COUNT(*) FILTER (WHERE NOT break_even)                                 AS non_be_count,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS non_be_wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS non_be_losses,
        COALESCE(SUM(COALESCE(calculated_profit, 0))
          FILTER (WHERE NOT break_even), 0)                                    AS total_profit,
        -- multipleR: Win = +RR, Lose = -1, BE = 0
        COALESCE(SUM(
          CASE
            WHEN break_even                  THEN 0
            WHEN trade_outcome = 'Win'       THEN COALESCE(risk_reward_ratio, 2.0)
            WHEN trade_outcome = 'Lose'      THEN -1
            ELSE 0
          END
        ), 0)                                                                  AS multiple_r
      FROM _t
    ),

    -- ── Average days between trades (distinct dates, ordered) ──────────────
    avg_days AS (
      SELECT
        CASE WHEN COUNT(*) < 2 THEN 0
          ELSE ROUND(AVG(diff_days)::numeric, 1)
        END AS avg_days_between
      FROM (
        SELECT
          ABS((trade_date - LAG(trade_date) OVER (ORDER BY trade_date))::numeric) AS diff_days
        FROM (SELECT DISTINCT trade_date FROM _t) d
      ) diffs
      WHERE diff_days IS NOT NULL
    ),

    -- ── Partial trades stats ───────────────────────────────────────────────
    partials AS (
      SELECT
        COUNT(*) FILTER (WHERE partials_taken AND NOT break_even AND trade_outcome = 'Win')  AS partial_wins,
        COUNT(*) FILTER (WHERE partials_taken AND NOT break_even AND trade_outcome = 'Lose') AS partial_losses,
        COUNT(*) FILTER (WHERE partials_taken AND break_even)                                AS partial_be,
        COUNT(*) FILTER (WHERE partials_taken)                                               AS total_partials
      FROM _t
    ),

    -- ── Macro: profitFactor + consistencyScore ─────────────────────────────
    macro_base AS (
      SELECT
        -- grossProfit: non-BE Win OR BE+partials (always counted as win)
        COALESCE(SUM(
          CASE
            WHEN NOT break_even AND trade_outcome = 'Win'
              THEN $6 * (COALESCE(risk_per_trade, 0.5) / 100) * COALESCE(risk_reward_ratio, 2.0)
            WHEN break_even AND partials_taken
              THEN $6 * (COALESCE(risk_per_trade, 0.5) / 100) * COALESCE(risk_reward_ratio, 2.0)
            ELSE 0
          END
        ), 0)                                                                  AS gross_profit,
        -- grossLoss: non-BE Lose only
        COALESCE(SUM(
          CASE
            WHEN NOT break_even AND trade_outcome = 'Lose'
              THEN $6 * (COALESCE(risk_per_trade, 0.5) / 100)
            ELSE 0
          END
        ), 0)                                                                  AS gross_loss,
        -- real trades = non-BE OR (BE + partials)
        COUNT(*) FILTER (WHERE NOT break_even OR (break_even AND partials_taken))          AS real_count,
        COUNT(*) FILTER (WHERE
          (NOT break_even AND trade_outcome = 'Win') OR (break_even AND partials_taken)
        )                                                                      AS profitable_real_count
      FROM _t
    ),

    -- ── ConsistencyScoreWithBE: positive-PnL days ─────────────────────────
    daily_pnl AS (
      SELECT
        trade_date,
        SUM(
          CASE
            WHEN NOT break_even OR (break_even AND partials_taken) THEN
              CASE trade_outcome
                WHEN 'Win'  THEN $6 * (COALESCE(risk_per_trade, 0.5) / 100) * COALESCE(risk_reward_ratio, 2.0)
                ELSE            -$6 * (COALESCE(risk_per_trade, 0.5) / 100)
              END
            ELSE 0   -- BE without partials = 0 pnl
          END
        )                                                                      AS day_pnl
      FROM _t
      GROUP BY trade_date
    ),
    consistency_with_be AS (
      SELECT
        COUNT(*)                               AS total_days,
        COUNT(*) FILTER (WHERE day_pnl > 0)    AS positive_days
      FROM daily_pnl
    ),

    -- ── Evaluation stats (grades: A+, A, B, C) ────────────────────────────
    eval_raw AS (
      SELECT
        evaluation,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS break_even_count
      FROM _t
      WHERE evaluation IN ('A+', 'A', 'B', 'C')
      GROUP BY evaluation
    ),

    -- ── Risk per trade: bucket by risk key ────────────────────────────────
    -- Mirrors riskValueToKey() + resolveOutcome() from calculateRiskPerTrade.ts
    risk_raw AS (
      SELECT
        CASE
          WHEN risk_per_trade IS NULL THEN NULL
          WHEN risk_per_trade = FLOOR(risk_per_trade)
            THEN 'risk' || FLOOR(risk_per_trade)::bigint::text
          WHEN (risk_per_trade * 10) = FLOOR(risk_per_trade * 10)
            THEN 'risk' || LPAD(ROUND(risk_per_trade * 10)::text, 2, '0')
          ELSE
            'risk' || LPAD(ROUND(risk_per_trade * 100)::text, 3, '0')
        END                                                                    AS risk_key,
        -- resolveOutcome: BE trades resolve via be_final_result
        CASE
          WHEN (trade_outcome = 'BE' OR break_even) THEN
            CASE
              WHEN be_final_result IN ('Win', 'Lose') THEN be_final_result
              WHEN trade_outcome   IN ('Win', 'Lose') THEN trade_outcome
              ELSE 'BE'
            END
          WHEN trade_outcome IN ('Win', 'Lose') THEN trade_outcome
          ELSE NULL
        END                                                                    AS resolved_outcome,
        break_even,
        trade_outcome
      FROM _t
      WHERE risk_per_trade IS NOT NULL
    ),
    risk_grouped AS (
      SELECT
        risk_key,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE resolved_outcome = 'Win'
          AND NOT (break_even OR trade_outcome = 'BE'))                        AS wins,
        COUNT(*) FILTER (WHERE resolved_outcome = 'Lose'
          AND NOT (break_even OR trade_outcome = 'BE'))                        AS losses,
        COUNT(*) FILTER (WHERE resolved_outcome = 'BE'
          OR (resolved_outcome IN ('Win','Lose')
              AND (break_even OR trade_outcome = 'BE')))                       AS break_even_count,
        COUNT(*) FILTER (WHERE (break_even OR trade_outcome = 'BE')
          AND resolved_outcome = 'Win')                                        AS be_wins,
        COUNT(*) FILTER (WHERE (break_even OR trade_outcome = 'BE')
          AND resolved_outcome = 'Lose')                                       AS be_losses
      FROM risk_raw
      WHERE risk_key IS NOT NULL AND resolved_outcome IS NOT NULL
      GROUP BY risk_key
    ),

    -- ── Monthly stats (executed trades only, matching JS behavior) ─────────
    monthly_raw AS (
      SELECT
        TO_CHAR(DATE_TRUNC('month', trade_date), 'FMMonth')                    AS month_name,
        EXTRACT(MONTH FROM trade_date)                                         AS month_num,
        COUNT(*) FILTER (WHERE trade_outcome = 'Win')                          AS wins,
        COUNT(*) FILTER (WHERE trade_outcome = 'Lose')                         AS losses,
        COUNT(*) FILTER (WHERE trade_outcome = 'Win'  AND break_even)          AS be_wins,
        COUNT(*) FILTER (WHERE trade_outcome = 'Lose' AND break_even)          AS be_losses,
        COUNT(*)                                                                AS total_trades,
        COUNT(*) FILTER (WHERE NOT break_even)                                 AS total_non_be,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS non_be_wins,
        COALESCE(SUM(
          CASE
            WHEN NOT break_even THEN
              CASE trade_outcome
                WHEN 'Win'  THEN $6 * (COALESCE(risk_per_trade, 0.5) / 100) * COALESCE(risk_reward_ratio, 2.0)
                ELSE            -$6 * (COALESCE(risk_per_trade, 0.5) / 100)
              END
            ELSE 0
          END
        ), 0)                                                                  AS profit
      FROM _t
      WHERE executed = true
      GROUP BY DATE_TRUNC('month', trade_date), TO_CHAR(DATE_TRUNC('month', trade_date), 'FMMonth'),
               EXTRACT(MONTH FROM trade_date)
    ),

    -- ── Category stats (all follow: GROUP BY dim, compute wins/losses/BE) ──
    setup_raw AS (
      SELECT
        COALESCE(NULLIF(setup_type, ''), 'Unknown')                            AS grp,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS be_count
      FROM _t GROUP BY 1
    ),
    liquidity_raw AS (
      SELECT
        -- Raw value grouped; JS consumer applies CANONICAL_LIQUIDITY mapping
        COALESCE(NULLIF(TRIM(liquidity), ''), 'Unknown')                       AS grp,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS be_count
      FROM _t GROUP BY 1
    ),
    direction_raw AS (
      SELECT
        COALESCE(NULLIF(direction, ''), 'Unknown')                             AS grp,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS be_count
      FROM _t GROUP BY 1
    ),
    mss_raw AS (
      SELECT
        COALESCE(NULLIF(mss, ''), 'Normal')                                    AS grp,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS be_count
      FROM _t GROUP BY 1
    ),
    news_raw AS (
      SELECT
        CASE WHEN news_related THEN 'News' ELSE 'No News' END                  AS grp,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS be_count
      FROM _t GROUP BY 1
    ),
    day_raw AS (
      SELECT
        COALESCE(NULLIF(day_of_week, ''), 'Unknown')                           AS grp,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS be_count
      FROM _t GROUP BY 1
    ),
    market_raw AS (
      SELECT
        COALESCE(NULLIF(market, ''), 'Unknown')                                AS grp,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS be_count,
        COALESCE(SUM(COALESCE(calculated_profit, 0)), 0)                       AS profit
      FROM _t GROUP BY 1
    ),
    local_hl_raw AS (
      SELECT
        -- Matches isLocalHighLowLiquidated(): handles bool, '1', 'true'
        CASE WHEN (local_high_low::text IN ('true', '1', 't'))
          THEN 'liquidated' ELSE 'notLiquidated'
        END                                                                    AS grp,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS be_count,
        COUNT(*) FILTER (WHERE break_even AND be_final_result = 'Win')         AS be_wins_count,
        COUNT(*) FILTER (WHERE break_even AND be_final_result = 'Lose')        AS be_losses_count
      FROM _t GROUP BY 1
    ),
    interval_raw AS (
      SELECT
        CASE
          WHEN TO_CHAR(COALESCE(trade_time, '00:00'::time), 'HH24:MI') BETWEEN '00:00' AND '03:59'
            THEN '00:00 – 03:59'
          WHEN TO_CHAR(COALESCE(trade_time, '00:00'::time), 'HH24:MI') BETWEEN '04:00' AND '07:59'
            THEN '04:00 – 07:59'
          WHEN TO_CHAR(COALESCE(trade_time, '00:00'::time), 'HH24:MI') BETWEEN '08:00' AND '11:59'
            THEN '08:00 – 11:59'
          WHEN TO_CHAR(COALESCE(trade_time, '00:00'::time), 'HH24:MI') BETWEEN '12:00' AND '15:59'
            THEN '12:00 – 15:59'
          WHEN TO_CHAR(COALESCE(trade_time, '00:00'::time), 'HH24:MI') BETWEEN '16:00' AND '19:59'
            THEN '16:00 – 19:59'
          ELSE '20:00 – 23:59'
        END                                                                    AS grp,
        COUNT(*)                                                                AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')       AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')      AS losses,
        COUNT(*) FILTER (WHERE break_even)                                     AS be_count
      FROM _t GROUP BY 1
    ),
    sl_size_raw AS (
      SELECT
        COALESCE(NULLIF(market, ''), 'Unknown')                                AS grp,
        AVG(sl_size) FILTER (WHERE sl_size IS NOT NULL AND sl_size > 0)        AS avg_sl
      FROM _t GROUP BY 1
    ),

    -- ── Reentry stats ──────────────────────────────────────────────────────
    reentry_raw AS (
      SELECT
        CASE WHEN reentry THEN 'Reentry' ELSE 'No Reentry' END              AS grp,
        COUNT(*)                                                              AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')     AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')    AS losses,
        COUNT(*) FILTER (WHERE break_even)                                   AS be_count
      FROM _t GROUP BY 1
    ),

    -- ── Break-even final result stats ──────────────────────────────────────
    be_stats_raw AS (
      SELECT
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')     AS non_be_wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')    AS non_be_losses,
        COUNT(*) FILTER (WHERE break_even)                                   AS be_count,
        COUNT(*)                                                              AS total
      FROM _t
    ),

    -- ── Trend stats (Trend-following / Counter-trend) ─────────────────────
    trend_raw AS (
      SELECT
        COALESCE(NULLIF(TRIM(trend), ''), 'Unknown')                         AS grp,
        COUNT(*)                                                              AS total,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')     AS wins,
        COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Lose')    AS losses,
        COUNT(*) FILTER (WHERE break_even)                                   AS be_count
      FROM _t
      WHERE COALESCE(NULLIF(TRIM(trend), ''), '') IN ('Trend-following', 'Counter-trend')
      GROUP BY 1
    ),

    -- ── Ordered series for Layer 2 (maxDrawdown, streaks, Sharpe, TQI) ────
    series_raw AS (
      SELECT
        trade_date,
        COALESCE(trade_time, '00:00')                                          AS trade_time,
        trade_outcome,
        COALESCE(break_even, false)                                            AS break_even,
        COALESCE(partials_taken, false)                                        AS partials_taken,
        COALESCE(calculated_profit, 0)::numeric                                AS calculated_profit,
        COALESCE(risk_per_trade, 0.5)::numeric                                 AS risk_per_trade,
        COALESCE(risk_reward_ratio, 2.0)::numeric                              AS risk_reward_ratio,
        COALESCE(NULLIF(market, ''), 'Unknown')                                AS market,
        COALESCE(executed, true)                                               AS executed,
        confidence_at_entry,
        mind_state_at_entry,
        news_name
      FROM _t
      ORDER BY trade_date, COALESCE(trade_time, '00:00')
    )

    -- ── Build final JSON ───────────────────────────────────────────────────
    SELECT jsonb_build_object(

      'core', (SELECT jsonb_build_object(
        'totalTrades',            total_trades,
        'totalWins',              total_wins,
        'beWins',                 be_wins,
        'totalLosses',            total_losses,
        'beLosses',               be_losses,
        'winRate',                CASE WHEN (non_be_wins + non_be_losses) > 0
                                    THEN ROUND(non_be_wins::numeric / (non_be_wins + non_be_losses) * 100, 4)
                                    ELSE 0 END,
        'winRateWithBE',          CASE WHEN total_trades > 0
                                    THEN ROUND(non_be_wins::numeric / total_trades * 100, 4)
                                    ELSE 0 END,
        'totalProfit',            ROUND(total_profit, 4),
        'averageProfit',          CASE WHEN non_be_count > 0
                                    THEN ROUND(total_profit / non_be_count, 4) ELSE 0 END,
        'averagePnLPercentage',   CASE WHEN $6 > 0
                                    THEN ROUND(total_profit / $6 * 100, 4) ELSE 0 END,
        'multipleR',              ROUND(multiple_r, 4),
        'averageDaysBetweenTrades', (SELECT avg_days_between FROM avg_days)
      ) FROM core),

      'partials', (SELECT jsonb_build_object(
        'partialWinningTrades',   partial_wins,
        'partialLosingTrades',    partial_losses,
        'partialBETrades',        partial_be,
        'totalPartialTradesCount', total_partials,
        'totalPartialsBECount',   partial_be
      ) FROM partials),

      'macro', (SELECT jsonb_build_object(
        'profitFactor',           CASE WHEN m.gross_loss > 0
                                    THEN ROUND(m.gross_profit / m.gross_loss, 4) ELSE 0 END,
        'consistencyScore',       CASE WHEN m.real_count > 0
                                    THEN ROUND(m.profitable_real_count::numeric / m.real_count * 100, 4) ELSE 0 END,
        'consistencyScoreWithBE', CASE WHEN c.total_days > 0
                                    THEN ROUND(c.positive_days::numeric / c.total_days * 100, 4) ELSE 0 END
      ) FROM macro_base m, consistency_with_be c),

      'evaluation_stats', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'grade',       evaluation,
            'total',       total,
            'wins',        wins,
            'losses',      losses,
            'beTradesCount', break_even_count,
            'breakEven',   break_even_count,
            'winRate',     CASE WHEN (wins + losses) > 0
                             THEN ROUND(wins::numeric / (wins + losses) * 100) ELSE 0 END,
            'winRateWithBE', CASE WHEN total > 0
                             THEN ROUND(wins::numeric / total * 100) ELSE 0 END
          )
          ORDER BY CASE evaluation WHEN 'A+' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 WHEN 'C' THEN 4 ELSE 5 END
        ), '[]'::jsonb)
        FROM eval_raw
      ),

      'risk_analysis', (
        SELECT COALESCE(jsonb_object_agg(
          risk_key,
          jsonb_build_object(
            'total',       total,
            'wins',        wins,
            'losses',      losses,
            'breakEven',   break_even_count,
            'beWins',      be_wins,
            'beLosses',    be_losses,
            'winrate',     CASE WHEN (wins + losses) > 0
                             THEN ROUND(wins::numeric / (wins + losses) * 100, 4) ELSE 0 END,
            'winrateWithBE', CASE WHEN total > 0
                             THEN ROUND(wins::numeric / total * 100, 4) ELSE 0 END
          )
        ), '{}'::jsonb)
        FROM risk_grouped
      ),

      'monthly_data', (
        SELECT COALESCE(jsonb_object_agg(
          month_name,
          jsonb_build_object(
            'wins',          wins,
            'losses',        losses,
            'beWins',        be_wins,
            'beLosses',      be_losses,
            'profit',        ROUND(profit, 4),
            'winRate',       CASE WHEN total_non_be > 0
                               THEN ROUND(non_be_wins::numeric / total_non_be * 100, 4) ELSE 0 END,
            'winRateWithBE', CASE WHEN total_trades > 0
                               THEN ROUND(non_be_wins::numeric / total_trades * 100, 4) ELSE 0 END
          )
        ), '{}'::jsonb)
        FROM monthly_raw
      ),

      'best_month', (
        SELECT jsonb_build_object(
          'month', month_name,
          'stats', jsonb_build_object(
            'wins', wins, 'losses', losses, 'beWins', be_wins, 'beLosses', be_losses,
            'profit', ROUND(profit, 4),
            'winRate',       CASE WHEN total_non_be > 0
                               THEN ROUND(non_be_wins::numeric / total_non_be * 100, 4) ELSE 0 END,
            'winRateWithBE', CASE WHEN total_trades > 0
                               THEN ROUND(non_be_wins::numeric / total_trades * 100, 4) ELSE 0 END
          )
        )
        FROM monthly_raw WHERE (wins + losses) > 0 ORDER BY profit DESC LIMIT 1
      ),

      'worst_month', (
        SELECT jsonb_build_object(
          'month', month_name,
          'stats', jsonb_build_object(
            'wins', wins, 'losses', losses, 'beWins', be_wins, 'beLosses', be_losses,
            'profit', ROUND(profit, 4),
            'winRate',       CASE WHEN total_non_be > 0
                               THEN ROUND(non_be_wins::numeric / total_non_be * 100, 4) ELSE 0 END,
            'winRateWithBE', CASE WHEN total_trades > 0
                               THEN ROUND(non_be_wins::numeric / total_trades * 100, 4) ELSE 0 END
          )
        )
        FROM monthly_raw WHERE (wins + losses) > 0 ORDER BY profit ASC LIMIT 1
      ),

      -- ── Category stats (all share the same winRate formula) ─────────────
      'setup_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'setup', grp, 'total', total, 'wins', wins, 'losses', losses,
        'breakEven', be_count,
        'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
        'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
      ) ORDER BY total DESC), '[]'::jsonb) FROM setup_raw),

      'liquidity_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'liquidity', grp, 'total', total, 'wins', wins, 'losses', losses,
        'breakEven', be_count,
        'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
        'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
      ) ORDER BY total DESC), '[]'::jsonb) FROM liquidity_raw),

      'direction_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'direction', grp, 'total', total, 'wins', wins, 'losses', losses,
        'breakEven', be_count,
        'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
        'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
      ) ORDER BY total DESC), '[]'::jsonb) FROM direction_raw),

      'mss_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'mss', grp, 'total', total, 'wins', wins, 'losses', losses,
        'breakEven', be_count,
        'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
        'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
      ) ORDER BY total DESC), '[]'::jsonb) FROM mss_raw),

      'news_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'news', grp, 'total', total, 'wins', wins, 'losses', losses,
        'breakEven', be_count,
        'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
        'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
      ) ORDER BY total DESC), '[]'::jsonb) FROM news_raw),

      'day_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'day', grp, 'total', total, 'wins', wins, 'losses', losses,
        'breakEven', be_count,
        'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
        'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
      ) ORDER BY total DESC), '[]'::jsonb) FROM day_raw),

      'market_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'market', grp, 'total', total, 'wins', wins, 'losses', losses,
        'breakEven', be_count,
        'profit', ROUND(profit, 4),
        'pnlPercentage', CASE WHEN $6 > 0 THEN ROUND(profit / $6 * 100, 4) ELSE 0 END,
        'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
        'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END,
        'profitTaken', true
      ) ORDER BY total DESC), '[]'::jsonb) FROM market_raw),

      'local_hl_stats', (
        SELECT jsonb_build_object(
          'liquidated', COALESCE(
            (SELECT jsonb_build_object(
              'wins', wins, 'losses', losses, 'breakEven', be_count, 'total', total,
              'beWins', be_wins_count, 'beLosses', be_losses_count,
              'beWinRate', CASE WHEN (be_wins_count + be_losses_count) > 0
                THEN ROUND(be_wins_count::numeric / (be_wins_count + be_losses_count) * 100, 4) ELSE 0 END,
              'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
              'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
            ) FROM local_hl_raw WHERE grp = 'liquidated'),
            '{"wins":0,"losses":0,"breakEven":0,"winRate":0,"winRateWithBE":0,"total":0,"beWins":0,"beLosses":0}'::jsonb
          ),
          'notLiquidated', COALESCE(
            (SELECT jsonb_build_object(
              'wins', wins, 'losses', losses, 'breakEven', be_count, 'total', total,
              'beWins', be_wins_count, 'beLosses', be_losses_count,
              'beWinRate', CASE WHEN (be_wins_count + be_losses_count) > 0
                THEN ROUND(be_wins_count::numeric / (be_wins_count + be_losses_count) * 100, 4) ELSE 0 END,
              'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
              'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
            ) FROM local_hl_raw WHERE grp = 'notLiquidated'),
            '{"wins":0,"losses":0,"breakEven":0,"winRate":0,"winRateWithBE":0,"total":0,"beWins":0,"beLosses":0}'::jsonb
          )
        )
      ),

      'interval_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'label', grp, 'total', total, 'wins', wins, 'losses', losses,
        'breakEven', be_count,
        'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
        'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
      ) ORDER BY grp), '[]'::jsonb) FROM interval_raw),

      'sl_size_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'market', grp,
        'averageSlSize', COALESCE(ROUND(avg_sl::numeric, 4), 0)
      ) ORDER BY avg_sl DESC NULLS LAST), '[]'::jsonb)
      FROM sl_size_raw WHERE avg_sl IS NOT NULL AND avg_sl > 0),

      -- ── Reentry stats ──────────────────────────────────────────────────
      'reentry_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'grp', grp, 'total', total, 'wins', wins, 'losses', losses,
        'breakEven', be_count,
        'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
        'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
      ) ORDER BY grp), '[]'::jsonb) FROM reentry_raw),

      -- ── Break-even stats ───────────────────────────────────────────────
      'break_even_stats', (SELECT jsonb_build_object(
        'nonBeWins',   non_be_wins,
        'nonBeLosses', non_be_losses,
        'beCount',     be_count,
        'total',       total
      ) FROM be_stats_raw),

      -- ── Trend stats ────────────────────────────────────────────────────
      'trend_stats', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tradeType', grp, 'total', total, 'wins', wins, 'losses', losses,
        'breakEven', be_count,
        'winRate', CASE WHEN (wins+losses)>0 THEN ROUND(wins::numeric/(wins+losses)*100,4) ELSE 0 END,
        'winRateWithBE', CASE WHEN total>0 THEN ROUND(wins::numeric/total*100,4) ELSE 0 END
      ) ORDER BY total DESC), '[]'::jsonb) FROM trend_raw),

      -- ── Ordered series for Layer 2 time-series computations ────────────
      'series', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'trade_date',       trade_date,
        'trade_time',       trade_time,
        'trade_outcome',    trade_outcome,
        'break_even',       break_even,
        'partials_taken',   partials_taken,
        'calculated_profit', calculated_profit,
        'risk_per_trade',    risk_per_trade,
        'risk_reward_ratio', risk_reward_ratio,
        'market',            market,
        'executed',          executed,
        'confidence_at_entry', confidence_at_entry,
        'mind_state_at_entry', mind_state_at_entry,
        'news_name',         news_name
      )), '[]'::jsonb) FROM series_raw),

      -- ── Trade months & earliest date (replaces compact_trades for nav) ─
      -- Used by: useDashboardData.ts (calendar prefetch, date range init)
      -- Note: DISTINCT + ORDER BY can't be combined in jsonb_agg, so we use a subquery.
      'trade_months', (
        SELECT COALESCE(jsonb_agg(m ORDER BY m), '[]'::jsonb)
        FROM (
          SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', trade_date), 'YYYY-MM') AS m
          FROM _all
          WHERE trade_date IS NOT NULL
        ) _months
      ),
      'earliest_trade_date', (
        SELECT TO_CHAR(MIN(trade_date), 'YYYY-MM-DD') FROM _all
      ),

      -- ── Compact trades for Layer 3 Web Worker ──────────────────────────
      -- Only included in main call (p_include_compact_trades = true)
      -- Contains ALL trades in date range (no execution filter) so the
      -- worker can apply both execution + market filters client-side.
      'compact_trades', CASE WHEN $9 THEN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'id',               id,
          'trade_date',       trade_date,
          'trade_time',       trade_time,
          'trade_outcome',    trade_outcome,
          'break_even',       break_even,
          'partials_taken',   partials_taken,
          'executed',         executed,
          'market',           market,
          'setup_type',       setup_type,
          'liquidity',        liquidity,
          'direction',        direction,
          'calculated_profit', calculated_profit,
          'risk_per_trade',    risk_per_trade,
          'risk_reward_ratio', risk_reward_ratio,
          'mss',              mss,
          'news_related',     news_related,
          'day_of_week',      day_of_week,
          'sl_size',          sl_size,
          'local_high_low',   local_high_low,
          'be_final_result',  be_final_result,
          'evaluation',       evaluation,
          'reentry',          reentry,
          'trend',            trend,
          'displacement_size', displacement_size,
          'fvg_size',          fvg_size,
          'launch_hour',       launch_hour,
          'confidence_at_entry', confidence_at_entry,
          'mind_state_at_entry', mind_state_at_entry,
          'news_name',         news_name,
          'news_intensity',        news_intensity,
          'risk_reward_ratio_long', risk_reward_ratio_long
        )), '[]'::jsonb)
        FROM _all
      ) ELSE '[]'::jsonb END

    )

$dynamic$,
v_table, -- %1$I → _t table name
  v_table    -- %2$I → \_all table name
)
USING
p_user_id, -- $1
p_account_id, -- $2
p_start_date, -- $3
p_end_date, -- $4
p_strategy_id, -- $5
p_account_balance, -- $6
p_execution, -- $7
p_market, -- $8 market filter ('all' or specific market)
p_include_compact_trades -- $9
INTO v_result;

RETURN v_result;
END;
$func$;

-- Grant execute to authenticated users (row-level security enforced inside function)
GRANT EXECUTE ON FUNCTION get_dashboard_aggregates(uuid, uuid, text, date, date, uuid, text, numeric, boolean, text)
TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- get_strategies_overview
-- Returns per-strategy aggregated stats + equity curve in a single DB round-trip.
-- Replaces the N-page getFilteredTrades() bulk fetch on the Strategies page.
-- Called by: src/lib/server/strategiesOverview.ts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_strategies_overview(
p_user_id uuid,
p_account_id uuid,
p_mode text -- 'live' | 'demo' | 'backtesting'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE
v_table text;
v_result jsonb;
BEGIN
v_table := CASE p_mode
WHEN 'live' THEN 'live_trades'
WHEN 'demo' THEN 'demo_trades'
WHEN 'backtesting' THEN 'backtesting_trades'
ELSE NULL
END;
IF v_table IS NULL THEN
RAISE EXCEPTION 'Invalid mode: %', p_mode;
END IF;

IF auth.uid() IS DISTINCT FROM p_user_id THEN
RAISE EXCEPTION 'Unauthorized';
END IF;

EXECUTE format($dynamic$
WITH
-- ── Executed trades scoped to user + account ──────────────────────────────
\_exec AS (
SELECT
strategy_id,
trade_date,
COALESCE(trade_time, '00:00') AS trade_time,
COALESCE(break_even, false) AS break_even,
trade_outcome,
COALESCE(risk_reward_ratio, 2.0)::numeric AS risk_reward_ratio,
COALESCE(calculated_profit, 0)::numeric AS calculated_profit
FROM %I
WHERE user_id = $1
AND account_id = $2
AND executed = true
AND strategy_id IS NOT NULL
),

    -- ── Per-strategy aggregate stats ─────────────────────────────────────────
    _stats AS (
      SELECT
        strategy_id,
        COUNT(*)                                                            AS total_trades,
        ROUND(
          COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome = 'Win')::numeric
          / NULLIF(COUNT(*) FILTER (WHERE NOT break_even AND trade_outcome IN ('Win','Lose')), 0) * 100,
          2)                                                                AS win_rate,
        ROUND(
          AVG(risk_reward_ratio) FILTER (WHERE risk_reward_ratio > 0),
          2)                                                                AS avg_rr,
        ROUND(
          SUM(CASE
            WHEN break_even            THEN 0
            WHEN trade_outcome = 'Win' THEN risk_reward_ratio
            WHEN trade_outcome = 'Lose' THEN -1
            ELSE 0
          END),
          2)                                                                AS total_rr,
        ROUND(
          SUM(calculated_profit) FILTER (WHERE NOT break_even),
          2)                                                                AS total_profit
      FROM _exec
      GROUP BY strategy_id
    ),

    -- ── Equity curve: ordered cumulative profit per strategy ──────────────────
    _cum AS (
      SELECT
        strategy_id,
        trade_date,
        trade_time,
        SUM(calculated_profit) OVER (
          PARTITION BY strategy_id
          ORDER BY trade_date, trade_time
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cum_profit
      FROM _exec
    ),
    _equity AS (
      SELECT
        strategy_id,
        jsonb_agg(
          jsonb_build_object('d', trade_date, 'p', ROUND(cum_profit::numeric, 4))
          ORDER BY trade_date, trade_time
        ) AS curve
      FROM _cum
      GROUP BY strategy_id
    )

    SELECT jsonb_object_agg(
      s.strategy_id::text,
      jsonb_build_object(
        'totalTrades', s.total_trades,
        'winRate',     COALESCE(s.win_rate,     0),
        'avgRR',       COALESCE(s.avg_rr,       0),
        'totalRR',     COALESCE(s.total_rr,     0),
        'totalProfit', COALESCE(s.total_profit, 0),
        'equityCurve', COALESCE(e.curve, '[]'::jsonb)
      )
    )
    FROM _stats s
    LEFT JOIN _equity e ON e.strategy_id = s.strategy_id

$dynamic$, v_table)
USING p_user_id, p_account_id
INTO v_result;

RETURN COALESCE(v_result, '{}'::jsonb);
END;
$func$;

GRANT EXECUTE ON FUNCTION get_strategies_overview(uuid, uuid, text)
TO authenticated;

-- 2. Helper: recompute + upsert stats for one (user, account, mode, strategy) combo
-- Called by the trigger function. SECURITY DEFINER bypasses RLS from trigger context.
CREATE OR REPLACE FUNCTION _refresh_strategy_cache_row(
  p_user_id     UUID,
  p_account_id  UUID,
  p_mode        TEXT,
  p_strategy_id UUID,
  p_table       TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $func$
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
$func$;


-- 3. Trigger function (shared by all three trade tables via TG_TABLE_NAME)
-- INSERT          -> refresh NEW.strategy_id
-- UPDATE (same)   -> refresh NEW.strategy_id
-- UPDATE (moved)  -> refresh OLD.strategy_id + NEW.strategy_id (trade moved A->B)
-- DELETE          -> refresh OLD.strategy_id (row removed if 0 trades remain)
CREATE OR REPLACE FUNCTION trg_refresh_strategy_stats_cache()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE
  v_mode TEXT;
BEGIN
  v_mode := CASE TG_TABLE_NAME
    WHEN 'live_trades'        THEN 'live'
    WHEN 'demo_trades'        THEN 'demo'
    WHEN 'backtesting_trades' THEN 'backtesting'
    ELSE NULL
  END;
  IF v_mode IS NULL THEN RETURN NULL; END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.strategy_id IS NOT NULL THEN
      PERFORM _refresh_strategy_cache_row(
        OLD.user_id, OLD.account_id, v_mode, OLD.strategy_id, TG_TABLE_NAME
      );
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.strategy_id IS DISTINCT FROM NEW.strategy_id THEN
    IF OLD.strategy_id IS NOT NULL THEN
      PERFORM _refresh_strategy_cache_row(
        OLD.user_id, OLD.account_id, v_mode, OLD.strategy_id, TG_TABLE_NAME
      );
    END IF;
  END IF;

  IF NEW.strategy_id IS NOT NULL THEN
    PERFORM _refresh_strategy_cache_row(
      NEW.user_id, NEW.account_id, v_mode, NEW.strategy_id, TG_TABLE_NAME
    );
  END IF;

  RETURN NEW;
END;
$func$;


-- 4. Attach triggers to all three trade tables
DROP TRIGGER IF EXISTS trg_strategy_stats_cache ON live_trades;
CREATE TRIGGER trg_strategy_stats_cache
  AFTER INSERT OR UPDATE OR DELETE ON live_trades
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_strategy_stats_cache();

DROP TRIGGER IF EXISTS trg_strategy_stats_cache ON demo_trades;
CREATE TRIGGER trg_strategy_stats_cache
  AFTER INSERT OR UPDATE OR DELETE ON demo_trades
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_strategy_stats_cache();

DROP TRIGGER IF EXISTS trg_strategy_stats_cache ON backtesting_trades;
CREATE TRIGGER trg_strategy_stats_cache
  AFTER INSERT OR UPDATE OR DELETE ON backtesting_trades
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_strategy_stats_cache();


-- 5. Backfill existing trades into the cache (safe to re-run)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, account_id, strategy_id FROM live_trades
    WHERE executed = true AND strategy_id IS NOT NULL
  LOOP
    PERFORM _refresh_strategy_cache_row(r.user_id, r.account_id, 'live', r.strategy_id, 'live_trades');
  END LOOP;

  FOR r IN
    SELECT DISTINCT user_id, account_id, strategy_id FROM demo_trades
    WHERE executed = true AND strategy_id IS NOT NULL
  LOOP
    PERFORM _refresh_strategy_cache_row(r.user_id, r.account_id, 'demo', r.strategy_id, 'demo_trades');
  END LOOP;

  FOR r IN
    SELECT DISTINCT user_id, account_id, strategy_id FROM backtesting_trades
    WHERE executed = true AND strategy_id IS NOT NULL
  LOOP
    PERFORM _refresh_strategy_cache_row(r.user_id, r.account_id, 'backtesting', r.strategy_id, 'backtesting_trades');
  END LOOP;
END;
$$;
