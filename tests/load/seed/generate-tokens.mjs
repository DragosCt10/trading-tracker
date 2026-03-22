#!/usr/bin/env node
// ============================================================
// generate-tokens.mjs — Pre-generate Supabase JWTs for k6 tests
// ============================================================
// Creates 4 test users in Supabase Auth, ensures their social_profiles
// exist, and writes JWTs + profile IDs to .env.test for k6 to consume.
//
// Usage:
//   node tests/load/seed/generate-tokens.mjs
//
// Requires:
//   NEXT_PUBLIC_SUPABASE_URL=... in .env.local
//   SUPABASE_SERVICE_ROLE_KEY=... in .env.local  (not the anon key)
//   @supabase/supabase-js (already in package.json)
//
// The SUPABASE_SERVICE_ROLE_KEY is in your Supabase Dashboard:
//   Settings → API → service_role key (keep this server-side only)
//
// Output: writes .env.test with:
//   K6_TOKEN_PUBLIC, K6_TOKEN_10FOLLOWS, K6_TOKEN_100FOLLOWS, K6_TOKEN_500FOLLOWS
//   K6_USER_PUBLIC_PROFILE_ID, K6_USER_10FOLLOWS_PROFILE_ID, etc.
//   K6_SUPABASE_URL
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');

// Load env from .env.local
function loadEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
  return env;
}

const env = loadEnv(join(ROOT, '.env.local'));
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
const ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('Add SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard → Settings → API');
  process.exit(1);
}

// Admin client (bypasses RLS) for user creation
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Regular client (uses anon key) for sign-in and profile creation
const client = createClient(SUPABASE_URL, ANON_KEY);

const TEST_USERS = [
  {
    email: 'perf_public@perf-test.invalid',
    password: 'PerftestPublic123!',
    username: 'perf_public_user',
    displayName: 'Perf Test Public',
    envKey: 'PUBLIC',
  },
  {
    email: 'perf_10follows@perf-test.invalid',
    password: 'PerfTest10Follows123!',
    username: 'perf_10follows_user',
    displayName: 'Perf Test 10 Follows',
    envKey: '10FOLLOWS',
  },
  {
    email: 'perf_100follows@perf-test.invalid',
    password: 'PerfTest100Follows123!',
    username: 'perf_100follows_user',
    displayName: 'Perf Test 100 Follows',
    envKey: '100FOLLOWS',
  },
  {
    email: 'perf_500follows@perf-test.invalid',
    password: 'PerfTest500Follows123!',
    username: 'perf_500follows_user',
    displayName: 'Perf Test 500 Follows',
    envKey: '500FOLLOWS',
  },
];

async function ensureUser(user) {
  console.log(`\n→ Processing ${user.email}...`);

  // Try to create user via Admin API
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true, // Skip email confirmation
  });

  let authUserId;
  if (createError) {
    if (createError.message?.includes('already exists') || createError.message?.includes('already registered') || createError.message?.includes('already been registered')) {
      console.log(`  User already exists, fetching ID...`);
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find(u => u.email === user.email);
      if (!existing) throw new Error(`User ${user.email} exists but can't be found`);
      authUserId = existing.id;
    } else {
      throw new Error(`Failed to create user ${user.email}: ${createError.message}`);
    }
  } else {
    authUserId = created.user.id;
    console.log(`  Created auth user: ${authUserId}`);
  }

  // Sign in to get JWT token
  const { data: session, error: signInError } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signInError) throw new Error(`Sign-in failed for ${user.email}: ${signInError.message}`);

  const token = session.session.access_token;
  console.log(`  JWT obtained (expires: ${new Date(session.session.expires_at * 1000).toISOString()})`);

  // Ensure social_profile exists (using admin client to bypass RLS)
  const { data: existingProfile } = await admin
    .from('social_profiles')
    .select('id')
    .eq('user_id', authUserId)
    .single();

  let profileId;
  if (existingProfile) {
    profileId = existingProfile.id;
    console.log(`  Profile already exists: ${profileId}`);
  } else {
    const { data: newProfile, error: profileError } = await admin
      .from('social_profiles')
      .insert({
        user_id: authUserId,
        display_name: user.displayName,
        username: user.username,
        is_public: true,
        tier: 'pro', // Use 'pro' so test users can create posts and channels
      })
      .select('id')
      .single();

    if (profileError) throw new Error(`Failed to create profile for ${user.email}: ${profileError.message}`);
    profileId = newProfile.id;
    console.log(`  Created profile: ${profileId}`);
  }

  return { token, profileId, authUserId };
}

