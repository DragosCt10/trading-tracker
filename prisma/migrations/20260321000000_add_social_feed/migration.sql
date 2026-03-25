-- ─── Social Feed: Enums ────────────────────────────────────────────────────

CREATE TYPE public.post_type AS ENUM ('text', 'trade_share');
CREATE TYPE public.notification_type AS ENUM ('like', 'comment', 'follow');

-- ─── social_profiles ───────────────────────────────────────────────────────

CREATE TABLE public.social_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    VARCHAR(100) NOT NULL,
  username        VARCHAR(50)  NOT NULL UNIQUE,
  bio             VARCHAR(280),
  avatar_url      TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
  ban_log         JSONB,
  follower_count  INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  -- Denormalized from subscriptions; updated by subscription server actions
  tier            VARCHAR(20)  NOT NULL DEFAULT 'starter',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_social_profiles_username ON public.social_profiles (username);
CREATE INDEX idx_social_profiles_user_id  ON public.social_profiles (user_id);

-- ─── feed_channels ─────────────────────────────────────────────────────────
-- Created before feed_posts so the FK can reference it

CREATE TABLE public.feed_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_channels_owner ON public.feed_channels (owner_id);

-- ─── feed_posts ────────────────────────────────────────────────────────────

CREATE TABLE public.feed_posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id      UUID              NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  content        TEXT              NOT NULL,
  post_type      public.post_type  NOT NULL DEFAULT 'text',
  -- Original trade ID for reference only; display uses trade_snapshot
  trade_id       UUID,
  trade_mode     VARCHAR(20),
  -- Denormalized snapshot — feed never joins trade tables
  trade_snapshot JSONB,
  channel_id     UUID              REFERENCES public.feed_channels(id) ON DELETE SET NULL,
  like_count     INTEGER           NOT NULL DEFAULT 0,
  comment_count  INTEGER           NOT NULL DEFAULT 0,
  is_hidden      BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_posts_author_created  ON public.feed_posts (author_id, created_at DESC);
CREATE INDEX idx_feed_posts_channel_created ON public.feed_posts (channel_id, created_at DESC);
CREATE INDEX idx_feed_posts_created         ON public.feed_posts (created_at DESC);

-- Full-text search index on post content
CREATE INDEX idx_feed_posts_content_gin
  ON public.feed_posts
  USING gin(to_tsvector('english', content));

-- ─── feed_comments ─────────────────────────────────────────────────────────

CREATE TABLE public.feed_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID         NOT NULL REFERENCES public.feed_posts(id)    ON DELETE CASCADE,
  author_id  UUID         NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  content    VARCHAR(500) NOT NULL,
  parent_id  UUID                  REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  is_hidden  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_comments_post_created ON public.feed_comments (post_id, created_at ASC);

-- ─── feed_likes ────────────────────────────────────────────────────────────

