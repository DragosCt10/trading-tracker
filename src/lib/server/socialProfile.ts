'use server';

import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from './session';
import { getCachedSubscription } from './subscription';
import type { SocialProfile, PaginatedResult } from '@/types/social';
import type { TierId } from '@/types/subscription';

// ─── Types ──────────────────────────────────────────────────────────────────

type ProfileResult<T> =
  | { data: T }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'DB_ERROR' };

export interface SocialProfilePreview {
  profile: SocialProfile;
  isFollowing: boolean;
  hasPosts: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): SocialProfile {
  return {
    id:              row.id as string,
    user_id:         row.user_id as string,
    display_name:    row.display_name as string,
    username:        row.username as string,
    bio:             (row.bio as string | null) ?? null,
    avatar_url:      (row.avatar_url as string | null) ?? null,
    is_public:       row.is_public as boolean,
    is_banned:       row.is_banned as boolean,
    follower_count:  row.follower_count as number,
    following_count: row.following_count as number,
    tier:            (row.tier as TierId) ?? 'starter',
    created_at:      row.created_at as string,
    updated_at:      row.updated_at as string,
  };
}

function resolveTierFromSubscription(tier: TierId, isActive: boolean): TierId {
  return isActive ? tier : 'starter';
}

function normalizeUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 50);
}

async function syncProfileTierIfNeeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: SocialProfile
): Promise<SocialProfile> {
  const subscription = await getCachedSubscription(profile.user_id);
  const canonicalTier = resolveTierFromSubscription(subscription.tier, subscription.isActive);
  if (profile.tier === canonicalTier) return profile;

  const nowIso = new Date().toISOString();
  const { data: updated } = await supabase
    .from('social_profiles')
    .update({ tier: canonicalTier, updated_at: nowIso })
    .eq('id', profile.id)
    .select('*')
    .single();

  if (!updated) {
    return { ...profile, tier: canonicalTier, updated_at: nowIso };
  }
  return mapRow(updated as Record<string, unknown>);
}

async function getLiveFollowCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string
): Promise<{ follower_count: number; following_count: number }> {
  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', profileId),
    supabase
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', profileId),
  ]);

  return {
    follower_count: followerCount ?? 0,
    following_count: followingCount ?? 0,
  };
}

/** Generate a unique username in trader + 6 digits format. */
async function generateUniqueUsername(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const attempts = Array.from({ length: 8 }, () => {
    const sixDigits = Math.floor(100000 + Math.random() * 900000);
    return `trader${sixDigits}`;
  });

  for (const candidate of attempts) {
    const { count } = await supabase
      .from('social_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('username', candidate);

    if ((count ?? 0) === 0) return candidate;
  }

  // Fallback: still follows trader + 6 digits format.
  const fallback = Math.floor(100000 + Math.random() * 900000);
  return `trader${fallback}`;
}

// ─── Read ────────────────────────────────────────────────────────────────────

async function _getSocialProfile(userId: string): Promise<SocialProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  const profile = mapRow(data as Record<string, unknown>);
  const tierSyncedProfile = await syncProfileTierIfNeeded(supabase, profile);
  const liveCounts = await getLiveFollowCounts(supabase, tierSyncedProfile.id);
  return { ...tierSyncedProfile, ...liveCounts };
}

export const getCachedSocialProfile = cache(_getSocialProfile);

export async function getSocialProfileByUsername(username: string): Promise<SocialProfile | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('username', normalizedUsername)
    .eq('is_banned', false)
    .single();

  if (error || !data) return null;
  const profile = mapRow(data as Record<string, unknown>);
  const liveCounts = await getLiveFollowCounts(supabase, profile.id);
  return { ...profile, ...liveCounts };
}

