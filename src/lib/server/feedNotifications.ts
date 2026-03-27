'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from './supabaseAdmin';
import { getCachedUserSession } from './session';
import { getCachedSocialProfile } from './socialProfile';
import { isValidCursor } from './feedHelpers';
import { getUserActivityCount } from './feedActivity';
import { getAnonymousDisplayName } from '@/utils/displayName';
import { TRADE_MILESTONES, getMilestoneForCount } from '@/constants/tradeMilestones';
import { getTotalExecutedTradeCount } from '@/lib/server/tradeStats';
import { monthsSince } from '@/utils/helpers/dateHelpers';
import type { FeedNotification, NotificationType, PaginatedResult } from '@/types/social';

// ─── Types ───────────────────────────────────────────────────────────────────

type NotifResult<T> =
  | { data: T }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'DB_ERROR' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapNotifRow(row: Record<string, unknown>): FeedNotification {
  const actor = (row.actor ?? {}) as {
    id?: string; display_name?: string; username?: string; avatar_url?: string | null; is_public?: boolean;
  };
  // When RLS blocks the actor profile (is_public=false), the join returns null
  // and actor fields are undefined. Fall back to actor_id from the row itself.
  const actorId = actor.id ?? (row.actor_id as string);
  const hasActorData = !!actor.id;
  const isPublic = hasActorData && actor.is_public === true;
  return {
    id:           row.id as string,
    recipient_id: row.recipient_id as string,
    actor: {
      id:           actorId,
      display_name: hasActorData && isPublic ? (actor.display_name ?? 'Unknown') : getAnonymousDisplayName(actorId),
      username:     hasActorData && isPublic ? (actor.username ?? '') : '',
      avatar_url:   hasActorData && isPublic ? (actor.avatar_url ?? null) : null,
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

  // Session client is sufficient: notifications_select_own RLS resolves through
  // social_profiles, and profiles_select_own allows banned users to see their own
  // profile row (PERMISSIVE OR logic), so the subquery still matches auth.uid().
  const supabase = await createClient();
  let query = supabase
    .from('feed_notifications')
    .select(`
      *,
      actor:actor_id (id, display_name, username, avatar_url, is_public)
    `)
    .eq('recipient_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor && isValidCursor(cursor)) query = query.lt('created_at', cursor);

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
  const supabase = createAdminClient();
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

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteNotification(notificationId: string): Promise<void> {
  const session = await getCachedUserSession();
  if (!session.user) return;

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return;

  // Use service role to bypass RLS — recipient_id filter enforces ownership.
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('feed_notifications')
    .delete()
    .eq('id', notificationId)
    .eq('recipient_id', profile.id);

  if (error) console.error('[deleteNotification] error:', error);
}

export async function deleteAllReadNotifications(): Promise<void> {
  const session = await getCachedUserSession();
  if (!session.user) return;

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return;

  // Use service role to bypass RLS — recipient_id filter enforces ownership.
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('feed_notifications')
    .delete()
    .eq('recipient_id', profile.id)
    .eq('is_read', true);

  if (error) console.error('[deleteAllReadNotifications] error:', error);
}

export async function deleteAllNotifications(): Promise<void> {
  const session = await getCachedUserSession();
  if (!session.user) return;

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return;

  // Use service role to bypass RLS — recipient_id filter enforces ownership.
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('feed_notifications')
    .delete()
    .eq('recipient_id', profile.id);

  if (error) console.error('[deleteAllNotifications] error:', error);
}

// ─── Internal: create notification (fire-and-forget) ─────────────────────────
// Called by other server actions (likePost, addComment, followUser).
// Never throws — failures are logged and swallowed.

const OFFER_TYPES: NotificationType[] = ['pro_3mo_discount', 'pro_loyalty_unlocked', 'trade_milestone_10', 'post_milestone', 'trade_milestone_100', 'trade_milestone_200', 'trade_milestone_500', 'trade_milestone_750', 'trade_milestone_1000'];

export async function checkPostMilestones(profileId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { count: existingCount } = await supabase
      .from('feed_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', profileId)
      .eq('type', 'post_milestone');

    const fired = existingCount ?? 0;
    if (fired >= 3) return;

    const { total } = await getUserActivityCount(profileId);
    const milestones = [100, 200, 300];
    if (total >= milestones[fired]) {
      await supabase.from('feed_notifications').insert({
        recipient_id: profileId,
        actor_id:     profileId,
        type:         'post_milestone',
        post_id:      null,
        comment_id:   null,
      });
    }
  } catch (err) {
    console.error('[checkPostMilestones] failed (non-fatal):', err);
  }
}

export async function ensureOfferNotification(
  profileId: string,
  type: 'pro_3mo_discount' | 'pro_loyalty_unlocked' | 'trade_milestone_10',
): Promise<void> {
  try {
    // Use service role to bypass RLS — offer notifications are self-notifications
    // (actor_id = recipient_id) which session-scoped clients may block.
    const supabase = createAdminClient();
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

/**
 * Checks all trade milestones (100, 200, 500, 750, 1000) for a user.
 * Idempotent — only inserts notifications for milestones not yet notified.
 * Updates social_profiles.trade_badge with the highest achieved milestone.
 * Fire-and-forget — never throws.
 */
export async function checkTradeMilestones(
  profileId: string,
  userId: string,
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Early return: if already at alpha_trader, no more milestones to earn
    const { data: profile } = await supabase
      .from('social_profiles')
      .select('trade_badge')
      .eq('id', profileId)
      .maybeSingle();
    if (profile?.trade_badge === 'alpha_trader') return;

    const totalTrades = await getTotalExecutedTradeCount(userId);
    const currentMilestone = getMilestoneForCount(totalTrades);
    if (!currentMilestone) return; // < 100 trades

    const crossedMilestones = TRADE_MILESTONES.filter((m) => totalTrades >= m.minTrades);

    // Insert notifications for all crossed milestones (idempotent, single batch)
    const { data: existingNotifs } = await supabase
      .from('feed_notifications')
      .select('type')
      .eq('recipient_id', profileId)
      .in('type', crossedMilestones.map((m) => m.notificationType));
    const existingTypes = new Set((existingNotifs ?? []).map((r: { type: string }) => r.type));
    const toInsert = crossedMilestones
      .filter((m) => !existingTypes.has(m.notificationType))
      .map((m) => ({
        recipient_id: profileId,
        actor_id:     profileId,
        type:         m.notificationType,
        post_id:      null,
        comment_id:   null,
      }));
    if (toInsert.length > 0) {
      await supabase.from('feed_notifications').insert(toInsert);
    }

    // Update denormalized trade_badge to highest achieved milestone
    if (profile?.trade_badge !== currentMilestone.id) {
      await supabase
        .from('social_profiles')
        .update({ trade_badge: currentMilestone.id })
        .eq('id', profileId);
    }

    // Update feature_flags with badge info + available discounts

    // Read existing feature_flags to preserve discount "used" state
    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('feature_flags')
      .eq('user_id', userId)
      .maybeSingle();

    const existingFlags = (settingsRow?.feature_flags ?? {}) as Record<string, unknown>;
    const existingDiscounts = Array.isArray((existingFlags as { available_discounts?: unknown }).available_discounts)
      ? (existingFlags as { available_discounts: { milestoneId: string; discountPct: number; used: boolean; couponCode?: string; generatedAt?: string; achievedAt?: string }[] }).available_discounts
      : [];

    const availableDiscounts = crossedMilestones.map((m) => {
      const existing = existingDiscounts.find((d) => d.milestoneId === m.id);
      return {
        ...existing,
        milestoneId: m.id,
        discountPct: m.discountPct,
        used: existing?.used ?? false,
      };
    });

    const existingBadge = (existingFlags.trade_badge ?? {}) as { achievedAt?: string };
    const featureFlags = {
      ...existingFlags,
      trade_badge: {
        id: currentMilestone.id,
        totalTrades,
        achievedAt: existingBadge.achievedAt ?? new Date().toISOString(),
      },
      available_discounts: availableDiscounts,
    };

    await supabase
      .from('user_settings')
      .upsert(
        { user_id: userId, feature_flags: featureFlags },
        { onConflict: 'user_id' },
      );
  } catch (err) {
    console.error('[checkTradeMilestones] failed (non-fatal):', err);
  }
}

/**
 * Looks up the social profile for a user, syncs trade_badge, and fires
 * the pro_3mo_discount notification once the user has been on PRO for ≥3 months.
 * Called on Rewards page load — idempotent, non-fatal.
 */
export async function syncUserBadge(userId: string, proSinceDate?: string | null): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: profileRow } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profileRow) return;
    const profileId = (profileRow as { id: string }).id;

    await checkTradeMilestones(profileId, userId);

    // Fire pro_loyalty_unlocked notification once user has been on PRO for ≥3 months
    if (proSinceDate && monthsSince(proSinceDate) >= 3) {
      void ensureOfferNotification(profileId, 'pro_loyalty_unlocked');
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Fires the pro_loyalty_unlocked notification once the user has been on PRO for ≥3 months.
 * Does NOT call checkTradeMilestones — use this on the Rewards page instead of syncUserBadge
 * to avoid triggering the couponCode wipe bug.
 * Fire-and-forget — never throws.
 */
export async function syncProLoyaltyNotification(userId: string, proSinceDate?: string | null): Promise<void> {
  if (!proSinceDate) return;
  if (monthsSince(proSinceDate) < 3) return;

  try {
    const supabase = createAdminClient();
    const { data: profileRow } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profileRow) return;
    const profileId = (profileRow as { id: string }).id;
    await ensureOfferNotification(profileId, 'pro_loyalty_unlocked');
  } catch {
    // Non-fatal
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

  const admin = createAdminClient();
  const { data: actorRow } = await admin
    .from('social_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!actorRow?.id) return;
  if (actorRow.id === recipientProfileId) return;

  try {
    await admin.from('feed_notifications').insert({
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
  const admin = createAdminClient();
  const { data: actorRow } = await admin
    .from('social_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!actorRow?.id) return;
  if (actorRow.id === recipientProfileId) return; // no self-notification

  // Use service role for the insert to bypass any RLS restrictions on feed_notifications.
  try {
    await admin.from('feed_notifications').insert({
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

/** Notifies a user that a channel owner removed them from a public channel. Fire-and-forget. */
export async function notifyChannelMemberRemoved(
  recipientProfileId: string,
  actorProfileId: string,
): Promise<void> {
  if (recipientProfileId === actorProfileId) return;
  try {
    const supabase = createAdminClient();
    await supabase.from('feed_notifications').insert({
      recipient_id: recipientProfileId,
      actor_id:     actorProfileId,
      type:         'channel_removed',
      post_id:      null,
      comment_id:   null,
    });
  } catch (err) {
    console.error('[notifyChannelMemberRemoved] failed (non-fatal):', err);
  }
}

/** Notifies a user that a channel owner added them to a private channel. Fire-and-forget. */
export async function notifyPrivateChannelMemberAdded(
  recipientProfileId: string,
  actorProfileId: string,
): Promise<void> {
  if (recipientProfileId === actorProfileId) return;
  try {
    const supabase = createAdminClient();
    await supabase.from('feed_notifications').insert({
      recipient_id: recipientProfileId,
      actor_id:     actorProfileId,
      type:         'private_channel_added',
      post_id:      null,
      comment_id:   null,
    });
  } catch (err) {
    console.error('[notifyPrivateChannelMemberAdded] failed (non-fatal):', err);
  }
}

/** Notifies a user that a channel owner removed them from a private channel. Fire-and-forget. */
export async function notifyPrivateChannelMemberRemoved(
  recipientProfileId: string,
  actorProfileId: string,
): Promise<void> {
  if (recipientProfileId === actorProfileId) return;
  try {
    const supabase = createAdminClient();
    await supabase.from('feed_notifications').insert({
      recipient_id: recipientProfileId,
      actor_id:     actorProfileId,
      type:         'private_channel_removed',
      post_id:      null,
      comment_id:   null,
    });
  } catch (err) {
    console.error('[notifyPrivateChannelMemberRemoved] failed (non-fatal):', err);
  }
}

/** Notifies a user that a channel owner added them to a channel. Fire-and-forget. */
export async function notifyChannelMemberAdded(
  recipientProfileId: string,
  actorProfileId: string,
): Promise<void> {
  if (recipientProfileId === actorProfileId) return;

  try {
    const supabase = createAdminClient();
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
