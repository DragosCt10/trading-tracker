'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from './supabaseAdmin';
import { getCachedUserSession } from './session';
import { getCachedSocialProfile } from './socialProfile';
import { getCachedSubscription } from './subscription';
import type { ChannelMember, FeedChannel, PaginatedResult } from '@/types/social';
import { isValidCursor } from './feedHelpers';
import { notifyChannelMemberAdded, notifyChannelMemberRemoved, notifyPrivateChannelMemberAdded, notifyPrivateChannelMemberRemoved } from './feedNotifications';
import type { TierId } from '@/types/subscription';

type ChannelResult<T> =
  | { data: T }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'DB_ERROR' };

const MAX_PUBLIC_CHANNELS_PER_OWNER = 1;
const MAX_PRIVATE_CHANNELS_FOR_PRO = 5;

async function getOwnedChannelCounts(supabase: Awaited<ReturnType<typeof createClient>>, ownerId: string) {
  const { data, error } = await supabase
    .from('feed_channels')
    .select('is_public')
    .eq('owner_id', ownerId);

  if (error) return { error };

  const rows = (data ?? []) as { is_public: boolean }[];
  const publicCount  = rows.filter((r) => r.is_public).length;
  const privateCount = rows.length - publicCount;

  return { publicCount, privateCount };
}

function mapRow(row: Record<string, unknown>): FeedChannel {
  return {
    id:          row.id as string,
    owner_id:    row.owner_id as string,
    name:        row.name as string,
    slug:        row.slug as string,
    description: (row.description as string | null) ?? null,
    is_public:   row.is_public as boolean,
    created_at:  row.created_at as string,
    updated_at:  row.updated_at as string,
  };
}

function mapChannelMemberRow(row: Record<string, unknown>): ChannelMember {
  const rawProfile = row.profile as Record<string, unknown> | null | undefined;
  return {
    channel_id: row.channel_id as string,
    user_id: row.user_id as string,
    role: row.role as ChannelMember['role'],
    joined_at: row.joined_at as string,
    profile: rawProfile
      ? {
          id: rawProfile.id as string,
          display_name: rawProfile.display_name as string,
          username: rawProfile.username as string,
          avatar_url: (rawProfile.avatar_url as string | null) ?? null,
          tier: rawProfile.tier as TierId,
          is_public: (rawProfile.is_public as boolean | null) ?? true,
        }
      : undefined,
  };
}

async function assertChannelOwner(channelId: string, ownerId: string): Promise<ChannelResult<null>> {
  const supabase = await createClient();
  const { data: channel, error } = await supabase
    .from('feed_channels')
    .select('id')
    .eq('id', channelId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) {
    console.error('[assertChannelOwner] error:', error);
    return { error: 'Failed to validate channel ownership', code: 'DB_ERROR' };
  }

  if (!channel) {
    return { error: 'Channel not found', code: 'NOT_FOUND' };
  }

  return { data: null };
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getMyChannels(): Promise<FeedChannel[]> {
  const session = await getCachedUserSession();
  if (!session.user) return [];

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_my_channels', { p_profile_id: profile.id });
  if (error) {
    console.error('[getMyChannels]', error);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...mapRow(r),
    member_count: Number(r.member_count) ?? 0,
  }));
}

export async function getPublicChannels(
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<FeedChannel>> {
  const supabase = await createClient();
  let q = supabase
    .from('feed_channels')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor && isValidCursor(cursor)) q = q.lt('created_at', cursor);

  const { data } = await q;
  const rows = (data ?? []) as Record<string, unknown>[];
  const pageRows = rows.slice(0, limit);

  const channelIds = pageRows.map((r) => r.id as string);
  const countMap: Record<string, number> = {};
  if (channelIds.length > 0) {
    // Single query for all member counts — avoids N+1 (one query per channel).
    const { data: memberRows } = await supabase
      .from('channel_members')
      .select('channel_id')
      .in('channel_id', channelIds);
    (memberRows ?? []).forEach(({ channel_id }) => {
      countMap[channel_id] = (countMap[channel_id] ?? 0) + 1;
    });
  }

  return {
    items: pageRows.map((r) => ({ ...mapRow(r), member_count: countMap[r.id as string] ?? 0 })),
    nextCursor: rows.length > limit ? (rows[limit - 1].created_at as string) : null,
    hasMore: rows.length > limit,
  };
}

