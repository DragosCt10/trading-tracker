'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from './session';
import { getCachedSocialProfile } from './socialProfile';
import { checkRateLimit } from '@/lib/rateLimit';
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

  // Owner-only guard: fetch invite then verify channel ownership separately
  const { data: invite, error: inviteFetchError } = await supabase
    .from('channel_invites')
    .select('id, channel_id')
    .eq('id', inviteId)
    .maybeSingle();

  if (inviteFetchError) {
    console.error('[revokeChannelInvite:fetch]', inviteFetchError);
    return { error: 'Failed to load invite', code: 'DB_ERROR' };
  }
  if (!invite) return { error: 'Invite not found', code: 'NOT_FOUND' };

  const { count } = await supabase
    .from('feed_channels')
    .select('id', { count: 'exact', head: true })
    .eq('id', invite.channel_id)
    .eq('owner_id', profile.id);
  if ((count ?? 0) === 0) return { error: 'Not the channel owner', code: 'UNAUTHORIZED' };

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
): Promise<InviteResult<{ channelSlug: string; alreadyMember: boolean }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  // Rate limit: 10 redemption attempts per user per minute
  if (!checkRateLimit(`${profile.id}:invite`, 10, 60_000)) {
    return { error: 'Too many redemption attempts. Please try again later.', code: 'DB_ERROR' };
  }

  const supabase = await createClient();

  // Atomic redemption via SECURITY DEFINER function:
  // validates invite, locks row, increments use_count, and upserts membership
  // in a single transaction — no race conditions, no RLS bypass surface.
  const { data, error } = await supabase
    .rpc('redeem_channel_invite', { p_token: token })
    .single();

  if (error) {
    console.error('[redeemChannelInvite:rpc]', error);
    return { error: 'Failed to redeem invite', code: 'DB_ERROR' };
  }

  type RpcRow = { channel_slug: string | null; already_member: boolean | null; error_code: string | null };
  const row = data as RpcRow;

  if (row.error_code) {
    const validCode = row.error_code as 'INVALID' | 'EXPIRED' | 'MAXED' | 'DB_ERROR';
    return { error: row.error_code, code: validCode };
  }

  return { data: { channelSlug: row.channel_slug!, alreadyMember: row.already_member! } };
}
