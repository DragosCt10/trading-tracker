'use server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from './supabaseAdmin';
import { getCachedUserSession } from '@/lib/server/session';
import type { SavedNewsItem } from '@/types/account-settings';
import { FeatureFlagsSchema, type FeatureFlags } from '@/types/featureFlags';
import { z } from 'zod';

export interface SettingsRow {
  saved_news: SavedNewsItem[];
  saved_markets: string[];
  newsletter_subscribed: boolean;
}

const DEFAULT_SETTINGS: SettingsRow = {
  saved_news: [],
  saved_markets: [],
  newsletter_subscribed: true,
};

/**
 * Gets the current user's settings from user_settings (server-side only).
 */
export async function getSettings(userId: string): Promise<SettingsRow> {
  if (!userId) return DEFAULT_SETTINGS;

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('user_settings')
    .select('saved_news, saved_markets, newsletter_subscribed')
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
    newsletter_subscribed?: unknown;
  };
  const rawNews = raw?.saved_news;
  const rawMarkets = raw?.saved_markets;
  return {
    saved_news: Array.isArray(rawNews) ? (rawNews as SavedNewsItem[]) : [],
    saved_markets: Array.isArray(rawMarkets) ? (rawMarkets as string[]) : [],
    newsletter_subscribed: typeof raw?.newsletter_subscribed === 'boolean' ? raw.newsletter_subscribed : true,
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

// ─── Newsletter ─────────────────────────────────────────────────────────────

/**
 * Persist newsletter preference for the current authenticated user.
 * Called from the OAuth sync hook and settings page toggle.
 */
export async function persistNewsletterPreference(
  subscribed: boolean
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_settings')
    .update({ newsletter_subscribed: subscribed })
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating newsletter preference:', error);
    return { error: { message: error.message ?? 'Failed to update newsletter preference' } };
  }
  return { error: null };
}

/**
 * Persist newsletter preference using admin client with an explicit userId.
 * Used during signup (email-confirmation path where no session exists yet).
 */
export async function persistNewsletterForUser(
  userId: string,
  subscribed: boolean
): Promise<void> {
  if (!userId) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, newsletter_subscribed: subscribed },
      { onConflict: 'user_id' }
    );
  if (error) console.error('[newsletter] persistNewsletterForUser failed:', error);
}

const UnsubscribeTokenSchema = z.string().uuid();

/**
 * Unsubscribe a user by their unique unsubscribe token.
 * Uses admin client — no authentication required.
 * Always returns { success: true } to prevent token enumeration via response oracle.
 * SECURITY: The token is a bearer credential — never log it.
 */
export async function unsubscribeByToken(
  token: string
): Promise<{ success: boolean }> {
  const parsed = UnsubscribeTokenSchema.safeParse(token);
  if (!parsed.success) return { success: true };

  const supabase = createAdminClient();
  await supabase
    .from('user_settings')
    .update({ newsletter_subscribed: false })
    .eq('newsletter_unsubscribe_token', parsed.data);

  return { success: true };
}

// ─── Feature Flags ──────────────────────────────────────────────────────────
//
// After SC3, feature_flags only holds `trade_badge` (discounts moved to user_discounts).
// Callers that need trade_badge read it directly via supabase queries (e.g. RewardsPage
// uses syncUserBadge which returns FeatureFlags). There is no standalone getFeatureFlags
// helper because no code path needs a generic feature_flags read anymore.

/**
 * Update user_settings.feature_flags with a new value.
 *
 * After SC3 (discount normalization), the only remaining field in feature_flags is
 * `trade_badge`, which is always a full overwrite — concurrent writers set the same
 * value. Optimistic locking (version column + retry loop) is no longer needed.
 */
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
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, feature_flags: flags }, { onConflict: 'user_id' });

  if (error) {
    console.error(`[updateFeatureFlags] upsert failed userId=${userId}:`, error);
    throw new Error(`[updateFeatureFlags] upsert failed: ${error.message}`);
  }
}
