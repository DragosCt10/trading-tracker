'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from './session';
import { getCachedSocialProfile } from './socialProfile';
import { createNotification } from './feedNotifications';
import { isPublicChannelReadOnlyForProfile } from './feedChannels';
import type { FeedComment, PaginatedResult } from '@/types/social';
import type { TierId } from '@/types/subscription';

// ─── Types ───────────────────────────────────────────────────────────────────

type InteractionResult<T> =
  | { data: T }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'LIMIT_EXCEEDED' | 'DB_ERROR' };

const COMMENT_EDIT_WINDOW_MS = 10 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AuthorRow = {
  id: string; user_id: string; display_name: string;
  username: string; avatar_url: string | null; tier: TierId; is_public: boolean;
};

function mapCommentRow(row: Record<string, unknown>, replyCount = 0): FeedComment {
  const author = (row.author ?? {}) as AuthorRow;
  return {
    id:          row.id as string,
    post_id:     row.post_id as string,
    author: {
      id:           author.id,
      user_id:      author.user_id,
      display_name: author.display_name,
      username:     author.username,
      avatar_url:   author.avatar_url ?? null,
      tier:         (author.tier as TierId) ?? 'starter',
      is_public:    typeof author.is_public === 'boolean' ? author.is_public : true,
    },
    content:     row.content as string,
    parent_id:   (row.parent_id as string | null) ?? null,
    is_hidden:   (row.is_hidden as boolean) ?? false,
    created_at:  row.created_at as string,
    updated_at:  row.updated_at as string,
    reply_count: replyCount,
  };
}

// ─── Likes ───────────────────────────────────────────────────────────────────

/**
 * Toggle like on a post. Returns the new like state.
 * Delegates to the atomic `toggle_like` Postgres function (see apply-fixes.sql)
 * which checks + upserts/deletes in a single transaction — no race condition.
 * Self-likes are blocked server-side inside the function.
 */
export async function likePost(
  postId: string
): Promise<InteractionResult<{ liked: boolean; like_count: number }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('toggle_like', {
    p_post_id: postId,
    p_user_id: profile.id,
  });

  if (error) {
    // Handle known error codes returned by the function
    if (error.message?.includes('NOT_FOUND')) return { error: 'Post not found', code: 'NOT_FOUND' };
    if (error.message?.includes('SELF_LIKE')) return { error: 'Cannot like your own post', code: 'UNAUTHORIZED' };
    console.error('[likePost]', error);
    return { error: 'Failed to toggle like', code: 'DB_ERROR' };
  }

  const result = data as { liked: boolean; like_count: number; author_id: string };

  // Fire notification for new likes (not unlikes)
  if (result.liked) {
    await createNotification({
      recipientProfileId: result.author_id,
      actorProfileId: profile.id,
      type: 'like',
      postId,
    });
  }

  return { data: { liked: result.liked, like_count: result.like_count } };
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function getComments(
  postId: string,
  cursor?: string,
  limit = 30
): Promise<PaginatedResult<FeedComment>> {
  const supabase = await createClient();

  let query = supabase
    .from('feed_comments')
    .select(`
      *,
      author:author_id (id, user_id, display_name, username, avatar_url, tier, is_public)
    `)
    .eq('post_id', postId)
    .eq('is_hidden', false)
    .is('parent_id', null) // top-level only; replies fetched separately or nested
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) { console.error('[getComments]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as Record<string, unknown>[];
  const pageRows = rows.slice(0, limit);

  // Fetch reply counts for this page in a single query
  const commentIds = pageRows.map((r) => r.id as string);
  const replyCounts: Record<string, number> = {};
  if (commentIds.length > 0) {
    const { data: replyRows } = await supabase
      .from('feed_comments')
      .select('parent_id')
      .in('parent_id', commentIds)
      .eq('is_hidden', false);
    for (const r of replyRows ?? []) {
      const pid = r.parent_id as string;
      replyCounts[pid] = (replyCounts[pid] ?? 0) + 1;
    }
  }

  return {
    items: pageRows.map((r) => mapCommentRow(r, replyCounts[r.id as string] ?? 0)),
    nextCursor: rows.length > limit ? (rows[limit - 1].created_at as string) : null,
    hasMore: rows.length > limit,
  };
}

export async function getReplies(
  commentId: string,
  limit = 20
): Promise<FeedComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('feed_comments')
    .select(`
      *,
      author:author_id (id, user_id, display_name, username, avatar_url, tier, is_public)
    `)
    .eq('parent_id', commentId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) { console.error('[getReplies]', error); return []; }
  return (data ?? []).map((row) => mapCommentRow(row as Record<string, unknown>));
}