export async function getChannelBySlug(slug: string): Promise<FeedChannel | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('feed_channels')
    .select('*')
    .eq('slug', normalized)
    .maybeSingle();

  if (error || !data) return null;

  const channel = mapRow(data as Record<string, unknown>);

  // Private channels: verify the caller is the owner or a member
  if (!channel.is_public) {
    const session = await getCachedUserSession();
    if (!session.user) return null;

    const profile = await getCachedSocialProfile(session.user.id);
    if (!profile) return null;

    if (profile.id !== channel.owner_id) {
      const { count } = await supabase
        .from('channel_members')
        .select('channel_id', { count: 'exact', head: true })
        .eq('channel_id', channel.id)
        .eq('user_id', profile.id);
      if ((count ?? 0) === 0) return null;
    }
  }

  const { count: memberCount } = await supabase
    .from('channel_members')
    .select('channel_id', { count: 'exact', head: true })
    .eq('channel_id', channel.id);

  return { ...channel, member_count: memberCount ?? 0 };
}

export async function isChannelMember(channelId: string): Promise<boolean> {
  const session = await getCachedUserSession();
  if (!session.user) return false;

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return false;

  const supabase = await createClient();
  const { count } = await supabase
    .from('channel_members')
    .select('channel_id', { count: 'exact', head: true })
    .eq('channel_id', channelId)
    .eq('user_id', profile.id);

  return (count ?? 0) > 0;
}

export type ChannelMembershipFlags = { isMember: boolean; removedByOwner: boolean };

/** Membership + whether the owner removed this user from a public channel (read-only until re-added). */
export async function getChannelMembershipFlags(channelId: string): Promise<ChannelMembershipFlags> {
  const session = await getCachedUserSession();
  if (!session.user) return { isMember: false, removedByOwner: false };

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return { isMember: false, removedByOwner: false };

  const supabase = await createClient();
  const { data: ch } = await supabase
    .from('feed_channels')
    .select('is_public')
    .eq('id', channelId)
    .maybeSingle();

  if (!ch) return { isMember: false, removedByOwner: false };

  const [{ count: memberCount }, { count: removalCount }] = await Promise.all([
    supabase
      .from('channel_members')
      .select('channel_id', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .eq('user_id', profile.id),
    (ch as { is_public: boolean }).is_public
      ? supabase
          .from('channel_public_removed_members')
          .select('channel_id', { count: 'exact', head: true })
          .eq('channel_id', channelId)
          .eq('user_id', profile.id)
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    isMember: (memberCount ?? 0) > 0,
    removedByOwner: (ch as { is_public: boolean }).is_public && (removalCount ?? 0) > 0,
  };
}

/**
 * Returns all public channel IDs from which the current user has been removed.
 * The RLS policy on channel_public_removed_members scopes SELECT to the current user's rows,
 * so no explicit user filter is needed.
 */
export async function getRemovedPublicChannelIds(): Promise<string[]> {
  const session = await getCachedUserSession();
  if (!session.user) return [];

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('channel_public_removed_members')
    .select('channel_id');

  return (data ?? []).map((r: { channel_id: string }) => r.channel_id);
}

/**
 * True when `profileId` is on the public-channel removal list (cannot comment until re-added; posting/join blocked separately).
 * Used by feed comment guard; no-ops for private channels or missing channel.
 */
export async function isPublicChannelReadOnlyForProfile(
  profileId: string,
  channelId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data: ch } = await supabase
    .from('feed_channels')
    .select('is_public')
    .eq('id', channelId)
    .maybeSingle();

  if (!(ch as { is_public?: boolean } | null)?.is_public) return false;

  const { count } = await supabase
    .from('channel_public_removed_members')
    .select('channel_id', { count: 'exact', head: true })
    .eq('channel_id', channelId)
    .eq('user_id', profileId);

  return (count ?? 0) > 0;
}

// ─── Create (PRO only) ───────────────────────────────────────────────────────

export async function createChannel(input: {
  name: string;
  slug: string;
  description?: string;
  isPublic?: boolean;
}): Promise<ChannelResult<FeedChannel>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const subscription = await getCachedSubscription(session.user.id);
  if (!subscription.definition.features.socialFeedChannels) {
    return { error: 'Creating channels requires PRO', code: 'UNAUTHORIZED' };
  }

  const supabase = await createClient();
  const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const wantsPublic = input.isPublic ?? false;
  const counts = await getOwnedChannelCounts(supabase, profile.id);
  if ('error' in counts) {
    console.error('[createChannel:counts] error:', counts.error);
    return { error: 'Failed to validate channel limits', code: 'DB_ERROR' };
  }

  if (wantsPublic && counts.publicCount >= MAX_PUBLIC_CHANNELS_PER_OWNER) {
    return { error: 'You can only have 1 public channel', code: 'CONFLICT' };
  }

  if (!wantsPublic && subscription.tier === 'pro' && counts.privateCount >= MAX_PRIVATE_CHANNELS_FOR_PRO) {
    return { error: 'PRO users can create up to 5 private channels', code: 'CONFLICT' };
  }

  const { data: created, error } = await supabase
    .from('feed_channels')
    .insert({
      owner_id:    profile.id,
      name:        input.name.trim(),
      slug,
      description: input.description?.trim() ?? null,
      is_public:   input.isPublic ?? false,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'Slug already taken', code: 'CONFLICT' };
    console.error('[createChannel] error:', error);
    return { error: 'Failed to create channel', code: 'DB_ERROR' };
  }

  // Auto-add owner as member with 'owner' role
  await supabase.from('channel_members').insert({
    channel_id: (created as { id: string }).id,
    user_id:    profile.id,
    role:       'owner',
  });

  return { data: mapRow(created as Record<string, unknown>) };
}

