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

/** Generate a unique username from an email prefix with retry. */
async function generateUniqueUsername(
  supabase: Awaited<ReturnType<typeof createClient>>,
  emailPrefix: string
): Promise<string> {
  const base = emailPrefix.replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'user';

  const attempts = [
    base,
    `${base}${Math.floor(1000 + Math.random() * 9000)}`,
    `${base}${Math.random().toString(16).slice(2, 10)}`,
    `user${Math.random().toString(16).slice(2, 16)}`,
  ];

  for (const candidate of attempts) {
    const { count } = await supabase
      .from('social_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('username', candidate);

    if ((count ?? 0) === 0) return candidate;
  }

  // Fallback: always unique
  return `user${Date.now().toString(36)}`;
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('username', username)
    .eq('is_banned', false)
    .single();

  if (error || !data) return null;
  const profile = mapRow(data as Record<string, unknown>);
  const liveCounts = await getLiveFollowCounts(supabase, profile.id);
  return { ...profile, ...liveCounts };
}

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('social_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('username', username.toLowerCase());
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

    const username = await generateUniqueUsername(supabase, emailPrefix);

    const { data: created, error } = await supabase
      .from('social_profiles')
      .insert({ user_id: userId, display_name: displayName, username })
      .select('*')
      .single();

    if (error || !created) {
      console.error('[ensureSocialProfile] insert error:', error);
      return null;
    }

    profile = mapRow(created as Record<string, unknown>);
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
    const available = await checkUsernameAvailability(data.username);
    // Check it's available OR it's the user's current username
    if (!available) {
      const { data: own } = await supabase
        .from('social_profiles')
        .select('username')
        .eq('user_id', session.user!.id)
        .single();
      if (own?.username !== data.username) {
        return { error: 'Username is already taken', code: 'CONFLICT' };
      }
    }
    data.username = data.username.toLowerCase();
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
