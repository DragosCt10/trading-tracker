-- ============================================================
-- feed-rpcs.sql
-- Postgres functions for feed queries.
-- These replace multi-step serial Supabase calls with single JOIN queries.
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/functions/feed-rpcs.sql
--
-- What this does:
--   get_public_feed()   — feed + author + like status in 1 JOIN query
--   get_channel_feed()  — same for channel feeds
--   get_timeline()      — following feed using JOIN on follows (not IN())
--
-- Note: SET search_path at the top is required — LANGUAGE sql functions are
-- analyzed at CREATE time using the session search_path, not the function-level
-- SET option (which only applies at execution time).
-- ============================================================
SET search_path TO public;


-- ──────────────────────────────────────────────────────────────
-- get_public_feed
--
-- Returns all non-hidden posts ordered newest-first.
-- Joins the author profile and the current viewer's like status
-- in a single query. p_user_id is nullable for unauthenticated
-- viewers — they get is_liked_by_me = false.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_public_feed(
  p_cursor    TIMESTAMPTZ DEFAULT NULL,
  p_limit     INT         DEFAULT 20,
  p_user_id   UUID        DEFAULT NULL
)
RETURNS TABLE(
  id            uuid,
  author_id     uuid,
  content       text,
  post_type     text,
  trade_snapshot jsonb,
  channel_id    uuid,
  like_count    int4,
  comment_count int4,
  is_hidden     bool,
  created_at    timestamptz,
  updated_at    timestamptz,
  author        jsonb,
  is_liked_by_me bool
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fp.id,
    fp.author_id,
    fp.content,
    fp.post_type::text,
    fp.trade_snapshot,
    fp.channel_id,
    fp.like_count,
    fp.comment_count,
    fp.is_hidden,
    fp.created_at,
    fp.updated_at,
    jsonb_build_object(
      'id',           sp.id,
      'user_id',      sp.user_id,
      'display_name', sp.display_name,
      'username',     sp.username,
      'avatar_url',   sp.avatar_url,
      'tier',         sp.tier
    ) AS author,
    (fl.post_id IS NOT NULL) AS is_liked_by_me
  FROM feed_posts fp
  INNER JOIN social_profiles sp ON sp.id = fp.author_id
  LEFT JOIN social_profiles viewer ON viewer.user_id = p_user_id
  LEFT JOIN feed_likes fl
    ON fl.post_id = fp.id
    AND fl.user_id = viewer.id
  WHERE fp.is_hidden = false
    AND (p_cursor IS NULL OR fp.created_at < p_cursor)
  ORDER BY fp.created_at DESC
  LIMIT p_limit + 1
$$;


-- ──────────────────────────────────────────────────────────────
-- get_channel_feed
--
-- Same as get_public_feed but filtered to a specific channel.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_channel_feed(
  p_channel_id UUID,
  p_cursor     TIMESTAMPTZ DEFAULT NULL,
  p_limit      INT         DEFAULT 20,
  p_user_id    UUID        DEFAULT NULL
)
RETURNS TABLE(
  id            uuid,
  author_id     uuid,
  content       text,
  post_type     text,
  trade_snapshot jsonb,
  channel_id    uuid,
  like_count    int4,
  comment_count int4,
  is_hidden     bool,
  created_at    timestamptz,
  updated_at    timestamptz,
  author        jsonb,
  is_liked_by_me bool
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fp.id,
    fp.author_id,
    fp.content,
    fp.post_type::text,
    fp.trade_snapshot,
    fp.channel_id,
    fp.like_count,
    fp.comment_count,
    fp.is_hidden,
    fp.created_at,
    fp.updated_at,
    jsonb_build_object(
      'id',           sp.id,
      'user_id',      sp.user_id,
      'display_name', sp.display_name,
      'username',     sp.username,
      'avatar_url',   sp.avatar_url,
      'tier',         sp.tier
    ) AS author,
    (fl.post_id IS NOT NULL) AS is_liked_by_me
  FROM feed_posts fp
  INNER JOIN social_profiles sp ON sp.id = fp.author_id
  LEFT JOIN social_profiles viewer ON viewer.user_id = p_user_id
  LEFT JOIN feed_likes fl
    ON fl.post_id = fp.id
    AND fl.user_id = viewer.id
  WHERE fp.is_hidden = false
    AND fp.channel_id = p_channel_id
    AND (p_cursor IS NULL OR fp.created_at < p_cursor)
  ORDER BY fp.created_at DESC
  LIMIT p_limit + 1
$$;


-- ──────────────────────────────────────────────────────────────
-- get_timeline
--
-- Returns posts from users the viewer follows + their own posts.
-- Uses a JOIN on follows (not WHERE author_id IN(...)) so query
-- cost stays flat regardless of follow count.
-- CROSS JOIN with the profile subquery ensures the query returns
-- nothing if the user has no social profile.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_timeline(
  p_user_id  UUID,
  p_cursor   TIMESTAMPTZ DEFAULT NULL,
  p_limit    INT         DEFAULT 20
)
RETURNS TABLE(
  id            uuid,
  author_id     uuid,
  content       text,
  post_type     text,
  trade_snapshot jsonb,
  channel_id    uuid,
  like_count    int4,
  comment_count int4,
  is_hidden     bool,
  created_at    timestamptz,
  updated_at    timestamptz,
  author        jsonb,
  is_liked_by_me bool
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fp.id,
    fp.author_id,
    fp.content,
    fp.post_type::text,
    fp.trade_snapshot,
    fp.channel_id,
    fp.like_count,
    fp.comment_count,
    fp.is_hidden,
    fp.created_at,
    fp.updated_at,
    jsonb_build_object(
      'id',           sp.id,
      'user_id',      sp.user_id,
      'display_name', sp.display_name,
      'username',     sp.username,
      'avatar_url',   sp.avatar_url,
      'tier',         sp.tier
    ) AS author,
    (fl.post_id IS NOT NULL) AS is_liked_by_me
  FROM feed_posts fp
  INNER JOIN social_profiles sp ON sp.id = fp.author_id
  CROSS JOIN (
    SELECT id FROM social_profiles WHERE user_id = p_user_id LIMIT 1
  ) AS viewer
  LEFT JOIN follows f
    ON f.following_id = fp.author_id
    AND f.follower_id = viewer.id
  LEFT JOIN feed_likes fl
    ON fl.post_id = fp.id
    AND fl.user_id = viewer.id
  WHERE fp.is_hidden = false
    AND (fp.author_id = viewer.id OR f.following_id IS NOT NULL)
    AND (p_cursor IS NULL OR fp.created_at < p_cursor)
  ORDER BY fp.created_at DESC
  LIMIT p_limit + 1
$$;
