'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from './session';
import { getCachedSocialProfile } from './socialProfile';
import { joinChannel } from './feedChannels';
import type { ChannelInvite } from '@/types/social';

type InviteResult<T> =
  | { data: T }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'INVALID' | 'EXPIRED' | 'MAXED' | 'DB_ERROR' };

function mapRow(row: Record<string, unknown>): ChannelInvite {
  return {
    id:         row.id as string,
    channel_id: row.channel_id as string,
    created_by: row.created_by as string,
    token:      row.token as string,
    label:      (row.label as string | null) ?? null,
    max_uses:   (row.max_uses as number | null) ?? null,
    use_count:  row.use_count as number,
    expires_at: (row.expires_at as string | null) ?? null,
    is_active:  row.is_active as boolean,
    created_at: row.created_at as string,
  };
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createChannelInvite(
  channelId: string,
  input: { label?: string; maxUses?: number; expiresAt?: string }
): Promise<InviteResult<ChannelInvite>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();

  // Owner-only guard
  const { count } = await supabase
    .from('feed_channels')
    .select('id', { count: 'exact', head: true })
    .eq('id', channelId)
    .eq('owner_id', profile.id);
  if ((count ?? 0) === 0) return { error: 'Not the channel owner', code: 'UNAUTHORIZED' };

  const { data, error } = await supabase
    .from('channel_invites')
    .insert({
      channel_id: channelId,
      created_by: profile.id,
      label:      input.label?.trim() ?? null,
      max_uses:   input.maxUses ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[createChannelInvite]', error);
    return { error: 'Failed to create invite', code: 'DB_ERROR' };
  }

  return { data: mapRow(data as Record<string, unknown>) };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getChannelInvites(channelId: string): Promise<ChannelInvite[]> {
  const session = await getCachedUserSession();
  if (!session.user) return [];

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return [];

  const supabase = await createClient();

  // Owner-only guard
  const { count } = await supabase
    .from('feed_channels')
    .select('id', { count: 'exact', head: true })
    .eq('id', channelId)
    .eq('owner_id', profile.id);
  if ((count ?? 0) === 0) return [];

  const { data, error } = await supabase
    .from('channel_invites')
    .select('*')
    .eq('channel_id', channelId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getChannelInvites]', error);
    return [];
  }

  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

// ─── Revoke ──────────────────────────────────────────────────────────────────

export async function revokeChannelInvite(inviteId: string): Promise<InviteResult<{ id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();

  // Owner-only guard: verify the invite belongs to a channel owned by this profile
  const { data: invite } = await supabase
    .from('channel_invites')
    .select('id, channel_id, feed_channels!inner(owner_id)')
    .eq('id', inviteId)
    .maybeSingle();

  type InviteRow = { id: string; channel_id: string; feed_channels: { owner_id: string } };
  const row = invite as InviteRow | null;
  if (!row || row.feed_channels.owner_id !== profile.id) {
    return { error: 'Not the channel owner', code: 'UNAUTHORIZED' };
  }

  const { error } = await supabase
    .from('channel_invites')
    .update({ is_active: false })
    .eq('id', inviteId);

  if (error) {
    console.error('[revokeChannelInvite]', error);
    return { error: 'Failed to revoke invite', code: 'DB_ERROR' };
  }

  return { data: { id: inviteId } };
}

// ─── Redeem ──────────────────────────────────────────────────────────────────

export async function redeemChannelInvite(
  token: string
): Promise<InviteResult<{ channelSlug: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();

  // Fetch invite + channel slug in one query
  const { data: inviteRow } = await supabase
    .from('channel_invites')
    .select('id, channel_id, max_uses, use_count, expires_at, is_active, feed_channels!inner(slug)')
    .eq('token', token)
    .maybeSingle();

  type InviteWithChannel = {
    id: string;
    channel_id: string;
    max_uses: number | null;
    use_count: number;
    expires_at: string | null;
    is_active: boolean;
    feed_channels: { slug: string };
  };

  const row = inviteRow as InviteWithChannel | null;
  if (!row || !row.is_active) return { error: 'Invalid or revoked invite', code: 'INVALID' };

  // Expiry check
  if (row.expires_at !== null && new Date(row.expires_at) <= new Date()) {
    return { error: 'This invite link has expired', code: 'EXPIRED' };
  }

  // Max uses check
  if (row.max_uses !== null && row.use_count >= row.max_uses) {
    return { error: 'This invite link has reached its maximum number of uses', code: 'MAXED' };
  }

  // Increment use_count (conditional to prevent overrun under races)
  const { error: incrError } = await supabase
    .from('channel_invites')
    .update({ use_count: row.use_count + 1 })
    .eq('id', row.id)
    .or(`max_uses.is.null,use_count.lt.${row.max_uses}`);

  if (incrError) {
    console.error('[redeemChannelInvite:increment]', incrError);
    return { error: 'Failed to redeem invite', code: 'DB_ERROR' };
  }

  // Join channel (upsert with ignoreDuplicates — already-a-member is idempotent)
  const joinResult = await joinChannel(row.channel_id);
  if ('error' in joinResult) {
    console.error('[redeemChannelInvite:join]', joinResult.error);
    return { error: 'Failed to join channel', code: 'DB_ERROR' };
  }

  return { data: { channelSlug: row.feed_channels.slug } };
}
