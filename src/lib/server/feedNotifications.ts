'use server';

import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getCachedUserSession } from './session';
import { getCachedSocialProfile } from './socialProfile';
import type { FeedNotification, NotificationType, PaginatedResult } from '@/types/social';

// ─── Types ───────────────────────────────────────────────────────────────────

type NotifResult<T> =
  | { data: T }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'DB_ERROR' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapNotifRow(row: Record<string, unknown>): FeedNotification {
  const actor = (row.actor ?? {}) as {
    id: string; display_name: string; username: string; avatar_url: string | null;
  };
  return {
    id:           row.id as string,
    recipient_id: row.recipient_id as string,
    actor: {
      id:           actor.id,
      display_name: actor.display_name,
      username:     actor.username,
      avatar_url:   actor.avatar_url ?? null,
    },
    type:       row.type as NotificationType,
    post_id:    (row.post_id as string | null) ?? null,
    comment_id: (row.comment_id as string | null) ?? null,
    is_read:    (row.is_read as boolean) ?? false,
    created_at: row.created_at as string,
  };
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getNotifications(
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<FeedNotification>> {
  const session = await getCachedUserSession();
  if (!session.user) return { items: [], nextCursor: null, hasMore: false };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { items: [], nextCursor: null, hasMore: false };

  // Use service role so banned users can still read their own notifications.
  const supabase = createServiceRoleClient() as any;
  let query = supabase
    .from('feed_notifications')
    .select(`
      *,
      actor:actor_id (id, display_name, username, avatar_url)
    `)
    .eq('recipient_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) { console.error('[getNotifications]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as Record<string, unknown>[];
  return {
    items: rows.slice(0, limit).map(mapNotifRow),
    nextCursor: rows.length > limit ? (rows[limit - 1].created_at as string) : null,
    hasMore: rows.length > limit,
  };
}

export async function getUnreadCount(): Promise<number> {
  const session = await getCachedUserSession();
  if (!session.user) return 0;

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return 0;

  // Use service role so banned users can still see their unread count.
  const supabase = createServiceRoleClient() as any;
  const { count } = await supabase
    .from('feed_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', profile.id)
    .eq('is_read', false);

  return count ?? 0;
}

// ─── Write ───────────────────────────────────────────────────────────────────

export async function markAsRead(notificationId: string): Promise<NotifResult<{ id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('feed_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', profile.id);

  if (error) {
    console.error('[markAsRead] error:', error);
    return { error: 'Failed to mark as read', code: 'DB_ERROR' };
  }

  return { data: { id: notificationId } };
}

export async function markAllAsRead(): Promise<NotifResult<{ count: number }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from('feed_notifications')
    .update({ is_read: true })
    .eq('recipient_id', profile.id)
    .eq('is_read', false);

  if (error) {
    console.error('[markAllAsRead] error:', error);
    return { error: 'Failed to mark all as read', code: 'DB_ERROR' };
  }

  return { data: { count: count ?? 0 } };
}

// ─── Internal: create notification (fire-and-forget) ─────────────────────────
// Called by other server actions (likePost, addComment, followUser).
// Never throws — failures are logged and swallowed.

const OFFER_TYPES: NotificationType[] = ['pro_3mo_discount', 'trade_milestone_10'];

export async function ensureOfferNotification(
  profileId: string,
  type: 'pro_3mo_discount' | 'trade_milestone_10',
): Promise<void> {
  try {
    // Use service role to bypass RLS — offer notifications are self-notifications
    // (actor_id = recipient_id) which session-scoped clients may block.
    const supabase = createServiceRoleClient() as any;
    const { count } = await supabase
      .from('feed_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', profileId)
      .eq('type', type);
    if ((count ?? 0) > 0) return;
    await supabase.from('feed_notifications').insert({
      recipient_id: profileId,
      actor_id:     profileId,
      type,
      post_id:      null,
      comment_id:   null,
    });
  } catch (err) {
    console.error('[ensureOfferNotification] failed (non-fatal):', err);
  }
}

export async function createNotification(opts: {
  recipientProfileId: string;
  actorProfileId: string;
  type: NotificationType;
  postId?: string;
  commentId?: string;
}): Promise<void> {
  // No self-notifications except for offer types
  if (!OFFER_TYPES.includes(opts.type) && opts.recipientProfileId === opts.actorProfileId) return;

  try {
    const supabase = await createClient();
    await supabase.from('feed_notifications').insert({
      recipient_id: opts.recipientProfileId,
      actor_id:     opts.actorProfileId,
      type:         opts.type,
      post_id:      opts.postId ?? null,
      comment_id:   opts.commentId ?? null,
    });
  } catch (err) {
    console.error('[createNotification] failed (non-fatal):', err);
  }
}

/** Notifies a user that their social account was unbanned (moderation). Fire-and-forget. */
export async function notifyUserAccountUnbanned(recipientProfileId: string): Promise<void> {
  const session = await getCachedUserSession();
  if (!session.user) return;

  const admin = createServiceRoleClient() as ReturnType<typeof createServiceRoleClient>;
  const { data: actorRow } = await (admin as any)
    .from('social_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!actorRow?.id) return;
  if (actorRow.id === recipientProfileId) return;

  try {
    await (admin as any).from('feed_notifications').insert({
      recipient_id: recipientProfileId,
      actor_id:     actorRow.id,
      type:         'account_unban',
      post_id:      null,
      comment_id:   null,
    });
  } catch (err) {
    console.error('[notifyUserAccountUnbanned] failed:', err);
  }
}

/** Notifies a user that their social account was banned (moderation). Fire-and-forget. */
export async function notifyUserAccountBanned(recipientProfileId: string): Promise<void> {
  const session = await getCachedUserSession();
  if (!session.user) return;

  // Look up the acting moderator's profile via service role so RLS never blocks the lookup.
  const admin = createServiceRoleClient() as ReturnType<typeof createServiceRoleClient>;
  const { data: actorRow } = await (admin as any)
    .from('social_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!actorRow?.id) return;
  if (actorRow.id === recipientProfileId) return; // no self-notification

  // Use service role for the insert to bypass any RLS restrictions on feed_notifications.
  try {
    await (admin as any).from('feed_notifications').insert({
      recipient_id: recipientProfileId,
      actor_id:     actorRow.id,
      type:         'account_ban',
      post_id:      null,
      comment_id:   null,
    });
  } catch (err) {
    console.error('[notifyUserAccountBanned] failed:', err);
  }
}

/** Notifies a user that a channel owner added them to a channel. Fire-and-forget. */
export async function notifyChannelMemberAdded(
  recipientProfileId: string,
  actorProfileId: string,
): Promise<void> {
  if (recipientProfileId === actorProfileId) return;

  try {
    const supabase = createServiceRoleClient() as any;
    await supabase.from('feed_notifications').insert({
      recipient_id: recipientProfileId,
      actor_id:     actorProfileId,
      type:         'channel_added',
      post_id:      null,
      comment_id:   null,
    });
  } catch (err) {
    console.error('[notifyChannelMemberAdded] failed (non-fatal):', err);
  }
}
