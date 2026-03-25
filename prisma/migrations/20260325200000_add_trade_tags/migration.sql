-- ─── Add tags to trades + saved_tags to strategies ────────────────────────────
--
-- Adds a `tags` text[] column to all three trade tables and a `saved_tags`
-- text[] column to strategies. Uses ADD COLUMN IF NOT EXISTS so this is
-- idempotent if db:push was already used to sync the schema.
--
-- Also creates two helper RPC functions used by the tag-management server
-- actions to rename or delete a tag across all trade tables atomically:
--   • rename_strategy_tag — replaces old tag with new tag via array_replace
--   • delete_strategy_tag — removes a tag via array_remove

-- ── Trade tables ─────────────────────────────────────────────────────────────

ALTER TABLE public.live_trades
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.demo_trades
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.backtesting_trades
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- ── Strategies ────────────────────────────────────────────────────────────────

ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS saved_tags TEXT[] NOT NULL DEFAULT '{}';

-- ── RPC: rename_strategy_tag ──────────────────────────────────────────────────
-- Replaces p_old with p_new in the tags array of every trade that belongs to
-- the given user. The strategy's saved_tags are updated separately by the
-- server action after this call.

CREATE OR REPLACE FUNCTION public.rename_strategy_tag(
  p_strategy_id TEXT,
  p_user_id     TEXT,
  p_old         TEXT,
  p_new         TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_trades
    SET tags = array_replace(tags, p_old, p_new)
    WHERE user_id = p_user_id AND p_old = ANY(tags);

  UPDATE public.demo_trades
    SET tags = array_replace(tags, p_old, p_new)
    WHERE user_id = p_user_id AND p_old = ANY(tags);

  UPDATE public.backtesting_trades
    SET tags = array_replace(tags, p_old, p_new)
    WHERE user_id = p_user_id AND p_old = ANY(tags);
END;
$$;

-- ── RPC: delete_strategy_tag ──────────────────────────────────────────────────
-- Removes p_tag from the tags array of every trade that belongs to the given
-- user. The strategy's saved_tags are updated separately by the server action.

CREATE OR REPLACE FUNCTION public.delete_strategy_tag(
  p_strategy_id TEXT,
  p_user_id     TEXT,
  p_tag         TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_trades
    SET tags = array_remove(tags, p_tag)
    WHERE user_id = p_user_id AND p_tag = ANY(tags);

  UPDATE public.demo_trades
    SET tags = array_remove(tags, p_tag)
    WHERE user_id = p_user_id AND p_tag = ANY(tags);

  UPDATE public.backtesting_trades
    SET tags = array_remove(tags, p_tag)
    WHERE user_id = p_user_id AND p_tag = ANY(tags);
END;
$$;