// ─── Update / Delete ─────────────────────────────────────────────────────────

export async function updateChannel(
  channelId: string,
  input: { name?: string; description?: string; isPublic?: boolean }
): Promise<ChannelResult<FeedChannel>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const subscription = await getCachedSubscription(session.user.id);
  if (!subscription.definition.features.socialFeedChannels) {
    return { error: 'Updating channels requires PRO', code: 'UNAUTHORIZED' };
  }

  const supabase = await createClient();
  if (input.isPublic !== undefined) {
    const { data: currentChannel, error: currentChannelError } = await supabase
      .from('feed_channels')
      .select('id, is_public')
      .eq('id', channelId)
      .eq('owner_id', profile.id)
      .maybeSingle();

    if (currentChannelError) {
      console.error('[updateChannel:current] error:', currentChannelError);
      return { error: 'Failed to validate channel limits', code: 'DB_ERROR' };
    }

    if (!currentChannel) {
      return { error: 'Channel not found', code: 'NOT_FOUND' };
    }

    const currentIsPublic = (currentChannel as { is_public: boolean }).is_public;
    const nextIsPublic = input.isPublic;
    if (currentIsPublic !== nextIsPublic) {
      const counts = await getOwnedChannelCounts(supabase, profile.id);
      if ('error' in counts) {
        console.error('[updateChannel:counts] error:', counts.error);
        return { error: 'Failed to validate channel limits', code: 'DB_ERROR' };
      }

      if (nextIsPublic && counts.publicCount >= MAX_PUBLIC_CHANNELS_PER_OWNER) {
        return { error: 'You can only have 1 public channel', code: 'CONFLICT' };
      }

      if (!nextIsPublic && subscription.tier === 'pro' && counts.privateCount >= MAX_PRIVATE_CHANNELS_FOR_PRO) {
        return { error: 'PRO users can create up to 5 private channels', code: 'CONFLICT' };
      }
    }
  }

  const { data: updated, error } = await supabase
    .from('feed_channels')
    .update({
      ...(input.name        !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description.trim() }),
      ...(input.isPublic    !== undefined && { is_public: input.isPublic }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', channelId)
    .eq('owner_id', profile.id)
    .select('*')
    .single();

  if (error || !updated) {
    console.error('[updateChannel] error:', error);
    return { error: 'Failed to update channel', code: 'DB_ERROR' };
  }

  return { data: mapRow(updated as Record<string, unknown>) };
}

export async function deleteChannel(channelId: string): Promise<ChannelResult<{ id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('feed_channels')
    .delete()
    .eq('id', channelId)
    .eq('owner_id', profile.id);

  if (error) {
    console.error('[deleteChannel] error:', error);
    return { error: 'Failed to delete channel', code: 'DB_ERROR' };
  }

  return { data: { id: channelId } };
}

// ─── Membership ──────────────────────────────────────────────────────────────

export async function joinChannel(channelId: string): Promise<ChannelResult<{ channel_id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();

  const { data: ch } = await supabase
    .from('feed_channels')
    .select('is_public')
    .eq('id', channelId)
    .maybeSingle();

  if ((ch as { is_public?: boolean } | null)?.is_public) {
    const { count } = await supabase
      .from('channel_public_removed_members')
      .select('channel_id', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .eq('user_id', profile.id);

    if ((count ?? 0) > 0) {
      return {
        error:
          'You were removed from this channel by the owner. They must add you back before you can participate again.',
        code: 'CONFLICT',
      };
    }
  }

  const { error } = await supabase
    .from('channel_members')
    .upsert({ channel_id: channelId, user_id: profile.id, role: 'member' }, { onConflict: 'channel_id,user_id', ignoreDuplicates: true });

  if (error) {
    console.error('[joinChannel] error:', error);
    return { error: 'Failed to join channel', code: 'DB_ERROR' };
  }

  return { data: { channel_id: channelId } };
}

export async function leaveChannel(channelId: string): Promise<ChannelResult<{ channel_id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();
  await supabase
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', profile.id);

  return { data: { channel_id: channelId } };
}

export async function getChannelMembersForOwner(
  channelId: string,
  cursor?: string,
  limit = 25
): Promise<ChannelResult<PaginatedResult<ChannelMember>>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const ownerCheck = await assertChannelOwner(channelId, profile.id);
  if ('error' in ownerCheck) return ownerCheck;

  const supabase = await createClient();
  let query = supabase
    .from('channel_members')
    .select('channel_id, user_id, role, joined_at, profile:social_profiles!channel_members_user_id_fkey(id, display_name, username, avatar_url, tier, is_public)')
    .eq('channel_id', channelId)
    .order('joined_at', { ascending: false })
    .limit(limit + 1);

  if (cursor && isValidCursor(cursor)) query = query.lt('joined_at', cursor);

  const { data, error } = await query;

  if (error) {
    console.error('[getChannelMembersForOwner] error:', error);
    return { error: 'Failed to fetch channel members', code: 'DB_ERROR' };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const pageRows = rows.slice(0, limit);
  const items = pageRows.map(mapChannelMemberRow);

  // Auto-heal: ensure owner always appears (old channels may lack the owner row)
  const ownerInList = items.some((m) => m.user_id === profile.id);
  if (!ownerInList && !cursor) {
    await supabase
      .from('channel_members')
      .upsert({ channel_id: channelId, user_id: profile.id, role: 'owner' }, { onConflict: 'channel_id,user_id', ignoreDuplicates: true });

    items.push({
      channel_id: channelId,
      user_id:    profile.id,
      role:       'owner',
      joined_at:  new Date(0).toISOString(),
      profile: {
        id:           profile.id,
        display_name: profile.display_name,
        username:     profile.username,
        avatar_url:   profile.avatar_url ?? null,
        tier:         profile.tier,
        is_public:    profile.is_public ?? true,
      },
    });
  }

  // Owner always last regardless of joined_at
  items.sort((a, b) => {
    if (a.role === 'owner') return 1;
    if (b.role === 'owner') return -1;
    return 0;
  });

  return {
    data: {
      items,
      nextCursor: rows.length > limit ? (pageRows[pageRows.length - 1]?.joined_at as string) : null,
      hasMore: rows.length > limit,
    },
  };
}

/**
 * Fetch channel members for any authenticated channel member (not owner-only).
 * Private channels: caller must be a member. Public channels: auth only.
 */
export async function getChannelMembers(
  channelId: string,
  cursor?: string,
  limit = 20
): Promise<ChannelResult<PaginatedResult<ChannelMember>>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();

  // For private channels, verify the caller is a member
  const { data: ch } = await supabase
    .from('feed_channels')
    .select('is_public')
    .eq('id', channelId)
    .maybeSingle();

  if (!ch) return { error: 'Channel not found', code: 'NOT_FOUND' };

  if (!(ch as { is_public: boolean }).is_public) {
    const { count } = await supabase
      .from('channel_members')
      .select('channel_id', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .eq('user_id', profile.id);
    if ((count ?? 0) === 0) return { error: 'Not a member of this channel', code: 'UNAUTHORIZED' };
  }

  let query = supabase
    .from('channel_members')
    .select('channel_id, user_id, role, joined_at, profile:social_profiles!channel_members_user_id_fkey(id, display_name, username, avatar_url, tier, is_public)')
    .eq('channel_id', channelId)
    .order('joined_at', { ascending: false })
    .limit(limit + 1);

  if (cursor && isValidCursor(cursor)) query = query.lt('joined_at', cursor);

  const { data, error } = await query;

  if (error) {
    console.error('[getChannelMembers] error:', error);
    return { error: 'Failed to fetch channel members', code: 'DB_ERROR' };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const pageRows = rows.slice(0, limit);

  return {
    data: {
      items: pageRows.map(mapChannelMemberRow),
      nextCursor: rows.length > limit ? (pageRows[pageRows.length - 1]?.joined_at as string) : null,
      hasMore: rows.length > limit,
    },
  };
}

export async function addChannelMemberByHandle(
  channelId: string,
  handle: string
): Promise<ChannelResult<ChannelMember>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const ownerCheck = await assertChannelOwner(channelId, profile.id);
  if ('error' in ownerCheck) return ownerCheck;

  const normalizedHandle = handle.trim().replace(/^@+/, '').toLowerCase();
  if (!normalizedHandle) {
    return { error: 'Username is required', code: 'CONFLICT' };
  }

  const supabase = await createClient();
  const { data: targetProfile, error: targetProfileError } = await supabase
    .from('social_profiles')
    .select('id')
    .eq('username', normalizedHandle)
    .maybeSingle();

  if (targetProfileError) {
    console.error('[addChannelMemberByHandle:profile] error:', targetProfileError);
    return { error: 'Failed to find user', code: 'DB_ERROR' };
  }

  if (!targetProfile) {
    return { error: 'User not found', code: 'NOT_FOUND' };
  }

  const targetProfileId = (targetProfile as { id: string }).id;
  const admin = createAdminClient();

  // Re-verify ownership inline (with admin) before any privileged write.
  // assertChannelOwner used the session client whose result is cached — this
  // ensures we hold the lock right before the mutation.
  const { data: chMeta, error: chMetaError } = await admin
    .from('feed_channels')
    .select('owner_id, is_public')
    .eq('id', channelId)
    .maybeSingle();

  if (chMetaError || !chMeta || (chMeta as { owner_id: string }).owner_id !== profile.id) {
    return { error: 'Channel not found or not owner', code: 'UNAUTHORIZED' };
  }

  const { error: insertError } = await admin
    .from('channel_members')
    .upsert(
      { channel_id: channelId, user_id: targetProfileId, role: targetProfileId === profile.id ? 'owner' : 'member' },
      { onConflict: 'channel_id,user_id', ignoreDuplicates: true }
    );

  if (insertError) {
    console.error('[addChannelMemberByHandle:upsert] error:', insertError);
    return { error: 'Failed to add member', code: 'DB_ERROR' };
  }

  await admin
    .from('channel_public_removed_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', targetProfileId);

  const { data: createdMembership, error: membershipError } = await supabase
    .from('channel_members')
    .select('channel_id, user_id, role, joined_at, profile:social_profiles!channel_members_user_id_fkey(id, display_name, username, avatar_url, tier, is_public)')
    .eq('channel_id', channelId)
    .eq('user_id', targetProfileId)
    .single();

  if (membershipError || !createdMembership) {
    console.error('[addChannelMemberByHandle:select] error:', membershipError);
    return { error: 'Failed to load added member', code: 'DB_ERROR' };
  }

  const isPublic = (chMeta as { is_public?: boolean }).is_public;

  if (isPublic) {
    void notifyChannelMemberAdded(targetProfileId, profile.id);
  } else {
    void notifyPrivateChannelMemberAdded(targetProfileId, profile.id);
  }

  return { data: mapChannelMemberRow(createdMembership as Record<string, unknown>) };
}

export async function removeChannelMemberByUserId(
  channelId: string,
  memberUserId: string
): Promise<ChannelResult<{ channel_id: string; user_id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const ownerCheck = await assertChannelOwner(channelId, profile.id);
  if ('error' in ownerCheck) return ownerCheck;

  if (memberUserId === profile.id) {
    return { error: 'Owner cannot be removed from channel', code: 'CONFLICT' };
  }

  const admin = createAdminClient();

  // Re-verify ownership inline (with admin) before any privileged write.
  const { data: chMeta, error: chMetaError } = await admin
    .from('feed_channels')
    .select('owner_id, is_public')
    .eq('id', channelId)
    .maybeSingle();

  if (chMetaError || !chMeta || (chMeta as { owner_id: string }).owner_id !== profile.id) {
    return { error: 'Channel not found or not owner', code: 'UNAUTHORIZED' };
  }

  const { error } = await admin
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', memberUserId);

  if (error) {
    console.error('[removeChannelMemberByUserId] error:', error);
    return { error: 'Failed to remove member', code: 'DB_ERROR' };
  }

  if ((chMeta as { is_public?: boolean } | null)?.is_public) {
    const { error: upsertError } = await admin
      .from('channel_public_removed_members')
      .upsert(
        { channel_id: channelId, user_id: memberUserId },
        { onConflict: 'channel_id,user_id' }
      );
    if (upsertError) {
      console.error('[removeChannelMemberByUserId:removal-record]', upsertError);
    }
  }

  const isPublicRemove = (chMeta as { is_public?: boolean } | null)?.is_public;
  if (isPublicRemove) {
    void notifyChannelMemberRemoved(memberUserId, profile.id);
  } else {
    void notifyPrivateChannelMemberRemoved(memberUserId, profile.id);
  }

  return { data: { channel_id: channelId, user_id: memberUserId } };
}