export async function getSocialProfilePreviewByUsername(
  username: string
): Promise<ProfileResult<SocialProfilePreview>> {
  const profile = await getSocialProfileByUsername(username);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();
  const [isFollowing, postCount] = await Promise.all([
    isFollowingProfile(profile.id),
    supabase
      .from('feed_posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .eq('is_hidden', false),
  ]);

  return {
    data: {
      profile,
      isFollowing,
      hasPosts: (postCount.count ?? 0) > 0,
    },
  };
}

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return false;

  const supabase = await createClient();
  const { count } = await supabase
    .from('social_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('username', normalizedUsername);
  return (count ?? 0) === 0;
}

// ─── ensureSocialProfile ─────────────────────────────────────────────────────
// Called once per user on first /feed visit. Auto-creates profile from email.

export async function ensureSocialProfile(): Promise<SocialProfile | null> {
  const session = await getCachedUserSession();
  if (!session.user) return null;

  const userId = session.user!.id;
  const supabase = await createClient();

  // Return existing profile if present
  const { data: existing } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  let profile = existing ? mapRow(existing as Record<string, unknown>) : null;

  if (!profile) {
    // Derive display_name and username from email
    const email = session.user!.email ?? '';
    const emailPrefix = email.split('@')[0] ?? 'user';
    const displayName = emailPrefix
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Retry on username conflicts to handle concurrent profile creation safely.
    for (let attempt = 0; attempt < 5; attempt += 1) {
    const username = await generateUniqueUsername(supabase);
      const { data: created, error } = await supabase
        .from('social_profiles')
        .insert({ user_id: userId, display_name: displayName, username })
        .select('*')
        .single();

      if (!error && created) {
        profile = mapRow(created as Record<string, unknown>);
        break;
      }

      // Unique violation (usually username or user_id raced): try to recover.
      if (error?.code === '23505') {
        const { data: racedExisting } = await supabase
          .from('social_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (racedExisting) {
          profile = mapRow(racedExisting as Record<string, unknown>);
          break;
        }
        continue;
      }

      console.error('[ensureSocialProfile] insert error:', error);
      return null;
    }

    if (!profile) {
      console.error('[ensureSocialProfile] failed to create profile after retries');
      return null;
    }
  }

  return syncProfileTierIfNeeded(supabase, profile);
}

// ─── Write ───────────────────────────────────────────────────────────────────

export async function updateSocialProfile(data: {
  display_name?: string;
  username?: string;
  bio?: string | null;
  avatar_url?: string | null;
  is_public?: boolean;
  /** Internal-only: set by subscription sync, not user input */
  tier?: TierId;
}): Promise<ProfileResult<SocialProfile>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const supabase = await createClient();

  if (data.username) {
    const normalizedUsername = normalizeUsername(data.username);
    if (!normalizedUsername) {
      return { error: 'Username must contain letters, numbers, or underscores', code: 'DB_ERROR' };
    }

    const available = await checkUsernameAvailability(normalizedUsername);
    // Check it's available OR it's the user's current username
    if (!available) {
      const { data: own } = await supabase
        .from('social_profiles')
        .select('username')
        .eq('user_id', session.user!.id)
        .single();
      if (own?.username !== normalizedUsername) {
        return { error: 'Username is already taken', code: 'CONFLICT' };
      }
    }
    data.username = normalizedUsername;
  }

  const { data: updated, error } = await supabase
    .from('social_profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('user_id', session.user!.id)
    .select('*')
    .single();

  if (error || !updated) {
    console.error('[updateSocialProfile] error:', error);
    return { error: 'Failed to update profile', code: 'DB_ERROR' };
  }

  return { data: mapRow(updated as Record<string, unknown>) };
}

// ─── Follow ──────────────────────────────────────────────────────────────────

export async function getFollowers(
  profileId: string,
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<SocialProfile>> {
  const supabase = await createClient();
  let query = supabase
    .from('follows')
    .select('follower:follower_id(social_profiles(*))')
    .eq('following_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) query = query.lt('created_at', cursor);

  const { data } = await query;
  const rows = (data ?? []) as unknown as Array<{ follower: Record<string, unknown> }>;
  const profiles = rows.slice(0, limit).map((r) => mapRow(r.follower));

  return {
    items: profiles,
    nextCursor: rows.length > limit ? (rows[limit - 1] as unknown as { created_at: string }).created_at : null,
    hasMore: rows.length > limit,
  };
}

export async function getFollowing(
  profileId: string,
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<SocialProfile>> {
  const supabase = await createClient();
  let query = supabase
    .from('follows')
    .select('following:following_id(social_profiles(*))')
    .eq('follower_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) query = query.lt('created_at', cursor);

  const { data } = await query;
  const rows = (data ?? []) as unknown as Array<{ following: Record<string, unknown> }>;
  const profiles = rows.slice(0, limit).map((r) => mapRow(r.following));

  return {
    items: profiles,
    nextCursor: rows.length > limit ? (rows[limit - 1] as unknown as { created_at: string }).created_at : null,
    hasMore: rows.length > limit,
  };
}

export async function isFollowingProfile(targetProfileId: string): Promise<boolean> {
  const session = await getCachedUserSession();
  if (!session.user) return false;

  const supabase = await createClient();
  const { data: ownProfile } = await supabase
    .from('social_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!ownProfile) return false;

  const { count } = await supabase
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('follower_id', (ownProfile as { id: string }).id)
    .eq('following_id', targetProfileId);

  return (count ?? 0) > 0;
}

export async function getFollowingProfileIds(profileIds: string[]): Promise<string[]> {
  if (profileIds.length === 0) return [];

  const session = await getCachedUserSession();
  if (!session.user) return [];

  const supabase = await createClient();
  const { data: ownProfile } = await supabase
    .from('social_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!ownProfile) return [];

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', (ownProfile as { id: string }).id)
    .in('following_id', profileIds);

  if (error) {
    console.error('[getFollowingProfileIds] error:', error);
    return [];
  }

  return (data ?? []).map((row: { following_id: string }) => row.following_id);
}

export async function followUser(
  targetProfileId: string
): Promise<ProfileResult<{ following_id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const supabase = await createClient();

  const { data: ownProfile } = await supabase
    .from('social_profiles')
    .select('id')
    .eq('user_id', session.user!.id)
    .single();

  if (!ownProfile) return { error: 'Profile not found', code: 'NOT_FOUND' };
  if (ownProfile.id === targetProfileId) {
    return { error: 'Cannot follow yourself', code: 'UNAUTHORIZED' };
  }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: ownProfile.id, following_id: targetProfileId });

  if (error) {
    if (error.code === '23505') return { data: { following_id: targetProfileId } }; // already following
    console.error('[followUser] error:', error);
    return { error: 'Failed to follow', code: 'DB_ERROR' };
  }

  try {
    await supabase.from('feed_notifications').insert({
      recipient_id: targetProfileId,
      actor_id: ownProfile.id,
      type: 'follow',
      post_id: null,
      comment_id: null,
    });
  } catch (err) {
    console.error('[followUser] notification error (non-fatal):', err);
  }

  return { data: { following_id: targetProfileId } };
}

export async function unfollowUser(
  targetProfileId: string
): Promise<ProfileResult<{ following_id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const supabase = await createClient();

  const { data: ownProfile } = await supabase
    .from('social_profiles')
    .select('id')
    .eq('user_id', session.user!.id)
    .single();

  if (!ownProfile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', ownProfile.id)
    .eq('following_id', targetProfileId);

  return { data: { following_id: targetProfileId } };
}

export async function removeFollower(
  followerProfileId: string
): Promise<ProfileResult<{ follower_id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const supabase = await createClient();

  const { data: ownProfile } = await supabase
    .from('social_profiles')
    .select('id')
    .eq('user_id', session.user!.id)
    .single();

  if (!ownProfile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerProfileId)
    .eq('following_id', (ownProfile as { id: string }).id);

  if (error) {
    console.error('[removeFollower] error:', error);
    return { error: 'Failed to remove follower', code: 'DB_ERROR' };
  }

  return { data: { follower_id: followerProfileId } };
}
