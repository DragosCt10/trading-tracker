-- ============================================================
-- Seed: Test users with 10, 100, 500 follows
-- ============================================================
-- Creates 3 test users + a pool of 500 dummy profiles to follow.
-- All test users tagged with @perf-test.invalid for easy cleanup.
--
-- Prerequisites: Run teardown.sql first to clear old test data.
--
-- Usage:
--   psql "$DATABASE_URL" -f tests/load/seed/seed-follows.sql
--
-- After seeding, run generate-tokens.mjs to get JWTs for k6.
-- ============================================================

BEGIN;

-- -------------------------------------------------------
-- 1. Create auth users for the 3 test profiles
-- -------------------------------------------------------
-- NOTE: In Supabase, you cannot INSERT directly into auth.users
-- from SQL in most setups. Use the Supabase Admin API instead.
-- The generate-tokens.mjs script handles user creation via Admin API.
--
-- This file handles ONLY the social_profiles + follows rows,
-- which require the auth.users rows to exist first.
-- Run generate-tokens.mjs BEFORE this SQL file.
-- -------------------------------------------------------

-- -------------------------------------------------------
-- 2. Create social profiles for the 3 test users
--    (auth user IDs come from generate-tokens.mjs output)
-- -------------------------------------------------------
-- Replace these UUIDs with the actual auth.users IDs from generate-tokens.mjs output.
-- They are written to .env.test as:
--   K6_USER_10FOLLOWS_ID, K6_USER_100FOLLOWS_ID, K6_USER_500FOLLOWS_ID

-- Test user profiles are created by generate-tokens.mjs via ensureSocialProfile().
-- This SQL creates the 500 dummy target profiles + the follows rows.

-- -------------------------------------------------------
-- 3. Create 500 dummy profiles to be followed
--    (these are the profiles our test users will follow)
-- -------------------------------------------------------
-- First: create auth.users rows for each dummy target (required by FK)
INSERT INTO auth.users (id, email, created_at, updated_at, aud, role, encrypted_password)
SELECT
  gen_random_uuid(),
  'perf_target_' || i || '@perf-test.invalid',
  now(),
  now(),
  'authenticated',
  'authenticated',
  ''
FROM generate_series(1, 500) AS i
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'perf_target_' || i || '@perf-test.invalid'
);

-- Then: create social_profiles linked to those auth.users
INSERT INTO social_profiles (id, user_id, display_name, username, bio, is_public, tier)
SELECT
  gen_random_uuid(),
  u.id,
  'PerfTest Target ' || row_number() OVER (ORDER BY u.email),
  'perf_target_' || row_number() OVER (ORDER BY u.email),
  'Performance test target profile',
  true,
  'starter'
FROM auth.users u
WHERE u.email LIKE 'perf_target_%@perf-test.invalid'
ON CONFLICT (username) DO NOTHING;

-- Store the target profile IDs for use in follows seeding
-- We'll use the most recently created 500 perf_target_ profiles
CREATE TEMP TABLE perf_target_ids AS
SELECT id
FROM social_profiles
WHERE username LIKE 'perf_target_%'
ORDER BY created_at DESC
LIMIT 500;

-- -------------------------------------------------------
-- 4. Create follows rows
-- -------------------------------------------------------
-- INSTRUCTIONS:
-- Replace '<USER_10FOLLOWS_PROFILE_ID>' etc. with the social_profiles.id
-- values from generate-tokens.mjs output (written to .env.test).
--
-- Example (replace with real IDs):
--   \set user10_profile_id '<UUID_FROM_GENERATE_TOKENS>'
--   \set user100_profile_id '<UUID_FROM_GENERATE_TOKENS>'
--   \set user500_profile_id '<UUID_FROM_GENERATE_TOKENS>'

-- The generate-tokens.mjs script prints these IDs after creation.
-- Until then, this is a template — substitute the actual IDs.

-- User with 10 follows: follows the first 10 target profiles
INSERT INTO follows (follower_id, following_id)
SELECT '727cfd8b-6c5b-4b5e-aee8-6b9e319cae5e'::uuid, id
FROM perf_target_ids
LIMIT 10
ON CONFLICT DO NOTHING;

-- User with 100 follows: follows the first 100 target profiles
INSERT INTO follows (follower_id, following_id)
SELECT 'ffcac5f5-e096-4338-ab50-535dc6d45983'::uuid, id
FROM perf_target_ids
LIMIT 100
ON CONFLICT DO NOTHING;

-- User with 500 follows: follows all 500 target profiles
INSERT INTO follows (follower_id, following_id)
SELECT '534f31b4-90d2-43e2-9782-3132a0be551e'::uuid, id
FROM perf_target_ids
LIMIT 500
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- 5. Create some posts from the target profiles
--    so the following feed actually returns results
-- -------------------------------------------------------
INSERT INTO feed_posts (id, author_id, content, post_type, is_hidden)
SELECT
  gen_random_uuid(),
  pt.id,
  '[PERF-TEST] Sample post ' || row_number() OVER () || ' from target profile for timeline testing',
  'text',
  false
FROM perf_target_ids pt
CROSS JOIN generate_series(1, 2) -- 2 posts per target = up to 1000 posts in following feed
ORDER BY random()
LIMIT 200; -- cap at 200 posts to keep baseline manageable

COMMIT;

\echo ''
\echo 'Seed complete. Next steps:'
\echo '1. Run: node tests/load/seed/generate-tokens.mjs'
\echo '2. That script will print profile IDs and write JWTs to .env.test'
\echo '3. Edit this file: uncomment the INSERT INTO follows blocks'
\echo '4. Replace the placeholder UUIDs with real IDs from .env.test'
\echo '5. Re-run this file to insert the follows rows'
\echo ''
\echo 'Target profiles created: 500 (perf_target_1 ... perf_target_500)'
\echo 'Test posts created: up to 200'
