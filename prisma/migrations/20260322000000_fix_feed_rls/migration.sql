-- ─── Fix: RLS policy circular column references ────────────────────────────
--
-- The original migration used `WHERE id = user_id` inside subqueries on
-- social_profiles. Because social_profiles also has a `user_id` column, the
-- unqualified `user_id` was resolved as `social_profiles.user_id` (the auth
-- user UUID), not the NEW/OLD row's `user_id` (the profile UUID). This made
-- the check compare the profile primary key against itself — effectively
-- blocking or incorrectly passing all INSERT/DELETE operations.
--
-- Fix: use explicit table-qualified references (feed_likes.user_id /
-- channel_members.user_id) so PostgreSQL resolves them from the outer context,
-- not from the subquery's own columns.

-- ─── feed_likes ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "likes_insert"     ON public.feed_likes;
DROP POLICY IF EXISTS "likes_delete_own" ON public.feed_likes;

CREATE POLICY "likes_insert" ON public.feed_likes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.social_profiles sp
      WHERE sp.id = feed_likes.user_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "likes_delete_own" ON public.feed_likes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.social_profiles sp
      WHERE sp.id = feed_likes.user_id
        AND sp.user_id = auth.uid()
    )
  );

-- ─── channel_members ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "channel_members_insert_own" ON public.channel_members;
DROP POLICY IF EXISTS "channel_members_delete_own" ON public.channel_members;

CREATE POLICY "channel_members_insert_own" ON public.channel_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.social_profiles sp
      WHERE sp.id = channel_members.user_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "channel_members_delete_own" ON public.channel_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.social_profiles sp
      WHERE sp.id = channel_members.user_id
        AND sp.user_id = auth.uid()
    )
  );
