-- ============================================================
-- Teardown: Remove ALL performance test data
-- ============================================================
-- Run BEFORE and AFTER each test session to keep the DB clean.
-- All perf-test data is tagged with '@perf-test.invalid' emails.
-- FK cascades handle dependent rows automatically.
--
-- Usage:
--   psql "$DATABASE_URL" -f tests/load/seed/teardown.sql
-- ============================================================

BEGIN;

-- Delete test social profiles (cascades to feed_posts, feed_likes,
-- feed_comments, feed_notifications, follows, channel_members via FK)
DELETE FROM social_profiles
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email LIKE '%@perf-test.invalid'
);

-- Also remove test posts that were seeded directly (not via profile cascade)
-- In case FK doesn't cascade cleanly in all Supabase setups
DELETE FROM feed_posts
WHERE content LIKE '[PERF-TEST]%';

-- Remove auth users last (after profile cascade)
DELETE FROM auth.users
WHERE email LIKE '%@perf-test.invalid';

COMMIT;

\echo 'Teardown complete. All @perf-test.invalid data removed.'
