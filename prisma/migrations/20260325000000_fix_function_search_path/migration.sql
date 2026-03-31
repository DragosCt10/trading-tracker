-- Fix: function_search_path_mutable
-- Sets search_path = '' on all public functions flagged by the Supabase linter.
-- Using a dynamic DO block so argument signatures don't need to be hard-coded.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT proname, pg_get_function_identity_arguments(oid) AS args
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = ANY(ARRAY[
        'update_post_like_count',
        'update_post_comment_count',
        'update_follow_counts',
        'get_user_id_by_email',
        'delete_old_archived_strategies',
        'generate_dashboard_hash',
        'move_trades_to_strategy',
        'hash_uuid',
        'update_updated_at_column',
        'is_trade_shared',
        '_refresh_strategy_cache_row',
        'get_dashboard_aggregates',
        'trg_refresh_strategy_stats_cache',
        'get_strategies_overview'
      ])
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = ''''',
      r.proname,
      r.args
    );
  END LOOP;
END;
$$;
