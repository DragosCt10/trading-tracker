-- ============================================================
-- feed-helpers.sql
-- Helper Postgres functions for feed interactions.
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/functions/feed-helpers.sql
--
-- What this does:
--   toggle_like()       — atomic like/unlike in one transaction (no race condition)
--   acquire_post_lock() — advisory lock to prevent weekly-limit race on createPost
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- toggle_like
--
-- Replaces the 4-serial-call pattern in likePost():
--   1. check post exists
--   2. check already liked
--   3. upsert or delete
--   4. fetch new like_count
--
-- All done in one transaction. Self-likes raise an exception
-- the TypeScript layer detects via error.message.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_like(
  p_post_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id  uuid;
  v_liked      boolean;
  v_like_count int;
BEGIN
  SELECT author_id INTO v_author_id
  FROM feed_posts
  WHERE id = p_post_id AND is_hidden = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: post % does not exist or is hidden', p_post_id;
  END IF;

  IF v_author_id = p_user_id THEN
    RAISE EXCEPTION 'SELF_LIKE: cannot like your own post';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM feed_likes
    WHERE post_id = p_post_id AND user_id = p_user_id
  ) INTO v_liked;

  IF v_liked THEN
    DELETE FROM feed_likes WHERE post_id = p_post_id AND user_id = p_user_id;
  ELSE
    INSERT INTO feed_likes (post_id, user_id)
    VALUES (p_post_id, p_user_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
  END IF;

  SELECT like_count INTO v_like_count FROM feed_posts WHERE id = p_post_id;

  RETURN json_build_object(
    'liked',      NOT v_liked,
    'like_count', v_like_count,
    'author_id',  v_author_id
  );
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- acquire_post_lock
--
-- Prevents concurrent requests from the same user from both
-- passing the weekly-limit check before either inserts.
--
-- Uses pg_try_advisory_xact_lock — scoped to the current
-- transaction, released automatically on commit/rollback.
-- Returns true if lock acquired (safe to proceed),
-- false if another transaction from this profile is in-flight.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.acquire_post_lock(
  p_profile_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pg_try_advisory_xact_lock(hashtext(p_profile_id::text));
END;
$$;
