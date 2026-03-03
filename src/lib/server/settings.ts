'use server';

import { createClient } from '@/utils/supabase/server';
import type { SavedNewsItem } from '@/types/account-settings';

/** User settings row (user_settings table). Extend as you add columns. */
export interface SettingsRow {
  saved_news: SavedNewsItem[];
  saved_setup_types: string[];
}

const DEFAULT_SETTINGS: SettingsRow = {
  saved_news: [],
  saved_setup_types: [],
};

/**
 * Gets the current user's settings from user_settings (server-side only).
 */
export async function getSettings(userId: string): Promise<SettingsRow> {
  if (!userId) return DEFAULT_SETTINGS;

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('user_settings')
    .select('saved_news, saved_setup_types')
    .eq('user_id', userId)
    .single();

  if (error) {
    if ((error as { code?: string }).code !== 'PGRST116') {
      console.error('Error fetching user settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  const rawNews = (data as { saved_news?: unknown })?.saved_news;
  const rawSetups = (data as { saved_setup_types?: unknown })?.saved_setup_types;
  return {
    saved_news: Array.isArray(rawNews) ? (rawNews as SavedNewsItem[]) : [],
    saved_setup_types: Array.isArray(rawSetups) ? (rawSetups as string[]) : [],
  };
}

/**
 * Updates the current user's saved_news in user_settings.
 */
export async function updateSavedNews(
  savedNews: SavedNewsItem[]
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: { message: 'Unauthorized' } };
  }

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
 * Updates the current user's saved_setup_types in user_settings.
 */
export async function updateSavedSetupTypes(
  savedSetupTypes: string[]
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: { message: 'Unauthorized' } };
  }

  const { error } = await (supabase as any)
    .from('user_settings')
    .upsert(
      {
        user_id: user.id,
        saved_setup_types: savedSetupTypes as any,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Error updating user saved setup types:', error);
    return { error: { message: error.message ?? 'Failed to update saved setup types' } };
  }

  return { error: null };
}
