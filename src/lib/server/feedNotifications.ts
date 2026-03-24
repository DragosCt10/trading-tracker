'use server';

import { createClient } from '@/utils/supabase/server';
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

  const supabase = await createClient();
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

  const supabase = await createClient();
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

export async function createNotification(opts: {
  recipientProfileId: string;
  actorProfileId: string;
  type: NotificationType;
  postId?: string;
  commentId?: string;
}): Promise<void> {
  // No self-notifications
  if (opts.recipientProfileId === opts.actorProfileId) return;

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

/** Notifies a user that their social account was banned (moderation). Fire-and-forget. */
export async function notifyUserAccountBanned(recipientProfileId: string): Promise<void> {
  const session = await getCachedUserSession();
  if (!session.user) return;

  const actor = await getCachedSocialProfile(session.user.id);
  if (!actor) return;

  await createNotification({
    recipientProfileId,
    actorProfileId: actor.id,
    type: 'account_ban',
  });
}
