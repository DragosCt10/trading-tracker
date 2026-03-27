'use server';

import { createAdminClient } from './supabaseAdmin';
import { isAdmin } from './admin';
import { notifyUserAccountBanned, notifyUserAccountUnbanned } from './feedNotifications';
import { mapAuthorRow, isValidCursor, AUTHOR_SELECT_FIELDS } from './feedHelpers';
import type { AuthorRow } from './feedHelpers';
import type { FeedPost, SocialProfile, PaginatedResult } from '@/types/social';

type ModeResult<T> =
  | { data: T }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'DB_ERROR' };

// ─── Guard: must be moderator/admin role ──────────────────────────────────────

async function assertModerator() {
  const allowed = await isAdmin();
  return allowed ? { role: 'admin' as const } : null;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface FeedReport {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  post?: { id: string; content: string; author: { display_name: string; username: string } } | null;
}

export async function getPendingReports(
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<FeedReport>> {
  const mod = await assertModerator();
  if (!mod) return { items: [], nextCursor: null, hasMore: false };

  const supabase = createAdminClient();
  let q = supabase
    .from('feed_reports')
    .select(`
      *,
      post:post_id (
        id, content,
        author:author_id ( display_name, username )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor && isValidCursor(cursor)) q = q.lt('created_at', cursor);

  const { data, error } = await q;
  if (error) { console.error('[getPendingReports]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as FeedReport[];
  return {
    items: rows.slice(0, limit),
    nextCursor: rows.length > limit ? rows[limit - 1].created_at : null,
    hasMore: rows.length > limit,
  };
}

export async function resolveReport(
  reportId: string,
  action: 'dismiss' | 'hide_post' | 'ban_author'
): Promise<ModeResult<{ reportId: string }>> {
  const mod = await assertModerator();
  if (!mod) return { error: 'Not authorized', code: 'UNAUTHORIZED' };

  const supabase = createAdminClient();

  // Fetch the report to get post_id
  const { data: report } = await supabase
    .from('feed_reports')
    .select('post_id')
    .eq('id', reportId)
    .single();

  if (!report) return { error: 'Report not found', code: 'NOT_FOUND' };

  const postId = (report as { post_id: string | null }).post_id;

  if (action === 'hide_post' && postId) {
    const { error } = await supabase
      .from('feed_posts')
      .update({ is_hidden: true })
      .eq('id', postId);
    if (error) { console.error('[resolveReport:hide_post]', error); return { error: 'Failed to hide post', code: 'DB_ERROR' }; }
  }

  if (action === 'ban_author' && postId) {
    // Get author profile from post
    const { data: post } = await supabase
      .from('feed_posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (post) {
      const authorId = (post as { author_id: string }).author_id;
      const { error } = await supabase
        .from('social_profiles')
        .update({ is_banned: true })
        .eq('id', authorId);
      if (error) { console.error('[resolveReport:ban_author]', error); return { error: 'Failed to ban author', code: 'DB_ERROR' }; }

      // Also hide all posts by banned author
      await supabase
        .from('feed_posts')
        .update({ is_hidden: true })
        .eq('author_id', authorId);

      await notifyUserAccountBanned(authorId);
    }
  }

  // Mark report resolved
  await supabase
    .from('feed_reports')
    .update({ status: action === 'dismiss' ? 'dismissed' : 'reviewed' })
    .eq('id', reportId);

  return { data: { reportId } };
}

// ─── Direct post hide / unhide ────────────────────────────────────────────────

export async function setPostVisibility(
  postId: string,
  hidden: boolean
): Promise<ModeResult<{ postId: string }>> {
  const mod = await assertModerator();
  if (!mod) return { error: 'Not authorized', code: 'UNAUTHORIZED' };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('feed_posts')
    .update({ is_hidden: hidden })
    .eq('id', postId);

  if (error) { console.error('[setPostVisibility]', error); return { error: 'Failed to update post', code: 'DB_ERROR' }; }
  return { data: { postId } };
}

// ─── Ban / unban user ─────────────────────────────────────────────────────────

export async function setUserBan(
  profileId: string,
  banned: boolean
): Promise<ModeResult<{ profileId: string }>> {
  const mod = await assertModerator();
  if (!mod) return { error: 'Not authorized', code: 'UNAUTHORIZED' };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('social_profiles')
    .update({ is_banned: banned })
    .eq('id', profileId);

  if (error) { console.error('[setUserBan]', error); return { error: 'Failed to update user', code: 'DB_ERROR' }; }

  // Update posts in batches of 500 to avoid long table locks on prolific users.
  const BATCH = 500;
  let affected = 0;
  do {
    const { data: batch } = await supabase
      .from('feed_posts')
      .select('id')
      .eq('author_id', profileId)
      .eq('is_hidden', !banned)
      .limit(BATCH);
    const ids = ((batch ?? []) as { id: string }[]).map((r) => r.id);
    if (ids.length === 0) break;
    await supabase.from('feed_posts').update({ is_hidden: banned }).in('id', ids);
    affected = ids.length;
  } while (affected === BATCH);

  if (banned) {
    await notifyUserAccountBanned(profileId);
  } else {
    await notifyUserAccountUnbanned(profileId);
  }

  return { data: { profileId } };
}

// ─── Flagged posts (hidden, for review) ──────────────────────────────────────

export async function getHiddenPosts(
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<FeedPost>> {
  const mod = await assertModerator();
  if (!mod) return { items: [], nextCursor: null, hasMore: false };

  const supabase = createAdminClient();
  let q = supabase
    .from('feed_posts')
    .select(`*, author:author_id (${AUTHOR_SELECT_FIELDS})`)
    .eq('is_hidden', true)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor && isValidCursor(cursor)) q = q.lt('created_at', cursor);

  const { data, error } = await q;
  if (error) { console.error('[getHiddenPosts]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as Record<string, unknown>[];
  const items: FeedPost[] = rows.slice(0, limit).map((row) => ({
    id: row.id as string,
    author: mapAuthorRow((row.author ?? {}) as Partial<AuthorRow>),
    content: row.content as string,
    post_type: (row.post_type as 'text' | 'trade_share') ?? 'text',
    trade_snapshot: null,
    channel_id: (row.channel_id as string | null) ?? null,
    like_count: (row.like_count as number) ?? 0,
    comment_count: (row.comment_count as number) ?? 0,
    is_hidden: true,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    is_liked_by_me: false,
  }));

  return {
    items,
    nextCursor: rows.length > limit ? (rows[limit - 1].created_at as string) : null,
    hasMore: rows.length > limit,
  };
}

// ─── Banned users list ────────────────────────────────────────────────────────

export async function getBannedUsers(limit = 50): Promise<SocialProfile[]> {
  const mod = await assertModerator();
  if (!mod) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('is_banned', true)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) { console.error('[getBannedUsers]', error); return []; }
  return (data ?? []) as unknown as SocialProfile[];
}
