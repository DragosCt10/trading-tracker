-- ============================================================
-- Feed helper functions
-- toggle_like, acquire_post_lock, get_public_feed,
-- get_channel_feed, get_timeline
-- ============================================================


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
    COALESCE(fc.comment_count, 0)::int4 AS comment_count,
    fp.is_hidden,
    fp.created_at,
    fp.updated_at,
    jsonb_build_object(
      'id',           sp.id,
      'user_id',      sp.user_id,
      'display_name', sp.display_name,
      'username',     sp.username,
      'avatar_url',   sp.avatar_url,
      'tier',         sp.tier,
      'is_public',    sp.is_public
    ) AS author,
    (fl.post_id IS NOT NULL) AS is_liked_by_me
  FROM public.feed_posts fp
  INNER JOIN public.social_profiles sp ON sp.id = fp.author_id
  LEFT JOIN public.social_profiles viewer ON viewer.user_id = p_user_id
  LEFT JOIN public.feed_likes fl
    ON fl.post_id = fp.id
    AND fl.user_id = viewer.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS comment_count
    FROM public.feed_comments c
    WHERE c.post_id = fp.id
      AND c.is_hidden = false
  ) fc ON true
  WHERE fp.is_hidden = false
    AND (p_cursor IS NULL OR fp.created_at < p_cursor)
  ORDER BY fp.created_at DESC
  LIMIT p_limit + 1
$$;


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
    COALESCE(fc.comment_count, 0)::int4 AS comment_count,
    fp.is_hidden,
    fp.created_at,
    fp.updated_at,
    jsonb_build_object(
      'id',           sp.id,
      'user_id',      sp.user_id,
      'display_name', sp.display_name,
      'username',     sp.username,
      'avatar_url',   sp.avatar_url,
      'tier',         sp.tier,
      'is_public',    sp.is_public
    ) AS author,
    (fl.post_id IS NOT NULL) AS is_liked_by_me
  FROM public.feed_posts fp
  INNER JOIN public.social_profiles sp ON sp.id = fp.author_id
  LEFT JOIN public.social_profiles viewer ON viewer.user_id = p_user_id
  LEFT JOIN public.feed_likes fl
    ON fl.post_id = fp.id
    AND fl.user_id = viewer.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS comment_count
    FROM public.feed_comments c
    WHERE c.post_id = fp.id
      AND c.is_hidden = false
  ) fc ON true
  WHERE fp.is_hidden = false
    AND fp.channel_id = p_channel_id
    AND (p_cursor IS NULL OR fp.created_at < p_cursor)
  ORDER BY fp.created_at DESC
  LIMIT p_limit + 1
$$;


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
    COALESCE(fc.comment_count, 0)::int4 AS comment_count,
    fp.is_hidden,
    fp.created_at,
    fp.updated_at,
    jsonb_build_object(
      'id',           sp.id,
      'user_id',      sp.user_id,
      'display_name', sp.display_name,
      'username',     sp.username,
      'avatar_url',   sp.avatar_url,
      'tier',         sp.tier,
      'is_public',    sp.is_public
    ) AS author,
    (fl.post_id IS NOT NULL) AS is_liked_by_me
  FROM public.feed_posts fp
  INNER JOIN public.social_profiles sp ON sp.id = fp.author_id
  CROSS JOIN (
    SELECT id FROM public.social_profiles WHERE user_id = p_user_id LIMIT 1
  ) AS viewer
  LEFT JOIN public.follows f
    ON f.following_id = fp.author_id
    AND f.follower_id = viewer.id
  LEFT JOIN public.feed_likes fl
    ON fl.post_id = fp.id
    AND fl.user_id = viewer.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS comment_count
    FROM public.feed_comments c
    WHERE c.post_id = fp.id
      AND c.is_hidden = false
  ) fc ON true
  WHERE fp.is_hidden = false
    AND (fp.author_id = viewer.id OR f.following_id IS NOT NULL)
    AND (p_cursor IS NULL OR fp.created_at < p_cursor)
  ORDER BY fp.created_at DESC
  LIMIT p_limit + 1
$$;
