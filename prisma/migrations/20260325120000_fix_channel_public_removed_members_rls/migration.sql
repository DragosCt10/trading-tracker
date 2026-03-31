-- ─── Fix: channel_public_removed_members SELECT policy column resolution ──────
--
-- The original policy used unqualified `user_id` inside the subquery:
--   WHERE sp.id = user_id AND sp.user_id = auth.uid()
--
-- Because social_profiles also has a `user_id` column, PostgreSQL resolved
-- the unqualified `user_id` as `social_profiles.user_id` (the auth UUID), not
-- `channel_public_removed_members.user_id` (the profile UUID). This made the
-- check compare the profile primary key against the auth UUID — always false —
-- so the EXISTS returned false for every row and NO removal records were ever
-- visible. The result: every removal check returned count = 0, the restriction
-- was silently bypassed, and removed users could rejoin, post, and comment.
--
-- Fix: qualify `user_id` with the outer table name so PostgreSQL resolves it
-- correctly, matching the pattern already applied to channel_members in
-- migration 20260322000000_fix_feed_rls.

DROP POLICY IF EXISTS "channel_public_removed_members_select_own"
  ON public.channel_public_removed_members;

CREATE POLICY "channel_public_removed_members_select_own"
  ON public.channel_public_removed_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.social_profiles sp
      WHERE sp.id = channel_public_removed_members.user_id
        AND sp.user_id = auth.uid()
    )
  );
