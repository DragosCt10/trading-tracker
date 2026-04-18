'use server';

import { getCachedSocialProfile } from '@/lib/server/socialProfile';
import type { User } from '@supabase/supabase-js';

/**
 * Resolves the display name shown on the Trade Ledger PDF cover page.
 *
 * Hierarchy (first non-empty wins):
 *   1. `social_profiles.display_name`   — Settings → Profile → Display name
 *   2. `user.user_metadata.full_name`   — set at signup / SSO
 *   3. email local-part                  — `dragos@x.com` → "dragos"
 *   4. literal "Trader"                  — last-resort fallback
 */
export async function resolveTraderName(user: User): Promise<string> {
  try {
    const profile = await getCachedSocialProfile(user.id);
    const display = profile?.display_name?.trim();
    if (display) return display;
  } catch {
    // getCachedSocialProfile is best-effort — fall through to the auth path.
  }

  const fullName = (user.user_metadata?.full_name as string | undefined)?.trim();
  if (fullName) return fullName;

  if (user.email) {
    const local = user.email.split('@')[0]?.trim();
    if (local) return local;
  }

  return 'Trader';
}
