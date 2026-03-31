-- Fix: trg_refresh_strategy_stats_cache cannot resolve _refresh_strategy_cache_row
--
-- The fix_function_search_path migration set search_path = '' on BOTH
-- _refresh_strategy_cache_row AND trg_refresh_strategy_stats_cache.
-- With an empty search_path, the trigger body's unqualified call to
-- _refresh_strategy_cache_row cannot be resolved in `public`, regardless
-- of the function's own signature.
--
-- Reset the trigger function's search_path to `public` so the call resolves.

ALTER FUNCTION public.trg_refresh_strategy_stats_cache() SET search_path = public;