CREATE TABLE public.feed_likes (
  post_id    UUID        NOT NULL REFERENCES public.feed_posts(id)      ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_feed_likes_post_user ON public.feed_likes (post_id, user_id);

-- ─── follows ───────────────────────────────────────────────────────────────

CREATE TABLE public.follows (
  follower_id  UUID        NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  -- Prevent self-follows at DB level
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX idx_follows_follower  ON public.follows (follower_id);
CREATE INDEX idx_follows_following ON public.follows (following_id);

-- ─── feed_notifications ────────────────────────────────────────────────────

CREATE TABLE public.feed_notifications (
  id           UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID                      NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  actor_id     UUID                      NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  type         public.notification_type  NOT NULL,
  post_id      UUID                      REFERENCES public.feed_posts(id)    ON DELETE CASCADE,
  comment_id   UUID,   -- no FK — comment deletions are OK if notification remains
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_notifications_recipient
  ON public.feed_notifications (recipient_id, is_read, created_at DESC);

-- ─── channel_members ───────────────────────────────────────────────────────

CREATE TABLE public.channel_members (
  channel_id UUID        NOT NULL REFERENCES public.feed_channels(id)   ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- ─── feed_reports ──────────────────────────────────────────────────────────

CREATE TABLE public.feed_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID         NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  post_id     UUID                  REFERENCES public.feed_posts(id)      ON DELETE CASCADE,
  comment_id  UUID,   -- soft reference; comment may be deleted
  reason      VARCHAR(500) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_reports_status   ON public.feed_reports (status, created_at DESC);
CREATE INDEX idx_feed_reports_reporter ON public.feed_reports (reporter_id);

-- ─── Triggers: denormalized counters ───────────────────────────────────────
-- Maintained atomically at DB level — application code never touches counters.

-- like_count on feed_posts
CREATE OR REPLACE FUNCTION public.update_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_like_count
  AFTER INSERT OR DELETE ON public.feed_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();

-- comment_count on feed_posts
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_comment_count
  AFTER INSERT OR DELETE ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();

-- follower_count / following_count on social_profiles
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_profiles SET follower_count  = follower_count  + 1 WHERE id = NEW.following_id;
    UPDATE public.social_profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_profiles SET follower_count  = GREATEST(follower_count  - 1, 0) WHERE id = OLD.following_id;
    UPDATE public.social_profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.social_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_channels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_reports       ENABLE ROW LEVEL SECURITY;

-- social_profiles: all authenticated users can read public non-banned profiles
CREATE POLICY "profiles_select" ON public.social_profiles
  FOR SELECT USING (is_public = TRUE AND is_banned = FALSE);

-- Users can always read their own profile (even when is_public = false)
CREATE POLICY "profiles_select_own" ON public.social_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own profile (ensureSocialProfile)
CREATE POLICY "profiles_insert_own" ON public.social_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.social_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- feed_posts: all authenticated users can read non-hidden posts
CREATE POLICY "posts_select" ON public.feed_posts
  FOR SELECT USING (is_hidden = FALSE);

CREATE POLICY "posts_insert_own" ON public.feed_posts
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = author_id)
  );

CREATE POLICY "posts_update_own" ON public.feed_posts
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = author_id)
  );

CREATE POLICY "posts_delete_own" ON public.feed_posts
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = author_id)
  );

-- feed_comments
CREATE POLICY "comments_select" ON public.feed_comments
  FOR SELECT USING (is_hidden = FALSE);

CREATE POLICY "comments_insert" ON public.feed_comments
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = author_id)
    AND (SELECT is_hidden FROM public.feed_posts WHERE id = post_id) = FALSE
  );

CREATE POLICY "comments_update_own" ON public.feed_comments
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = author_id)
  );

CREATE POLICY "comments_delete_own" ON public.feed_comments
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = author_id)
  );

-- feed_likes
CREATE POLICY "likes_select" ON public.feed_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "likes_insert" ON public.feed_likes
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = user_id)
  );

CREATE POLICY "likes_delete_own" ON public.feed_likes
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = user_id)
  );

-- follows
CREATE POLICY "follows_select" ON public.follows
  FOR SELECT USING (TRUE);

CREATE POLICY "follows_insert" ON public.follows
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = follower_id)
  );

CREATE POLICY "follows_delete_own" ON public.follows
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = follower_id)
  );

-- feed_notifications: users can only read/update their own
CREATE POLICY "notifications_select_own" ON public.feed_notifications
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = recipient_id)
  );

CREATE POLICY "notifications_update_own" ON public.feed_notifications
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = recipient_id)
  );

CREATE POLICY "notifications_insert_actor" ON public.feed_notifications
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = actor_id)
  );

-- feed_channels: members can read
CREATE POLICY "channels_select" ON public.feed_channels
  FOR SELECT USING (
    is_public = TRUE
    OR auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = owner_id)
    OR EXISTS (
      SELECT 1 FROM public.channel_members cm
      JOIN public.social_profiles sp ON sp.id = cm.user_id
      WHERE cm.channel_id = feed_channels.id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "channels_insert_own" ON public.feed_channels
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = owner_id)
  );

CREATE POLICY "channels_update_own" ON public.feed_channels
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = owner_id)
  );

CREATE POLICY "channels_delete_own" ON public.feed_channels
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = owner_id)
  );

-- channel_members
CREATE POLICY "channel_members_select" ON public.channel_members
  FOR SELECT USING (TRUE);

CREATE POLICY "channel_members_insert_own" ON public.channel_members
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = user_id)
  );

CREATE POLICY "channel_members_delete_own" ON public.channel_members
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = user_id)
  );

-- feed_reports: authenticated users can insert; service role handles admin reads
CREATE POLICY "reports_insert" ON public.feed_reports
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = reporter_id)
  );

CREATE POLICY "reports_select_own" ON public.feed_reports
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.social_profiles WHERE id = reporter_id)
  );
