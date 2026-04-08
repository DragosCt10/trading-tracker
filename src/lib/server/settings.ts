'use server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from './supabaseAdmin';
import { getCachedUserSession } from '@/lib/server/session';
import type { SavedNewsItem } from '@/types/account-settings';
import { parseFeatureFlags, FeatureFlagsSchema, type FeatureFlags } from '@/types/featureFlags';
export interface SettingsRow {
  saved_news: SavedNewsItem[];
  saved_markets: string[];
}

const DEFAULT_SETTINGS: SettingsRow = {
  saved_news: [],
  saved_markets: [],
};

/**
 * Gets the current user's settings from user_settings (server-side only).
 */
export async function getSettings(userId: string): Promise<SettingsRow> {
  if (!userId) return DEFAULT_SETTINGS;

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('user_settings')
    .select('saved_news, saved_markets')
    .eq('user_id', userId)
    .single();

  if (error) {
    if ((error as { code?: string }).code !== 'PGRST116') {
      console.error('Error fetching user settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  const raw = data as {
    saved_news?: unknown;
    saved_markets?: unknown;
  };
  const rawNews = raw?.saved_news;
  const rawMarkets = raw?.saved_markets;
  return {
    saved_news: Array.isArray(rawNews) ? (rawNews as SavedNewsItem[]) : [],
    saved_markets: Array.isArray(rawMarkets) ? (rawMarkets as string[]) : [],
  };
}

/**
 * Updates the current user's saved_news in user_settings.
 */
export async function updateSavedNews(
  savedNews: SavedNewsItem[]
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };

  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from('user_settings')
    .upsert(
      {
        user_id: user.id,
        saved_news: savedNews as any,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Error updating user saved news:', error);
    return { error: { message: error.message ?? 'Failed to update saved news' } };
  }

  return { error: null };
}

/**
 * Updates the current user's saved_markets in user_settings.
 * No strict cap — users can save as many markets as they want (we use a high cap to avoid unbounded growth).
 */
const MAX_SAVED_MARKETS = 500;

export async function updateSavedMarkets(
  savedMarkets: string[]
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };

  const supabase = await createClient();
  const capped = savedMarkets.slice(0, MAX_SAVED_MARKETS);

  const { error } = await (supabase as any)
    .from('user_settings')
    .upsert(
      {
        user_id: user.id,
        saved_markets: capped as any,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Error updating user saved markets:', error);
    return { error: { message: error.message ?? 'Failed to update saved markets' } };
  }

  return { error: null };
}

// ─── Feature Flags ──────────────────────────────────────────────────────────

export async function getFeatureFlags(userId: string): Promise<FeatureFlags> {
  if (!userId) return {};

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_settings')
    .select('feature_flags')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[getFeatureFlags] error:', error);
    return {};
  }

  return parseFeatureFlags(data?.feature_flags);
}

const UPDATE_FEATURE_FLAGS_MAX_RETRIES = 3;

export async function updateFeatureFlags(
  userId: string,
  flags: FeatureFlags,
): Promise<void> {
  if (!userId) return;

  if (process.env.NODE_ENV === 'development') {
    const result = FeatureFlagsSchema.safeParse(flags);
    if (!result.success) {
      console.warn('[updateFeatureFlags] outgoing flags failed validation:', result.error.issues);
    }
  }

  const supabase = createAdminClient();

  for (let attempt = 0; attempt < UPDATE_FEATURE_FLAGS_MAX_RETRIES; attempt++) {
    // Read current version (0 if row doesn't exist yet)
    const { data: existing, error: readError } = await supabase
      .from('user_settings')
      .select('version')
      .eq('user_id', userId)
      .maybeSingle();

    if (readError) {
      // 42703 = column does not exist (migration not yet applied) — fall back to simple upsert
      if ((readError as { code?: string }).code === '42703') {
        const { error: upsertError } = await supabase
          .from('user_settings')
          .upsert({ user_id: userId, feature_flags: flags }, { onConflict: 'user_id' });
        if (upsertError) throw new Error(`[updateFeatureFlags] upsert fallback failed: ${upsertError.message}`);
        return;
      }
      console.error(`[updateFeatureFlags] read failed userId=${userId}:`, readError);
      throw new Error(`[updateFeatureFlags] read failed: ${readError.message}`);
    }

    const currentVersion = (existing as { version?: number } | null)?.version ?? 0;
    const nextVersion = currentVersion + 1;

    if (!existing) {
      // Row doesn't exist — attempt insert
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert({ user_id: userId, feature_flags: flags, version: nextVersion });
      if (!insertError) return;
      // Unique constraint violation means another writer inserted concurrently — retry
      if ((insertError as { code?: string }).code === '23505') {
        console.warn(`[updateFeatureFlags] insert conflict userId=${userId} attempt=${attempt + 1}, retrying`);
        continue;
      }
      console.error(`[updateFeatureFlags] insert failed userId=${userId}:`, insertError);
      throw new Error(`[updateFeatureFlags] insert failed: ${insertError.message}`);
    }

    // Row exists — attempt conditional update
    const { data: updated, error: updateError } = await supabase
      .from('user_settings')
      .update({ feature_flags: flags, version: nextVersion })
      .eq('user_id', userId)
      .eq('version', currentVersion)
      .select('user_id');

    if (updateError) {
      console.error(`[updateFeatureFlags] update failed userId=${userId}:`, updateError);
      throw new Error(`[updateFeatureFlags] update failed: ${updateError.message}`);
    }

    if ((updated as Array<unknown> | null)?.length) return; // Success

    // 0 rows affected = version mismatch (concurrent write) — retry
    console.warn(`[updateFeatureFlags] version conflict userId=${userId} attempt=${attempt + 1}, retrying`);
  }

  throw new Error(`[updateFeatureFlags] persistent conflict after ${UPDATE_FEATURE_FLAGS_MAX_RETRIES} retries userId=${userId}`);
}
