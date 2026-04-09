/**
 * SC3 backfill: copy discount data from user_settings.feature_flags JSONB
 * into the new user_discounts table.
 *
 * Idempotent — safe to re-run. Uses INSERT ... ON CONFLICT DO NOTHING semantics
 * via Supabase's upsert(ignoreDuplicates: true).
 *
 * Usage:
 *   npx tsx scripts/backfill-discounts.ts
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Run AFTER the 20260409000000_add_user_discounts migration is applied
 *   - Run BEFORE deploying code that reads from user_discounts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BATCH_SIZE = 100;

// Match the legacy JSONB shapes (do not import from src/types/featureFlags.ts
// since this script runs outside the Next.js build).
interface LegacyDiscountEntry {
  milestoneId: string;
  discountPct: number;
  used: boolean;
  couponCode?: string;
  generatedAt?: string;
  expiresAt?: string;
  achievedAt?: string;
}

interface LegacyCouponDiscount {
  used: boolean;
  couponCode?: string;
  generatedAt?: string;
  expiresAt?: string;
}

interface LegacyPendingVariantRevert {
  subscriptionId: string;
  normalVariantId: string;
  discountedVariantId: string;
  discountPct: number;
  discountId: string;
  appliedAt: string;
  revertAttempts?: number;
}

interface LegacyFlags {
  available_discounts?: LegacyDiscountEntry[];
  pro_retention_discount?: LegacyCouponDiscount;
  activity_rank_up_discount?: LegacyCouponDiscount;
  pending_variant_revert?: LegacyPendingVariantRevert | null;
}

interface DiscountInsert {
  user_id: string;
  discount_type: 'milestone' | 'activity' | 'retention';
  milestone_id: string;
  discount_pct: number;
  used: boolean;
  coupon_code: string | null;
  generated_at: string | null;
  expires_at: string | null;
  achieved_at: string | null;
  revert_subscription_id: string | null;
  revert_normal_variant_id: string | null;
  revert_discounted_variant_id: string | null;
  revert_applied_at: string | null;
  revert_attempts: number;
}

function flagsFromUser(
  userId: string,
  flags: LegacyFlags,
): DiscountInsert[] {
  const rows: DiscountInsert[] = [];
  const pending = flags.pending_variant_revert;

  // Milestone discounts
  for (const d of flags.available_discounts ?? []) {
    if (!d?.milestoneId) continue;
    const matchesRevert =
      pending && pending.discountId === d.milestoneId
        ? pending
        : null;
    rows.push({
      user_id: userId,
      discount_type: 'milestone',
      milestone_id: d.milestoneId,
      discount_pct: d.discountPct,
      used: d.used ?? false,
      coupon_code: d.couponCode ?? null,
      generated_at: d.generatedAt ?? null,
      expires_at: d.expiresAt ?? null,
      achieved_at: d.achievedAt ?? null,
      revert_subscription_id: matchesRevert?.subscriptionId ?? null,
      revert_normal_variant_id: matchesRevert?.normalVariantId ?? null,
      revert_discounted_variant_id: matchesRevert?.discountedVariantId ?? null,
      revert_applied_at: matchesRevert?.appliedAt ?? null,
      revert_attempts: matchesRevert?.revertAttempts ?? 0,
    });
  }

  // Activity discount
  if (flags.activity_rank_up_discount) {
    const a = flags.activity_rank_up_discount;
    const matchesRevert = pending && pending.discountId === 'activity' ? pending : null;
    rows.push({
      user_id: userId,
      discount_type: 'activity',
      milestone_id: '__none__',
      discount_pct: matchesRevert?.discountPct ?? 15,
      used: a.used ?? false,
      coupon_code: a.couponCode ?? null,
      generated_at: a.generatedAt ?? null,
      expires_at: a.expiresAt ?? null,
      achieved_at: null,
      revert_subscription_id: matchesRevert?.subscriptionId ?? null,
      revert_normal_variant_id: matchesRevert?.normalVariantId ?? null,
      revert_discounted_variant_id: matchesRevert?.discountedVariantId ?? null,
      revert_applied_at: matchesRevert?.appliedAt ?? null,
      revert_attempts: matchesRevert?.revertAttempts ?? 0,
    });
  }

  // Retention discount
  if (flags.pro_retention_discount) {
    const r = flags.pro_retention_discount;
    const matchesRevert = pending && pending.discountId === 'retention' ? pending : null;
    rows.push({
      user_id: userId,
      discount_type: 'retention',
      milestone_id: '__none__',
      discount_pct: matchesRevert?.discountPct ?? 10,
      used: r.used ?? false,
      coupon_code: r.couponCode ?? null,
      generated_at: r.generatedAt ?? null,
      expires_at: r.expiresAt ?? null,
      achieved_at: null,
      revert_subscription_id: matchesRevert?.subscriptionId ?? null,
      revert_normal_variant_id: matchesRevert?.normalVariantId ?? null,
      revert_discounted_variant_id: matchesRevert?.discountedVariantId ?? null,
      revert_applied_at: matchesRevert?.appliedAt ?? null,
      revert_attempts: matchesRevert?.revertAttempts ?? 0,
    });
  }

  return rows;
}

async function main(): Promise<void> {
  console.log('[backfill-discounts] starting...');

  // Fetch all user_settings rows with non-empty feature_flags
  const { data: settingsRows, error: readError } = await supabase
    .from('user_settings')
    .select('user_id, feature_flags');

  if (readError) {
    console.error('[backfill-discounts] read error:', readError);
    process.exit(1);
  }

  const allRows: DiscountInsert[] = [];
  let usersWithDiscounts = 0;

  for (const row of settingsRows ?? []) {
    const flags = (row as { feature_flags: LegacyFlags }).feature_flags ?? {};
    const userRows = flagsFromUser((row as { user_id: string }).user_id, flags);
    if (userRows.length > 0) {
      usersWithDiscounts++;
      allRows.push(...userRows);
    }
  }

  console.log(
    `[backfill-discounts] found ${usersWithDiscounts} users with ${allRows.length} discount records`,
  );

  if (allRows.length === 0) {
    console.log('[backfill-discounts] nothing to backfill');
    return;
  }

  // Insert in batches with ON CONFLICT DO NOTHING
  let inserted = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('user_discounts')
      .upsert(batch, {
        onConflict: 'user_id,discount_type,milestone_id',
        ignoreDuplicates: true,
      });
    if (error) {
      console.error(`[backfill-discounts] batch ${i / BATCH_SIZE + 1} error:`, error);
      continue;
    }
    inserted += batch.length;
    console.log(
      `[backfill-discounts] batch ${i / BATCH_SIZE + 1}: ${batch.length} rows processed`,
    );
  }

  console.log(`[backfill-discounts] done. ${inserted} rows processed.`);
}

main().catch((err) => {
  console.error('[backfill-discounts] fatal:', err);
  process.exit(1);
});
