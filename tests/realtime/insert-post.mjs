#!/usr/bin/env node
// ============================================================
// insert-post.mjs — Manual trigger for realtime subscription tests
// ============================================================
// Inserts a post into feed_posts via Supabase service key,
// timestamps the insert, and prints the time. Use this to
// measure how long it takes for NewPostsBanner to appear in browser.
//
// Used for:
//   RT1: Realtime notification latency (also automated in Playwright)
//   RT3: Disconnect/reconnect recovery test
//
// Usage:
//   1. Open /feed in browser (public tab) — DevTools console open
//   2. Run: node tests/realtime/insert-post.mjs
//   3. Note the "Inserted at:" timestamp
//   4. Note when NewPostsBanner appears in browser
//   5. Difference = Supabase Realtime delivery latency (target: < 2s)
//
// Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

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

const env = {
  ...loadEnv(join(ROOT, '.env.local')),
  ...loadEnv(join(ROOT, '.env.test')),
};

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
const AUTHOR_PROFILE_ID = env['K6_USER_PUBLIC_PROFILE_ID'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!AUTHOR_PROFILE_ID) {
  console.error('ERROR: K6_USER_PUBLIC_PROFILE_ID not found in .env.test');
  console.error('Run generate-tokens.mjs first');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const content = `[PERF-TEST] Realtime test post at ${new Date().toISOString()}`;

  console.log('');
  console.log('=== Realtime Subscription Latency Test ===');
  console.log('');
  console.log('Instructions:');
  console.log('  1. Open /feed in browser (public tab)');
  console.log('  2. Watch for NewPostsBanner to appear after insert');
  console.log('  3. Measure time between "Inserted at" and banner appearance');
  console.log('');
  console.log(`Author profile ID: ${AUTHOR_PROFILE_ID}`);
  console.log('');

  const insertStart = Date.now();
  console.log(`Inserting post... (at ${new Date(insertStart).toISOString()})`);

  const { data, error } = await admin
    .from('feed_posts')
    .insert({
      author_id: AUTHOR_PROFILE_ID,
      content,
      post_type: 'text',
      is_hidden: false,
    })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('ERROR inserting post:', error.message);
    process.exit(1);
  }

  const insertEnd = Date.now();
  const insertDuration = insertEnd - insertStart;

  console.log('');
  console.log(`✓ Inserted at: ${new Date(insertStart).toISOString()}`);
  console.log(`  Post ID: ${data.id}`);
  console.log(`  DB insert took: ${insertDuration}ms`);
  console.log('');
  console.log('Now watch the browser for NewPostsBanner...');
  console.log('  Target: banner appears within 2000ms of "Inserted at" timestamp');
  console.log('');
  console.log('Cleanup (run after test):');
  console.log(`  psql "$DATABASE_URL" -c "DELETE FROM feed_posts WHERE id = '${data.id}'"`);
  console.log('  Or run: psql "$DATABASE_URL" -f tests/load/seed/teardown.sql');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
