'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from './session';
import { getCachedSocialProfile } from './socialProfile';
import { getCachedSubscription } from './subscription';
import type { FeedChannel, PaginatedResult } from '@/types/social';

type ChannelResult<T> =
  | { data: T }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'DB_ERROR' };

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

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getMyChannels(): Promise<FeedChannel[]> {
  const session = await getCachedUserSession();
  if (!session.user) return [];

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return [];

  const supabase = await createClient();
  const { data: ownedRows, error: ownedError } = await supabase
    .from('feed_channels')
    .select('*')
    .eq('owner_id', profile.id)
    .order('updated_at', { ascending: false });
  if (ownedError) {
    console.error('[getMyChannels:owned]', ownedError);
    return [];
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from('channel_members')
    .select('channel_id')
    .eq('user_id', profile.id);
  if (membershipsError) {
    console.error('[getMyChannels:memberships]', membershipsError);
    return (ownedRows ?? []).map((r) => mapRow(r as Record<string, unknown>));
  }

  const memberChannelIds = (memberships ?? [])
    .map((m: { channel_id: string }) => m.channel_id)
    .filter((id) => id !== '');

  let memberRows: Record<string, unknown>[] = [];
  if (memberChannelIds.length > 0) {
    const { data: rows, error: membersError } = await supabase
      .from('feed_channels')
      .select('*')
      .in('id', memberChannelIds);
    if (membersError) {
      console.error('[getMyChannels:memberRows]', membersError);
    } else {
      memberRows = (rows ?? []) as Record<string, unknown>[];
    }
  }

  const merged = [...((ownedRows ?? []) as Record<string, unknown>[]), ...memberRows];
  const deduped = Array.from(
    new Map(merged.map((row) => [row.id as string, row])).values()
  );
  deduped.sort(
    (a, b) => new Date(b.updated_at as string).getTime() - new Date(a.updated_at as string).getTime()
  );

  const channelIds = deduped.map((r) => r.id as string);
  const countMap: Record<string, number> = {};
  if (channelIds.length > 0) {
    const { data: memberCountRows } = await supabase
      .from('channel_members')
      .select('channel_id')
      .in('channel_id', channelIds);
    (memberCountRows ?? []).forEach((m: { channel_id: string }) => {
      countMap[m.channel_id] = (countMap[m.channel_id] ?? 0) + 1;
    });
  }

  return deduped.map((r) => ({ ...mapRow(r), member_count: countMap[r.id as string] ?? 0 }));
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

  if (cursor) q = q.lt('created_at', cursor);

  const { data } = await q;
  const rows = (data ?? []) as Record<string, unknown>[];
  const pageRows = rows.slice(0, limit);

  const channelIds = pageRows.map((r) => r.id as string);
  const countMap: Record<string, number> = {};
  if (channelIds.length > 0) {
    const { data: memberCountRows } = await supabase
      .from('channel_members')
      .select('channel_id')
      .in('channel_id', channelIds);
    (memberCountRows ?? []).forEach((m: { channel_id: string }) => {
      countMap[m.channel_id] = (countMap[m.channel_id] ?? 0) + 1;
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

  return channel;
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

  const supabase = await createClient();
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
