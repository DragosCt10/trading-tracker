-- Fix: move_trades_to_strategy needs search_path = 'public' (not empty)
-- The function uses unqualified table references (strategies, dynamic _trades tables)
-- that require the public schema to be in the search path.
ALTER FUNCTION public.move_trades_to_strategy(uuid[], uuid, text, uuid)
  SET search_path = 'public';