export async function addComment(
  postId: string,
  content: string,
  parentId?: string
): Promise<InteractionResult<FeedComment>> {
  if (!content.trim()) return { error: 'Comment cannot be empty', code: 'LIMIT_EXCEEDED' };
  if (content.length > 500) return { error: 'Comment exceeds 500 characters', code: 'LIMIT_EXCEEDED' };

  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };
  if (profile.is_banned) return { error: 'Account is banned', code: 'UNAUTHORIZED' };

  const supabase = await createClient();

  // Verify post exists and is not hidden
  const { data: post } = await supabase
    .from('feed_posts')
    .select('id, author_id, is_hidden, channel_id')
    .eq('id', postId)
    .single();

  if (!post || (post as { is_hidden: boolean }).is_hidden) {
    return { error: 'Post not found', code: 'NOT_FOUND' };
  }

  const commentChannelId = (post as { channel_id: string | null }).channel_id;
  if (commentChannelId && (await isPublicChannelReadOnlyForProfile(profile.id, commentChannelId))) {
    return {
      error:
        'You were removed from this channel by the owner. You cannot comment here until they add you back.',
      code: 'UNAUTHORIZED',
    };
  }

  // Verify parent comment exists and belongs to the same post
  if (parentId) {
    const { data: parent } = await supabase
      .from('feed_comments')
      .select('id, post_id')
      .eq('id', parentId)
      .single();
    if (!parent || (parent as { post_id: string }).post_id !== postId) {
      return { error: 'Parent comment not found', code: 'NOT_FOUND' };
    }
  }

  const { data: created, error } = await supabase
    .from('feed_comments')
    .insert({
      post_id:   postId,
      author_id: profile.id,
      content:   content.trim(),
      parent_id: parentId ?? null,
    })
    .select(`*, author:author_id (id, user_id, display_name, username, avatar_url, tier, is_public)`)
    .single();

  if (error || !created) {
    console.error('[addComment] error:', error);
    return { error: 'Failed to add comment', code: 'DB_ERROR' };
  }

  await createNotification({
    recipientProfileId: (post as { author_id: string }).author_id,
    actorProfileId: profile.id,
    type: 'comment',
    postId,
    commentId: (created as { id: string }).id,
  });

  return { data: mapCommentRow(created as Record<string, unknown>) };
}

export async function editComment(
  commentId: string,
  content: string
): Promise<InteractionResult<FeedComment>> {
  if (!content.trim()) return { error: 'Comment cannot be empty', code: 'LIMIT_EXCEEDED' };
  if (content.length > 500) return { error: 'Comment exceeds 500 characters', code: 'LIMIT_EXCEEDED' };

  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };
  if (profile.is_banned) return { error: 'Account is banned', code: 'UNAUTHORIZED' };

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const editWindowStartIso = new Date(Date.now() - COMMENT_EDIT_WINDOW_MS).toISOString();
  const { data: updated, error } = await supabase
    .from('feed_comments')
    .update({ content: content.trim(), updated_at: nowIso })
    .eq('id', commentId)
    .eq('author_id', profile.id)
    .gte('created_at', editWindowStartIso)
    .select(`*, author:author_id (id, user_id, display_name, username, avatar_url, tier, is_public)`)
    .single();

  if (error || !updated) {
    const { data: existing } = await supabase
      .from('feed_comments')
      .select('id, created_at')
      .eq('id', commentId)
      .eq('author_id', profile.id)
      .maybeSingle();

    if (!existing) {
      return { error: 'Comment not found', code: 'NOT_FOUND' };
    }

    if (new Date(existing.created_at as string).getTime() < Date.now() - COMMENT_EDIT_WINDOW_MS) {
      return { error: 'Comments can only be edited within 10 minutes', code: 'LIMIT_EXCEEDED' };
    }

    console.error('[editComment] error:', error);
    return { error: 'Failed to edit comment', code: 'DB_ERROR' };
  }

  return { data: mapCommentRow(updated as Record<string, unknown>) };
}

export async function deleteComment(commentId: string): Promise<InteractionResult<{ id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };
  if (profile.is_banned) return { error: 'Account is banned', code: 'UNAUTHORIZED' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('feed_comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', profile.id);

  if (error) {
    console.error('[deleteComment] error:', error);
    return { error: 'Failed to delete comment', code: 'DB_ERROR' };
  }

  return { data: { id: commentId } };
}

// ─── Reports ─────────────────────────────────────────────────────────────────

const REPORT_DAILY_LIMIT = 5;
const REPORT_REASON_MAX_LEN = 100;

export async function reportContent(
  reason: string,
  opts: { postId?: string; commentId?: string }
): Promise<InteractionResult<{ id: string }>> {
  if (!opts.postId && !opts.commentId) {
    return { error: 'Must provide postId or commentId', code: 'LIMIT_EXCEEDED' };
  }

  const reasonTrimmed = reason.trim();
  if (reasonTrimmed.length > REPORT_REASON_MAX_LEN) {
    return { error: `Report reason must be ${REPORT_REASON_MAX_LEN} characters or less`, code: 'LIMIT_EXCEEDED' };
  }

  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };
  if (profile.is_banned) return { error: 'Account is banned', code: 'UNAUTHORIZED' };

  const supabase = await createClient();

  // Rate limit: max 5 reports per 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('feed_reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', profile.id)
    .gte('created_at', since);

  if ((count ?? 0) >= REPORT_DAILY_LIMIT) {
    return { error: 'Report limit reached (5 per 24h)', code: 'LIMIT_EXCEEDED' };
  }

  const { data: created, error } = await supabase
    .from('feed_reports')
    .insert({
      reporter_id: profile.id,
      post_id:     opts.postId ?? null,
      comment_id:  opts.commentId ?? null,
      reason:      reasonTrimmed,
    })
    .select('id')
    .single();

  if (error || !created) {
    console.error('[reportContent] error:', error);
    return { error: 'Failed to submit report', code: 'DB_ERROR' };
  }

  return { data: { id: (created as { id: string }).id } };
}