async function main() {
  console.log('=== Feed Performance Test: Token Generator ===');
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  const results = {};

  for (const user of TEST_USERS) {
    try {
      const { token, profileId, authUserId } = await ensureUser(user);
      results[user.envKey] = { token, profileId, authUserId, email: user.email };
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      process.exit(1);
    }
  }

  // Read existing .env.test to preserve manually-set values (post IDs, anon key, etc.)
  const existingEnv = loadEnv(join(ROOT, '.env.test'));

  // Write .env.test — preserve post IDs and other manual vars
  const envLines = [
    '# Auto-generated by tests/load/seed/generate-tokens.mjs',
    '# DO NOT COMMIT — contains sensitive test credentials',
    `# Generated: ${new Date().toISOString()}`,
    '',
    `K6_SUPABASE_URL=${SUPABASE_URL}`,
    `K6_ANON_KEY=${ANON_KEY}`,
    `K6_APP_URL=${existingEnv['K6_APP_URL'] || 'http://localhost:3000'}`,
    '',
    '# JWT tokens for k6 scenarios (valid ~1 hour by default)',
  ];

  for (const [key, val] of Object.entries(results)) {
    envLines.push('');
    envLines.push(`# ${val.email}`);
    envLines.push(`K6_TOKEN_${key}=${val.token}`);
    envLines.push(`K6_USER_${key}_PROFILE_ID=${val.profileId}`);
    envLines.push(`K6_USER_${key}_AUTH_ID=${val.authUserId}`);
  }

  // Preserve existing post IDs (don't blank them on re-run)
  const likePostId = existingEnv['K6_LIKE_POST_ID'] || '';
  const commentPostId = existingEnv['K6_COMMENT_POST_ID'] || '';
  const detailPostId = existingEnv['K6_DETAIL_POST_ID'] || '';
  const searchTerm = existingEnv['K6_SEARCH_TERM'] || 'bitcoin';

  envLines.push('');
  envLines.push('# Post IDs for concurrent tests (set after running seed SQL scripts)');
  envLines.push(`K6_LIKE_POST_ID=${likePostId}`);
  envLines.push(`K6_COMMENT_POST_ID=${commentPostId}`);
  envLines.push(`K6_DETAIL_POST_ID=${detailPostId}`);
  envLines.push(`K6_SEARCH_TERM=${searchTerm}`);

  const envContent = envLines.join('\n') + '\n';
  const envPath = join(ROOT, '.env.test');
  writeFileSync(envPath, envContent, 'utf-8');

  console.log('\n=== DONE ===');
  console.log(`Written to: .env.test`);
  console.log('\nProfile IDs (add to seed-follows.sql):');
  for (const [key, val] of Object.entries(results)) {
    console.log(`  ${key}: ${val.profileId}`);
  }
  console.log('\nNext steps:');
  console.log('1. Edit tests/load/seed/seed-follows.sql — uncomment follows blocks, paste profile IDs');
  console.log('2. Run: psql "$DATABASE_URL" -f tests/load/seed/seed-follows.sql');
  console.log('3. Run: psql "$DATABASE_URL" -f tests/load/seed/seed-post-likes.sql');
  console.log('4. Run: psql "$DATABASE_URL" -f tests/load/seed/seed-1000-comments.sql');
  console.log('5. Add returned post IDs to .env.test (K6_LIKE_POST_ID, K6_COMMENT_POST_ID)');
  console.log('6. Run k6 tests: k6 run --env-file .env.test tests/load/scenarios/public-feed.js');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
