'use server';

import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import type { Database } from '@/types/supabase';
import type { Strategy, SavedFavouritesKind } from '@/types/strategy';
import type { CustomStatConfig } from '@/types/customStats';
import type { SavedTag, TagColor } from '@/types/saved-tag';
import { normalizeSavedTags } from '@/types/saved-tag';
import { EXTRA_CARDS } from '@/constants/extraCards';
import { canAddStrategy } from './subscription';

export type StrategyRow = Database['public']['Tables']['strategies']['Row'];

/** Normalizes a raw strategy row's saved_tags from DB (handles string[] legacy rows). */
function normalizeStrategy(row: Record<string, unknown>): Strategy {
  const asArray = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  return {
    ...(row as unknown as Strategy),
    saved_tags: normalizeSavedTags(row.saved_tags),
    // Default the four numeric saved pools to [] so client code can rely on them
    // even before the 20260414000000_add_strategy_numeric_saved_pools migration runs.
    saved_displacement_sizes: asArray(row.saved_displacement_sizes),
    saved_sl_sizes: asArray(row.saved_sl_sizes),
    saved_risk_per_trades: asArray(row.saved_risk_per_trades),
    saved_rr_ratios: asArray(row.saved_rr_ratios),
  };
}

/**
 * Fetches a strategy by id using the service role client.
 * Used for public share pages where there is no authenticated user
 * but we still need the strategy name and extra_cards.
 */
export async function getStrategyById(
  strategyId: string
): Promise<Strategy | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('id', strategyId)
    .single();

  if (error) {
    if ((error as any).code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching strategy by id with service role:', error);
    return null;
  }

  return normalizeStrategy(data as Record<string, unknown>);
}

/**
 * Generates a URL-friendly slug from a strategy name.
 * Converts to lowercase, replaces spaces with hyphens, removes special characters.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * CRITICAL: Ensures the default "Institutional Strategy" strategy exists for a user.
 * Creates it only if the user has no active strategies. This prevents duplicate
 * default strategies when the original default strategy is renamed.
 */
export async function ensureDefaultStrategy(userId: string, accountId: string): Promise<Strategy | null> {
  const supabase = await createClient();

  // Defense-in-depth: verify the caller is acting on their own user id.
  // Supabase RLS on the `strategies` table should already block cross-user
  // inserts, but server actions must not trust their own arguments.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return null;

  // Only create a default strategy on demo accounts
  const { data: account } = await supabase
    .from('account_settings')
    .select('mode')
    .eq('id', accountId)
    .single();

  if (account?.mode !== 'demo') return null;

  // Only create a default if the user has NO strategies at all across any account
  const { data: anyStrategies } = await supabase
    .from('strategies')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  if (anyStrategies && anyStrategies.length > 0) return null;

  // User has no strategies at all — check if default already exists (including inactive)
  const { data: existing } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('slug', 'institutional-strategy')
    .maybeSingle();

  if (existing) {
    if (!existing.is_active) {
      const { data: reactivated, error: reactivateError } = await supabase
        .from('strategies')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (reactivateError) {
        console.error('Error reactivating default strategy:', reactivateError);
        return normalizeStrategy(existing as Record<string, unknown>);
      }

      return normalizeStrategy(reactivated as Record<string, unknown>);
    }

    return normalizeStrategy(existing as Record<string, unknown>);
  }

  // Create the default strategy on this demo account
  const { data: created, error: createError } = await supabase
    .from('strategies')
    .insert({
      user_id: userId,
      account_id: accountId,
      name: 'Institutional Strategy',
      slug: 'institutional-strategy',
      is_active: true,
      extra_cards: [],
    })
    .select()
    .single();

  if (createError || !created) {
    console.error('Error creating default strategy:', createError);
    return null;
  }

  return normalizeStrategy(created as Record<string, unknown>);
}

/**
 * Gets all active strategies for a user.
 * Ensures the default strategy exists only if user has no active strategies.
 * Only returns strategies where is_active = true.
 */
export async function getUserStrategies(userId: string, accountId: string): Promise<Strategy[]> {
  const supabase = await createClient();

  // Defense-in-depth: verify the authenticated user matches the requested userId
  // before touching the strategies table. Sibling CRUD actions already do this.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return [];

  await ensureDefaultStrategy(userId, accountId);

  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching strategies:', error);
    return [];
  }

  return (data ?? []).map(row => normalizeStrategy(row as Record<string, unknown>));
}

