'use server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from './supabaseAdmin';
import { getCachedUserSession } from '@/lib/server/session';
import type { CustomFuturesSpec, SavedNewsItem } from '@/types/account-settings';
import { FeatureFlagsSchema, parseFeatureFlags, type FeatureFlags } from '@/types/featureFlags';
import {
  MAX_CUSTOM_FUTURES_SPECS,
  normalizeFuturesSymbol,
  validateCustomFuturesSpec,
} from '@/constants/futuresSpecs';
import { z } from 'zod';

export interface SettingsRow {
  saved_news: SavedNewsItem[];
  saved_markets: string[];
  newsletter_subscribed: boolean;
  custom_futures_specs: CustomFuturesSpec[];
  feature_flags: FeatureFlags;
}

const DEFAULT_SETTINGS: SettingsRow = {
  saved_news: [],
  saved_markets: [],
  newsletter_subscribed: true,
  custom_futures_specs: [],
  feature_flags: {},
};

/**
 * Defensive normalizer for `custom_futures_specs` JSONB. If the column is corrupt
 * (manual SQL edit, partial write), treat it as empty rather than crashing the
 * caller. Follows the same belt-and-suspenders pattern used for saved_news.
 */
function normalizeCustomFuturesSpecs(raw: unknown): CustomFuturesSpec[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const r = item as Record<string, unknown>;
    const symbol = typeof r.symbol === 'string' ? r.symbol : '';
    const dollarPerSlUnit = Number(r.dollarPerSlUnit);
    const slUnitLabel = typeof r.slUnitLabel === 'string' ? r.slUnitLabel : '';
    if (!symbol || !Number.isFinite(dollarPerSlUnit) || dollarPerSlUnit <= 0 || !slUnitLabel) {
      return [];
    }
    return [{
      symbol: normalizeFuturesSymbol(symbol),
      label: typeof r.label === 'string' ? r.label : undefined,
      dollarPerSlUnit,
      slUnitLabel,
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    }];
  });
}

/**
 * Gets the current user's settings from user_settings (server-side only).
 */
export async function getSettings(userId: string): Promise<SettingsRow> {
  if (!userId) return DEFAULT_SETTINGS;

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('user_settings')
    .select('saved_news, saved_markets, newsletter_subscribed, custom_futures_specs, feature_flags')
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
    custom_futures_specs?: unknown;
    feature_flags?: unknown;
  };
  const rawNews = raw?.saved_news;
  const rawMarkets = raw?.saved_markets;
  return {
    saved_news: Array.isArray(rawNews) ? (rawNews as SavedNewsItem[]) : [],
    saved_markets: Array.isArray(rawMarkets) ? (rawMarkets as string[]) : [],
    newsletter_subscribed: typeof raw?.newsletter_subscribed === 'boolean' ? raw.newsletter_subscribed : true,
    custom_futures_specs: normalizeCustomFuturesSpecs(raw?.custom_futures_specs),
    feature_flags: parseFeatureFlags(raw?.feature_flags),
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

// ─── Custom Futures Specs ───────────────────────────────────────────────────
//
// Per-user catalog of contract specs for futures symbols not in the canonical
// FUTURES_SPECS map. Stored as JSONB on user_settings.custom_futures_specs.
// Capped at MAX_CUSTOM_FUTURES_SPECS to bound row size.
//
// Validation lives in @/constants/futuresSpecs.validateCustomFuturesSpec; same
// helper is used client-side for inline form errors.

/**
 * Insert or replace a user-saved spec for a futures symbol. Symbol is normalized
 * upper-case at save time; subsequent saves with the same symbol replace the prior
 * entry (upsert semantics within the JSONB array).
 *
 * Validation gates:
 *  - symbol regex `/^[A-Z0-9._-]{1,16}$/`
 *  - cannot collide with a hardcoded FUTURES_SPECS symbol
 *  - dollarPerSlUnit must be a finite positive number
 *  - cap of MAX_CUSTOM_FUTURES_SPECS per user
 */
export async function upsertCustomFuturesSpec(input: {
  symbol: string;
  label?: string;
  dollarPerSlUnit: number;
  slUnitLabel: string;
}): Promise<{ data: CustomFuturesSpec | null; error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { data: null, error: { message: 'Unauthorized' } };

  const validationError = validateCustomFuturesSpec(input);
  if (validationError) return { data: null, error: { message: validationError } };

  const symbol = normalizeFuturesSymbol(input.symbol);

  const supabase = await createClient();
  const { data: existing } = await (supabase as any)
    .from('user_settings')
    .select('custom_futures_specs')
    .eq('user_id', user.id)
    .single();

  const existingSpecs = normalizeCustomFuturesSpecs(
    (existing as { custom_futures_specs?: unknown } | null)?.custom_futures_specs,
  );

  const filtered = existingSpecs.filter((s) => s.symbol !== symbol);

  if (filtered.length >= MAX_CUSTOM_FUTURES_SPECS) {
    return {
      data: null,
      error: {
        message: `You've reached the limit of ${MAX_CUSTOM_FUTURES_SPECS} saved futures symbols. Delete one before adding another.`,
      },
    };
  }

  const newSpec: CustomFuturesSpec = {
    symbol,
    label: input.label?.trim() || undefined,
    dollarPerSlUnit: input.dollarPerSlUnit,
    slUnitLabel: input.slUnitLabel.trim(),
    createdAt: new Date().toISOString(),
  };

  const next = [...filtered, newSpec];

  const { error } = await (supabase as any)
    .from('user_settings')
    .upsert(
      { user_id: user.id, custom_futures_specs: next as any },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('Error upserting custom futures spec:', error);
    return { data: null, error: { message: error.message ?? 'Failed to save symbol' } };
  }

  return { data: newSpec, error: null };
}

/**
 * Remove a user-saved futures spec by symbol. No-op if symbol is not in the user's
 * saved list. Historical trades referencing the symbol are unaffected because
 * `calculated_risk_dollars` is a snapshot at write time.
 */
export async function deleteCustomFuturesSpec(
  symbol: string,
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user) return { error: { message: 'Unauthorized' } };

  const normalized = normalizeFuturesSymbol(symbol);
  if (!normalized) return { error: { message: 'Symbol is required.' } };

  const supabase = await createClient();
  const { data: existing } = await (supabase as any)
    .from('user_settings')
    .select('custom_futures_specs')
    .eq('user_id', user.id)
    .single();

  const existingSpecs = normalizeCustomFuturesSpecs(
    (existing as { custom_futures_specs?: unknown } | null)?.custom_futures_specs,
  );

  const next = existingSpecs.filter((s) => s.symbol !== normalized);

  // Idempotent: if symbol wasn't saved, return success (no-op).
  if (next.length === existingSpecs.length) return { error: null };

  const { error } = await (supabase as any)
    .from('user_settings')
    .upsert(
      { user_id: user.id, custom_futures_specs: next as any },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('Error deleting custom futures spec:', error);
    return { error: { message: error.message ?? 'Failed to delete symbol' } };
  }

  return { error: null };
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
