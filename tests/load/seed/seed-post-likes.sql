-- ============================================================
-- Seed: A public post for the concurrent like-toggle load test
-- ============================================================
-- Creates one highly-visible post from the perf-test public user.
-- The like-toggle k6 test hammers this post with 50 concurrent VUs.
--
-- Prerequisites:
--   1. Run generate-tokens.mjs first (creates the auth user + profile)
--   2. Replace <PUBLIC_USER_PROFILE_ID> with the actual profile ID
--      from .env.test (K6_USER_PUBLIC_PROFILE_ID)
--
-- Usage:
--   psql "$DATABASE_URL" -f tests/load/seed/seed-post-likes.sql
--
-- After seeding, note the printed post_id — set it as K6_LIKE_POST_ID in .env.test
-- ============================================================

BEGIN;

-- Insert the target post
-- Replace <PUBLIC_USER_PROFILE_ID> with the real UUID from .env.test
WITH inserted AS (
  INSERT INTO feed_posts (id, author_id, content, post_type, is_hidden)
  VALUES (
    gen_random_uuid(),
    -- TODO: Replace with K6_USER_PUBLIC_PROFILE_ID from .env.test
    -- Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
    (SELECT id FROM social_profiles WHERE username = 'perf_public_user' LIMIT 1),
    '[PERF-TEST] Like-toggle load test target post — do not delete',
    'text',
    false
  )
  RETURNING id, author_id, created_at
)
SELECT
  id AS post_id,
  author_id,
  created_at,
  'Add this to .env.test as: K6_LIKE_POST_ID=' || id AS next_step
FROM inserted;

COMMIT;

\echo ''
\echo 'Seed complete. Copy the post_id above and add to .env.test:'
\echo '  K6_LIKE_POST_ID=<uuid printed above>'