/**
 * Gets a strategy by slug for a specific user.
 * Validates ownership to ensure users can only access their own strategies.
 * Returns both active and inactive strategies (allows access to historical analytics).
 * Memoized per-request with React cache() to avoid duplicate DB calls within one render.
 */
export const getStrategyBySlug = cache(async (
  userId: string,
  slug: string,
  accountId?: string
): Promise<Strategy | null> => {
  const supabase = await createClient();

  let query = supabase
    .from('strategies')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', slug);

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    console.error('Error fetching strategy by slug:', error);
    return null;
  }

  return data ? normalizeStrategy(data as Record<string, unknown>) : null;
});

/**
 * Creates a new strategy for the current user.
 * Auto-generates slug from name and validates uniqueness.
 */
export async function createStrategy(
  userId: string,
  name: string,
  extraCards: string[] = [],
  accountId?: string
): Promise<{ data: Strategy | null; error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

  if (!accountId) {
    return { data: null, error: { message: 'Account is required to create a strategy' } };
  }

  const supabase = await createClient();

  // Enforce maxStrategies limit (Starter = 2)
  const { count: strategyCount } = await supabase
    .from('strategies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  const allowed = await canAddStrategy(userId, strategyCount ?? 0);
  if (!allowed) {
    return { data: null, error: { message: 'Upgrade to PRO to create more than 2 strategies' } };
  }
  const slug = generateSlug(name);

  const { data: existing, error: checkError } = await supabase
    .from('strategies')
    .select('id, is_active')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    return {
      data: null,
      error: { message: 'A strategy with this name already exists' },
    };
  }

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking for existing strategy:', checkError);
  }

  const { data, error } = await supabase
    .from('strategies')
    .insert({
      user_id: userId,
      account_id: accountId,
      name: name.trim(),
      slug,
      is_active: true,
      extra_cards: extraCards,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating strategy:', error);
    if (error.code === '23505' || error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
      return { data: null, error: { message: 'A strategy with this name already exists' } };
    }
    return { data: null, error: { message: 'Failed to create strategy. Please try again.' } };
  }

  return { data: normalizeStrategy(data as Record<string, unknown>), error: null };
}

/**
 * Updates a strategy name (slug is regenerated automatically).
 */
export async function updateStrategy(
  strategyId: string,
  userId: string,
  name: string,
  extraCards?: string[]
): Promise<{ data: Strategy | null; error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

  const supabase = await createClient();
  // Verify strategy belongs to user
  const { data: existing } = await supabase
    .from('strategies')
    .select('slug')
    .eq('id', strategyId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return { data: null, error: { message: 'Strategy not found' } };
  }

  const slug = generateSlug(name);

  // Check if new slug already exists (different strategy, only check active strategies)
  const { data: slugConflict } = await supabase
    .from('strategies')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', slug)
    .eq('is_active', true)
    .neq('id', strategyId)
    .single();

  if (slugConflict) {
    return {
      data: null,
      error: { message: 'A strategy with this name already exists' },
    };
  }

  const { data, error } = await supabase
    .from('strategies')
    .update({
      name: name.trim(),
      slug,
      updated_at: new Date().toISOString(),
      ...(extraCards !== undefined && { extra_cards: extraCards }),
    })
    .eq('id', strategyId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating strategy:', error);
    return {
      data: null,
      error: { message: error.message ?? 'Failed to update strategy' },
    };
  }

  return { data: normalizeStrategy(data as Record<string, unknown>), error: null };
}

/**
 * Soft deletes a strategy by setting is_active to false.
 * Trades keep their strategy_id reference for historical data integrity.
 * Note: If the default strategy is deleted, it will be automatically reactivated
 * by ensureDefaultStrategy when getUserStrategies is called.
 */
export async function deleteStrategy(
  strategyId: string,
  userId: string
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) {
    return { error: { message: 'Unauthorized' } };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('strategies')
    .select('slug')
    .eq('id', strategyId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return { error: { message: 'Strategy not found' } };
  }

  const { error } = await supabase
    .from('strategies')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting strategy:', error);
    return { error: { message: error.message ?? 'Failed to delete strategy' } };
  }

  return { error: null };
}

