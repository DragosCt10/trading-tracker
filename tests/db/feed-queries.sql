-- ============================================================
-- Feed Performance: EXPLAIN ANALYZE Query Suite
-- ============================================================
-- Run against your Supabase PostgreSQL instance:
--   psql "$DATABASE_URL" -f tests/db/feed-queries.sql 2>&1 | tee tests/db/results/baseline-$(date +%Y%m%d).txt
--
-- Pass/fail criteria:
--   Q1-Q2: Index Scan Backward on idx_feed_posts_created, exec < 10ms
--   Q3:    Index Scan on idx_feed_likes_post_user, exec < 5ms
--   Q4:    Index Scan on idx_follows_follower, exec < 1ms
--   Q5:    Index Scan on idx_feed_posts_author_created, exec < 15ms
--   Q6:    Index Scan (flag if Seq Scan), exec < 200ms
--   Q7:    Bitmap Index Scan on GIN index, exec < 50ms  <-- LIKELY FAILS (missing index)
--   Q8:    Index Scan on idx_feed_comments_post_created, exec < 10ms
--   Q9:    Index Only Scan on idx_feed_posts_author_created, exec < 5ms
--   Q10:   Cursor cost stable across pages; offset cost grows linearly
--   Q11:   Documents redundant index on feed_likes (PK + extra idx)
-- ============================================================

\echo '=========================================================='
\echo 'Q1: Public feed page 1 (no cursor)'
\echo 'Expected: Index Scan Backward on idx_feed_posts_created'
\echo 'Pass threshold: exec < 10ms'
\echo '=========================================================='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  fp.id, fp.author_id, fp.content, fp.post_type, fp.trade_snapshot,
  fp.channel_id, fp.like_count, fp.comment_count, fp.is_hidden, fp.created_at, fp.updated_at,
  sp.id AS profile_id, sp.user_id, sp.display_name, sp.username, sp.avatar_url, sp.tier
FROM feed_posts fp
JOIN social_profiles sp ON sp.id = fp.author_id
WHERE fp.is_hidden = false
ORDER BY fp.created_at DESC
LIMIT 21;

\echo ''
\echo '=========================================================='
\echo 'Q2: Public feed page 2 (with cursor — ISO timestamp)'
\echo 'Expected: Index Scan Backward on idx_feed_posts_created + cursor filter'
\echo 'Pass threshold: exec < 10ms, same plan as Q1'
\echo '=========================================================='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  fp.id, fp.author_id, fp.content, fp.post_type, fp.trade_snapshot,
  fp.channel_id, fp.like_count, fp.comment_count, fp.is_hidden, fp.created_at, fp.updated_at,
  sp.id AS profile_id, sp.user_id, sp.display_name, sp.username, sp.avatar_url, sp.tier
FROM feed_posts fp
JOIN social_profiles sp ON sp.id = fp.author_id
WHERE fp.is_hidden = false
  AND fp.created_at < NOW() - INTERVAL '1 hour'
ORDER BY fp.created_at DESC
LIMIT 21;

\echo ''
\echo '=========================================================='
\echo 'Q3: resolveIsLikedByMe — fetches liked status for 20 posts'
\echo 'Expected: Index Scan on idx_feed_likes_post_user (composite PK also covers this)'
\echo 'Pass threshold: exec < 5ms'
\echo 'Note: Supabase uses = ANY(ARRAY[...]) not IN(...)'
\echo '=========================================================='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT post_id
FROM feed_likes
WHERE post_id = ANY(
  -- Substitute 20 real post UUIDs from your DB for a real measurement.
  -- Using gen_random_uuid() here just tests the plan shape.
  ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ]::uuid[]
)
AND user_id = gen_random_uuid();

\echo ''
\echo '=========================================================='
\echo 'Q4: getTimeline step 1 — fetch all follows for a user'
\echo 'Expected: Index Scan on idx_follows_follower'
\echo 'Pass threshold: exec < 1ms'
\echo '=========================================================='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT following_id
FROM follows
WHERE follower_id = gen_random_uuid();

\echo ''
\echo '=========================================================='
\echo 'Q5: getTimeline IN() with 10 follows'
\echo 'Expected: Index Scan on idx_feed_posts_author_created'
\echo 'Pass threshold: exec < 15ms'
\echo '=========================================================='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  fp.id, fp.author_id, fp.content, fp.like_count, fp.comment_count, fp.created_at,
  sp.id AS profile_id, sp.display_name, sp.username, sp.avatar_url, sp.tier
FROM feed_posts fp
JOIN social_profiles sp ON sp.id = fp.author_id
WHERE fp.is_hidden = false
  AND fp.author_id = ANY(ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ]::uuid[])
ORDER BY fp.created_at DESC
LIMIT 21;

\echo ''
\echo '=========================================================='
\echo 'Q6: getTimeline IN() with 500 follows — THE KNOWN BOTTLENECK'
\echo 'Expected: Index Scan (flag if planner switches to Seq Scan)'
\echo 'Pass threshold: exec < 200ms; WARN if Seq Scan appears'
\echo 'At small table sizes this may still use index; degrades as feed_posts grows'
\echo '=========================================================='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  fp.id, fp.author_id, fp.content, fp.like_count, fp.comment_count, fp.created_at,
  sp.id AS profile_id, sp.display_name, sp.username, sp.avatar_url, sp.tier
