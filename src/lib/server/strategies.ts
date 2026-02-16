'use server';

import { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types/supabase';
import type { Strategy } from '@/types/strategy';

export type StrategyRow = Database['public']['Tables']['strategies']['Row'];

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
 * CRITICAL: Ensures the default "Trading Institutional" strategy exists for a user.
 * Creates it only if the user has no active strategies. This prevents duplicate
 * default strategies when the original default strategy is renamed.
 */
export async function ensureDefaultStrategy(userId: string): Promise<Strategy | null> {
  const supabase = await createClient();

  // First, check if user has any active strategies
  const { data: activeStrategies, error: activeCheckError } = await supabase
    .from('strategies')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  if (activeCheckError) {
    console.error('Error checking for active strategies:', activeCheckError);
  }

  // If user already has active strategies, don't create a default one
  // (they may have renamed the default strategy)
  if (activeStrategies && activeStrategies.length > 0) {
    // Check if default strategy exists (including inactive ones)
    const { data: existing } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', userId)
      .eq('slug', 'trading-institutional')
      .single();

    if (existing) {
      // If default strategy exists but is inactive, reactivate it
      if (!existing.is_active) {
        const { data: reactivated, error: reactivateError } = await supabase
          .from('strategies')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (reactivateError) {
          console.error('Error reactivating default strategy:', reactivateError);
          return existing as Strategy;
        }

        return reactivated as Strategy;
      }

      return existing as Strategy;
    }

    // User has strategies but default doesn't exist (was renamed) - return null
    // Don't create a duplicate default strategy
    return null;
  }

  // User has no active strategies - check if default strategy exists (including inactive)
  const { data: existing, error: checkError } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', 'trading-institutional')
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 is "not found" - that's expected if strategy doesn't exist
    console.error('Error checking for default strategy:', checkError);
  }

  if (existing) {
    // If default strategy exists but is inactive, reactivate it
    if (!existing.is_active) {
      const { data: reactivated, error: reactivateError } = await supabase
        .from('strategies')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (reactivateError) {
        console.error('Error reactivating default strategy:', reactivateError);
        return existing as Strategy;
      }

      return reactivated as Strategy;
    }

    return existing as Strategy;
  }

  // User has no strategies at all - create default strategy
  const { data: created, error: createError } = await supabase
    .from('strategies')
    .insert({
      user_id: userId,
      name: 'Trading Institutional',
      slug: 'trading-institutional',
      is_active: true,
    })
    .select()
    .single();

  if (createError || !created) {
    console.error('Error creating default strategy:', createError);
    throw new Error('Failed to create default strategy');
  }

  return created as Strategy;
}

/**
 * Gets all active strategies for a user.
 * Ensures the default strategy exists only if user has no active strategies.
 * Only returns strategies where is_active = true.
 */
export async function getUserStrategies(userId: string): Promise<Strategy[]> {
  const supabase = await createClient();

  // Ensure default strategy exists only if user has no active strategies
  // This prevents creating duplicate defaults when the original was renamed
  await ensureDefaultStrategy(userId);

  // Fetch only active strategies
  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching strategies:', error);
    return [];
  }

  return (data ?? []) as Strategy[];
}

/**
 * Gets a strategy by slug for a specific user.
 * Validates ownership to ensure users can only access their own strategies.
 * Returns both active and inactive strategies (allows access to historical analytics).
 */
export async function getStrategyBySlug(
  userId: string,
  slug: string
): Promise<Strategy | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching strategy by slug:', error);
    return null;
  }

  return data as Strategy;
}

/**
 * Creates a new strategy for the current user.
 * Auto-generates slug from name and validates uniqueness.
 */
export async function createStrategy(
  userId: string,
  name: string
): Promise<{ data: Strategy | null; error: { message: string } | null }> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

  const slug = generateSlug(name);

  // Check if slug already exists for this user (check both active and inactive strategies)
  const { data: existing, error: checkError } = await supabase
    .from('strategies')
    .select('id, is_active')
    .eq('user_id', userId)
    .eq('slug', slug)
    .maybeSingle();

  // If strategy exists (regardless of active status), return error
  if (existing) {
    return {
      data: null,
      error: { message: 'A strategy with this name already exists' },
    };
  }

  // If there was an error checking (other than "not found"), log it but continue
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking for existing strategy:', checkError);
  }

  const { data, error } = await supabase
    .from('strategies')
    .insert({
      user_id: userId,
      name: name.trim(),
      slug,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating strategy:', error);
    
    // Handle unique constraint violation with user-friendly message
    if (error.code === '23505' || error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
      return {
        data: null,
        error: { message: 'A strategy with this name already exists' },
      };
    }
    
    return {
      data: null,
      error: { message: 'Failed to create strategy. Please try again.' },
    };
  }

  return { data: data as Strategy, error: null };
}

/**
 * Updates a strategy name (slug is regenerated automatically).
 */
export async function updateStrategy(
  strategyId: string,
  userId: string,
  name: string
): Promise<{ data: Strategy | null; error: { message: string } | null }> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

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

  return { data: data as Strategy, error: null };
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
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    return { error: { message: 'Unauthorized' } };
  }

  // Verify strategy belongs to user
  const { data: existing } = await supabase
    .from('strategies')
    .select('slug')
    .eq('id', strategyId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return { error: { message: 'Strategy not found' } };
  }

  // Soft delete: set is_active to false instead of deleting
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
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching inactive strategies:', error);
    return [];
  }

  return (data ?? []) as Strategy[];
}

/**
 * Reactivates a strategy by setting is_active to true.
 */
export async function reactivateStrategy(
  strategyId: string,
  userId: string
): Promise<{ data: Strategy | null; error: { message: string } | null }> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

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
    return { data: existing as Strategy, error: null };
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

  return { data: reactivated as Strategy, error: null };
}