/**
 * Permanently deletes a strategy. Related trades (live, backtesting, demo) are
 * removed automatically by the database via ON DELETE CASCADE on strategy_id.
 */
export async function permanentlyDeleteStrategy(
  strategyId: string,
  userId: string
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) {
    return { error: { message: 'Unauthorized' } };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('strategies')
    .select('id')
    .eq('id', strategyId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return { error: { message: 'Strategy not found' } };
  }

  const { error: deleteError } = await supabase
    .from('strategies')
    .delete()
    .eq('id', strategyId)
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting strategy:', deleteError);
    return { error: { message: deleteError.message ?? 'Failed to delete strategy' } };
  }

  return { error: null };
}

/**
 * Gets all inactive (archived) strategies for a user that are visible to the client.
 * Returns strategies where is_active = false and archived less than 30 days ago.
 * Strategies older than 30 days are hidden from the client but remain in the database.
 */
export async function getInactiveStrategies(userId: string): Promise<Strategy[]> {
  const supabase = await createClient();

  // Calculate the date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', false)
    .gte('updated_at', thirtyDaysAgoISO) // Only get strategies updated (archived) within the last 30 days
    .order('updated_at', { ascending: false })
    .limit(100); // Cap: pg_cron deletes archived rows after 30 days, so this is a safety net.

  if (error) {
    console.error('Error fetching inactive strategies:', error);
    return [];
  }

  return (data ?? []).map(row => normalizeStrategy(row as Record<string, unknown>));
}

/**
 * Permanently deletes archived strategies that have been inactive for more than 30 days.
 * Uses permanentlyDeleteStrategy for each so related trades are removed via CASCADE.
 * Call when the strategies page loads to purge old archived strategies.
 */
export async function deleteArchivedStrategiesOlderThan30Days(
  userId: string
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) {
    return { error: { message: 'Unauthorized' } };
  }

  const supabase = await createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  const { data: oldArchived, error: fetchError } = await supabase
    .from('strategies')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', false)
    .lt('updated_at', thirtyDaysAgoISO);

  if (fetchError) {
    console.error('Error fetching archived strategies older than 30 days:', fetchError);
    return { error: { message: fetchError.message ?? 'Failed to fetch old archived strategies' } };
  }

  const ids = (oldArchived ?? []).map((row) => row.id);
  for (const strategyId of ids) {
    const result = await permanentlyDeleteStrategy(strategyId, userId);
    if (result.error) return result;
  }

  return { error: null };
}

/**
 * Updates the saved custom stat configurations for a specific strategy.
 */
async function getAuthorizedUserId(expectedUserId: string): Promise<string | null> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== expectedUserId) {
    return null;
  }
  return user.id;
}

