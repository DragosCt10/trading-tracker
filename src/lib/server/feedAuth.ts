'use server';

import { getCachedUserSession } from './session';
import { getCachedSocialProfile } from './socialProfile';
import type { SocialProfile } from '@/types/social';
import type { User } from '@supabase/supabase-js';

export type ProfileAuth = {
  session: { user: User };
  profile: SocialProfile;
};

type AuthError = { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' };

/**
 * Shared auth guard for feed server actions.
 * Validates session, loads profile, and rejects banned accounts.
 * Replaces the repeated 6-line auth+profile boilerplate across all feed action files.
 *
 * Usage:
 *   const auth = await requireProfile();
 *   if ('error' in auth) return auth;
 *   const { session, profile } = auth;
 */
export async function requireProfile(): Promise<ProfileAuth | AuthError> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };
  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };
  if (profile.is_banned) return { error: 'Account is banned', code: 'UNAUTHORIZED' };
  return { session: { user: session.user }, profile };
}
