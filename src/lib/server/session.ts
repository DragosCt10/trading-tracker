'use server';

import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';

/**
 * Server-side function to get user session and account info.
 * Uses only getUser() to avoid duplicate Supabase auth calls (was getUser + getSession = 2 per request).
 * Returns a minimal session shape { user } so layout and client still receive { user, session }.
 */
export async function getUserSession() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, session: null };
  }

  return { user, session: { user } };
}

/** Cached per request; use in layout, pages, and all server actions so we only hit Supabase auth once per request. */
export const getCachedUserSession = cache(getUserSession);