FROM feed_posts fp
JOIN social_profiles sp ON sp.id = fp.author_id
WHERE fp.is_hidden = false
  AND fp.author_id = ANY(ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    -- ... (Paste 450 more UUIDs from your actual follows table for a real measurement)
    -- For now this tests planner behavior with 50 UUIDs as a proxy.
    -- Replace with: SELECT array_agg(following_id) FROM follows WHERE follower_id = '<heavy_user_id>'
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ]::uuid[])
ORDER BY fp.created_at DESC
LIMIT 21;

\echo ''
\echo '=========================================================='
\echo 'Q7: Full-text search — GIN index check'
\echo 'Expected: Bitmap Index Scan on GIN index (to_tsvector)'
\echo 'CRITICAL: If this shows Seq Scan, the GIN index does not exist.'
\echo 'Fix: CREATE INDEX CONCURRENTLY idx_feed_posts_content_fts'
\echo '     ON feed_posts USING GIN (to_tsvector(''english'', content));'
\echo 'Pass threshold: exec < 50ms'
\echo '=========================================================='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, content, created_at, like_count, comment_count
FROM feed_posts
WHERE is_hidden = false
  AND to_tsvector('english', content) @@ websearch_to_tsquery('english', 'bitcoin trade')
ORDER BY created_at DESC
LIMIT 21;

\echo ''
\echo '=========================================================='
\echo 'Q7b: Verify GIN index existence'
\echo '=========================================================='
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'feed_posts'
  AND indexdef ILIKE '%gin%'
ORDER BY indexname;

\echo ''
\echo '=========================================================='
\echo 'Q8: Comment fetch for a post (tests idx_feed_comments_post_created)'
\echo 'Expected: Index Scan on idx_feed_comments_post_created'
\echo 'Pass threshold: exec < 10ms even with 1000 comments'
\echo 'Note: Replace gen_random_uuid() with a real post_id that has many comments'
\echo '=========================================================='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  fc.id, fc.post_id, fc.author_id, fc.content, fc.parent_id, fc.is_hidden, fc.created_at,
  sp.id AS profile_id, sp.display_name, sp.username, sp.avatar_url, sp.tier
FROM feed_comments fc
JOIN social_profiles sp ON sp.id = fc.author_id
WHERE fc.post_id = gen_random_uuid()
  AND fc.is_hidden = false
  AND fc.parent_id IS NULL
ORDER BY fc.created_at ASC
LIMIT 31;

\echo ''
\echo '=========================================================='
\echo 'Q9: Weekly post count check (called on every createPost)'
\echo 'Expected: Index Only Scan on idx_feed_posts_author_created'
\echo 'Pass threshold: exec < 5ms'
\echo 'CRITICAL: If this Seq Scans, every post creation pays a full table scan'
\echo '=========================================================='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*)
FROM feed_posts
WHERE author_id = gen_random_uuid()
  AND created_at >= date_trunc('week', NOW());

\echo ''
\echo '=========================================================='
\echo 'Q10: Cursor vs offset pagination comparison (page 5 equivalent)'
\echo 'Cursor-based cost should be stable; offset cost grows with depth'
\echo '=========================================================='

\echo '--- Q10a: Cursor-based page 5 (current implementation) ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT fp.id, fp.created_at
FROM feed_posts fp
WHERE fp.is_hidden = false
  AND fp.created_at < NOW() - INTERVAL '4 hours'
ORDER BY fp.created_at DESC
LIMIT 21;

\echo '--- Q10b: Offset-based page 5 (DO NOT USE — for comparison only) ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT fp.id, fp.created_at
FROM feed_posts fp
WHERE fp.is_hidden = false
ORDER BY fp.created_at DESC
LIMIT 21 OFFSET 80;

\echo ''
\echo '=========================================================='
\echo 'Q11: Redundant index audit on feed_likes'
\echo 'The composite PK (post_id, user_id) already serves as a B-tree index.'
\echo 'The @@index([post_id, user_id]) in schema.prisma creates a DUPLICATE index.'
\echo 'Fix: Remove @@index([post_id, user_id], map: "idx_feed_likes_post_user") from schema.prisma'
\echo '     and run npm run db:push to drop it.'
\echo '=========================================================='
SELECT
  indexname,
  indexdef,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE tablename = 'feed_likes'
ORDER BY indexname;

\echo ''
\echo '=========================================================='
\echo 'BONUS: All feed_posts indexes — verify all expected indexes exist'
\echo '=========================================================='
SELECT
  indexname,
  indexdef,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE tablename = 'feed_posts'
ORDER BY indexname;

\echo ''
\echo '=========================================================='
\echo 'DONE. Review output for:'
\echo '  - "Seq Scan" on Q7 = missing GIN index (critical)'
\echo '  - "Seq Scan" on Q6 at scale = IN() bottleneck confirmed'
\echo '  - "Seq Scan" on Q9 = missing index on (author_id, created_at)'
\echo '  - Two indexes on feed_likes in Q11 = redundant (remove one)'
\echo '=========================================================='
