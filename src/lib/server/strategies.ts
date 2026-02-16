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
 * Creates it if missing. This function is called before fetching strategies to guarantee
 * every user always has the default strategy.
 */
export async function ensureDefaultStrategy(userId: string): Promise<Strategy> {
  const supabase = await createClient();

  // Check if default strategy exists
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
    return existing as Strategy;
  }

  // Create default strategy if missing
  const { data: created, error: createError } = await supabase
    .from('strategies')
    .insert({
      user_id: userId,
      name: 'Trading Institutional',
      slug: 'trading-institutional',
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
 * Gets all strategies for a user.
 * CRITICAL: This function ensures the default strategy exists before fetching.
 * Every user will always have at least the "Trading Institutional" strategy.
 */
export async function getUserStrategies(userId: string): Promise<Strategy[]> {
  const supabase = await createClient();

  // Ensure default strategy exists first
  await ensureDefaultStrategy(userId);

  // Fetch all strategies
  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', userId)
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

  // Check if slug already exists for this user
  const { data: existing } = await supabase
    .from('strategies')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', slug)
    .single();

  if (existing) {
    return {
      data: null,
      error: { message: 'A strategy with this name already exists' },
    };
  }

  const { data, error } = await supabase
    .from('strategies')
    .insert({
      user_id: userId,
      name: name.trim(),
      slug,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating strategy:', error);
    return {
      data: null,
      error: { message: error.message ?? 'Failed to create strategy' },
    };
  }

  return { data: data as Strategy, error: null };
}

/**
 * Updates a strategy name (slug is regenerated automatically).
 * Prevents updating the default strategy to maintain consistency.
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

  // Prevent renaming the default strategy
  if (existing.slug === 'trading-institutional') {
    return {
      data: null,
      error: { message: 'Cannot rename the default strategy' },
    };
  }

  const slug = generateSlug(name);

  // Check if new slug already exists (different strategy)
  const { data: slugConflict } = await supabase
    .from('strategies')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', slug)
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
 * Deletes a strategy.
 * Prevents deletion of the default strategy.
 * Sets strategy_id to NULL for all trades using this strategy (via ON DELETE SET NULL).
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

  // Verify strategy belongs to user and check if it's the default
  const { data: existing } = await supabase
    .from('strategies')
    .select('slug')
    .eq('id', strategyId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return { error: { message: 'Strategy not found' } };
  }

  // Prevent deletion of default strategy
  if (existing.slug === 'trading-institutional') {
    return { error: { message: 'Cannot delete the default strategy' } };
  }

  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', strategyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting strategy:', error);
    return { error: { message: error.message ?? 'Failed to delete strategy' } };
  }

  return { error: null };
}
