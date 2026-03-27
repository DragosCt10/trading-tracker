'use server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from './supabaseAdmin';
import { getCachedUserSession } from '@/lib/server/session';
import type { SavedNewsItem } from '@/types/account-settings';
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

export async function getFeatureFlags(userId: string): Promise<Record<string, unknown>> {
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

  return (data?.feature_flags ?? {}) as Record<string, unknown>;
}

export async function updateFeatureFlags(
  userId: string,
  flags: Record<string, unknown>,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, feature_flags: flags },
      { onConflict: 'user_id' },
    );
}
