-- ============================================================
-- Seed: Post with 1000 comments (stress test for comment section)
-- ============================================================
-- Creates a post and 1000 top-level comments on it.
-- Used to stress-test:
--   - S2: /feed/post/[id] detail page LCP with 1000 comments in DB
--   - Q8: EXPLAIN ANALYZE for comment fetch query
--
-- Prerequisites:
--   1. Run generate-tokens.mjs first
--   2. Replace <PUBLIC_USER_PROFILE_ID> with real UUID from .env.test
--
-- Usage:
--   psql "$DATABASE_URL" -f tests/load/seed/seed-1000-comments.sql
-- ============================================================

BEGIN;

-- Create the post
WITH post AS (
  INSERT INTO feed_posts (id, author_id, content, post_type, is_hidden)
  VALUES (
    gen_random_uuid(),
    -- TODO: Replace with K6_USER_PUBLIC_PROFILE_ID from .env.test
    (SELECT id FROM social_profiles WHERE username = 'perf_public_user' LIMIT 1),
    '[PERF-TEST] 1000-comment stress test post — do not delete',
    'text',
    false
  )
  RETURNING id, author_id
),
-- Create 1000 top-level comments from the same profile
comments AS (
  INSERT INTO feed_comments (id, post_id, author_id, content, parent_id, is_hidden)
  SELECT
    gen_random_uuid(),
    post.id,
    post.author_id,
    '[PERF-TEST] Comment ' || generate_series || ' — load test comment, auto-generated',
    NULL,
    false
  FROM post, generate_series(1, 1000)
  RETURNING post_id
)
SELECT
  post.id AS post_id,
  COUNT(comments.post_id) AS comments_inserted,
  'Add to .env.test as: K6_COMMENT_POST_ID=' || post.id AS next_step
FROM post
LEFT JOIN comments ON comments.post_id = post.id
GROUP BY post.id;

COMMIT;

\echo ''
\echo 'Seed complete. 1000 comments inserted.'
\echo 'Copy the post_id above and add to .env.test:'
\echo '  K6_COMMENT_POST_ID=<uuid printed above>'
\echo ''
\echo 'Verify with:'
\echo '  SELECT COUNT(*) FROM feed_comments WHERE content LIKE '"'"'[PERF-TEST]%'"'"';'