export async function updateStrategyCustomStats(
  strategyId: string,
  userId: string,
  stats: CustomStatConfig[]
): Promise<{ error: Error | null }> {
  const authorizedUserId = await getAuthorizedUserId(userId);
  if (!authorizedUserId) {
    return { error: new Error('Unauthorized') };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('strategies')
    .update({ saved_custom_stats: stats, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId);

  if (error) {
    console.error('Error updating strategy custom stats:', error);
    return { error: new Error(error.message) };
  }
  return { error: null };
}

/**
 * Updates the saved setup types for a specific strategy.
 */
export async function updateStrategySetupTypes(
  strategyId: string,
  userId: string,
  types: string[]
): Promise<void> {
  const authorizedUserId = await getAuthorizedUserId(userId);
  if (!authorizedUserId) {
    console.error('Unauthorized attempt to update strategy setup types');
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('strategies')
    .update({ saved_setup_types: types, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId);

  if (error) {
    console.error('Error updating strategy setup types:', error);
  }
}

/**
 * Updates the saved liquidity types for a specific strategy.
 */
export async function updateStrategyLiquidityTypes(
  strategyId: string,
  userId: string,
  types: string[]
): Promise<void> {
  const authorizedUserId = await getAuthorizedUserId(userId);
  if (!authorizedUserId) {
    console.error('Unauthorized attempt to update strategy liquidity types');
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('strategies')
    .update({ saved_liquidity_types: types, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId);

  if (error) {
    console.error('Error updating strategy liquidity types:', error);
  }
}

/** Numeric saved-pool columns for the four NewTradeModal numeric comboboxes. */
export type StrategyNumericPoolColumn =
  | 'saved_displacement_sizes'
  | 'saved_sl_sizes'
  | 'saved_risk_per_trades'
  | 'saved_rr_ratios';

/**
 * Generic updater for the four numeric saved pools on a strategy. Mirrors
 * updateStrategySetupTypes / updateStrategyLiquidityTypes but is keyed by
 * column so we don't need four near-identical functions.
 */
export async function updateStrategyNumericPool(
  strategyId: string,
  userId: string,
  column: StrategyNumericPoolColumn,
  values: string[]
): Promise<void> {
  const authorizedUserId = await getAuthorizedUserId(userId);
  if (!authorizedUserId) {
    console.error(`Unauthorized attempt to update strategy ${column}`);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('strategies')
    .update({ [column]: values, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId);

  if (error) {
    console.error(`Error updating strategy ${column}:`, error);
  }
}

const MAX_FAVOURITES_PER_KIND = 10;

/**
 * Toggles a favourite/pin for a combobox kind on a strategy. Persists to DB.
 * Max 10 pins per kind; adding when full drops the oldest.
 * Returns the new saved_favourites on success so the client can update TanStack Query cache.
 */
export async function updateStrategyFavourites(
  strategyId: string,
  userId: string,
  kind: SavedFavouritesKind,
  itemId: string
): Promise<Record<string, string[]> | null> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) return null;

  const supabase = await createClient();
  const { data: row, error: fetchError } = await supabase
    .from('strategies')
    .select('saved_favourites')
    .eq('id', strategyId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !row) {
    console.error('Error fetching strategy for favourites:', fetchError);
    return null;
  }

  const current = (row.saved_favourites ?? {}) as Record<string, string[]>;
  const list = current[kind] ?? [];
  const idx = list.indexOf(itemId);
  const next =
    idx >= 0
      ? list.filter((_, i) => i !== idx)
      : [...list, itemId].slice(-MAX_FAVOURITES_PER_KIND);

  const updated: Record<string, string[]> = { ...current, [kind]: next };

  const { error: updateError } = await supabase
    .from('strategies')
    .update({ saved_favourites: updated, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating strategy favourites:', updateError);
    return null;
  }
  return updated;
}

/**
 * Merges new tags (with optional colors) into strategy.saved_tags.
 * Preserves existing colors; updates color if new tag provides one.
 * Called after a trade is saved to keep the strategy's tag vocabulary up to date.
 */
export async function syncStrategyTags(
  strategyId: string,
  userId: string,
  newTags: SavedTag[]
): Promise<void> {
  if (!newTags.length) return;

  const authorizedUserId = await getAuthorizedUserId(userId);
  if (!authorizedUserId) return;

  const supabase = await createClient();
  const { data: strategy } = await supabase
    .from('strategies')
    .select('saved_tags')
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId)
    .single();

  const current: SavedTag[] = normalizeSavedTags(strategy?.saved_tags);

  const mergedMap = new Map(current.map(t => [t.name, t]));
  for (const tag of newTags) {
    if (!mergedMap.has(tag.name)) {
      mergedMap.set(tag.name, tag);
    } else if (tag.color) {
      mergedMap.set(tag.name, { ...mergedMap.get(tag.name)!, color: tag.color });
    }
  }
  const merged = [...mergedMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  const { error } = await supabase
    .from('strategies')
    .update({ saved_tags: merged, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId);

  if (error) {
    console.error('Error syncing strategy tags:', error);
  }
}

/**
 * Renames a tag across all 3 trade tables and updates strategy.saved_tags.
 * Uses a DB RPC function to do this atomically.
 */
export async function renameStrategyTag(
  strategyId: string,
  userId: string,
  oldName: string,
  newName: string
): Promise<{ error: { message: string } | null }> {
  const authorizedUserId = await getAuthorizedUserId(userId);
  if (!authorizedUserId) {
    return { error: { message: 'Unauthorized' } };
  }

  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc('rename_strategy_tag', {
    p_strategy_id: strategyId,
    p_user_id: authorizedUserId,
    p_old: oldName,
    p_new: newName,
  });

  if (rpcError) {
    console.error('Error renaming strategy tag (rpc):', rpcError);
    return { error: { message: rpcError.message ?? 'Failed to rename tag' } };
  }

  // Update saved_tags on the strategy
  const { data: strategy } = await supabase
    .from('strategies')
    .select('saved_tags')
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId)
    .single();

  const current: SavedTag[] = normalizeSavedTags(strategy?.saved_tags);
  const updatedTags = current.map(t =>
    t.name === oldName ? { name: newName, color: t.color } : t
  );

  const { error: updateError } = await supabase
    .from('strategies')
    .update({ saved_tags: updatedTags, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId);

  if (updateError) {
    console.error('Error updating strategy saved_tags after rename:', updateError);
    return { error: { message: updateError.message ?? 'Failed to update strategy tags' } };
  }

  return { error: null };
}

/**
 * Deletes a tag from all 3 trade tables and removes it from strategy.saved_tags.
 * Uses a DB RPC function for the trade table updates.
 */
export async function deleteStrategyTag(
  strategyId: string,
  userId: string,
  tagName: string
): Promise<{ error: { message: string } | null }> {
  const authorizedUserId = await getAuthorizedUserId(userId);
  if (!authorizedUserId) {
    return { error: { message: 'Unauthorized' } };
  }

  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc('delete_strategy_tag', {
    p_strategy_id: strategyId,
    p_user_id: authorizedUserId,
    p_tag: tagName,
  });

  if (rpcError) {
    console.error('Error deleting strategy tag (rpc):', rpcError);
    return { error: { message: rpcError.message ?? 'Failed to delete tag' } };
  }

  // Remove from saved_tags on the strategy
  const { data: strategy } = await supabase
    .from('strategies')
    .select('saved_tags')
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId)
    .single();

  const current: SavedTag[] = normalizeSavedTags(strategy?.saved_tags);
  const updatedTags = current.filter(t => t.name !== tagName);

  const { error: updateError } = await supabase
    .from('strategies')
    .update({ saved_tags: updatedTags, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId);

  if (updateError) {
    console.error('Error updating strategy saved_tags after delete:', updateError);
    return { error: { message: updateError.message ?? 'Failed to update strategy tags' } };
  }

  return { error: null };
}

/**
 * Updates the color of an existing tag in strategy.saved_tags without renaming it.
 * Called when the user changes a tag's color via the edit flow in TagInput.
 */
export async function updateTagColor(
  strategyId: string,
  userId: string,
  tagName: string,
  color: TagColor | undefined
): Promise<void> {
  const authorizedUserId = await getAuthorizedUserId(userId);
  if (!authorizedUserId) return;

  const supabase = await createClient();
  const { data: strategy } = await supabase
    .from('strategies')
    .select('saved_tags')
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId)
    .single();

  const current: SavedTag[] = normalizeSavedTags(strategy?.saved_tags);
  const updated = current.map(t =>
    t.name === tagName ? { ...t, color } : t
  );

  const { error } = await supabase
    .from('strategies')
    .update({ saved_tags: updated, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', authorizedUserId);

  if (error) {
    console.error('Error updating tag color:', error);
  }
}

/**
 * Reactivates a strategy by setting is_active to true.
 */
export async function reactivateStrategy(
  strategyId: string,
  userId: string
): Promise<{ data: Strategy | null; error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

  const supabase = await createClient();
  // Verify strategy belongs to user
  const { data: existing } = await supabase
    .from('strategies')
    .select('*')
    .eq('id', strategyId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return { data: null, error: { message: 'Strategy not found' } };
  }

  // Check if strategy is already active
  if (existing.is_active) {
    return { data: normalizeStrategy(existing as Record<string, unknown>), error: null };
  }

  // Reactivate the strategy
  const { data: reactivated, error } = await supabase
    .from('strategies')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error reactivating strategy:', error);
    return { data: null, error: { message: error.message ?? 'Failed to reactivate strategy' } };
  }

  return { data: normalizeStrategy(reactivated as Record<string, unknown>), error: null };
}
