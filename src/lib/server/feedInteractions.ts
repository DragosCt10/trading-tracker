'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from './session';
import { getCachedSocialProfile } from './socialProfile';
import { createNotification } from './feedNotifications';
import type { FeedComment, PaginatedResult } from '@/types/social';
import type { TierId } from '@/types/subscription';

// ─── Types ───────────────────────────────────────────────────────────────────

type InteractionResult<T> =
  | { data: T }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'LIMIT_EXCEEDED' | 'DB_ERROR' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AuthorRow = {
  id: string; user_id: string; display_name: string;
  username: string; avatar_url: string | null; tier: TierId;
};

function mapCommentRow(row: Record<string, unknown>): FeedComment {
  const author = (row.author ?? {}) as AuthorRow;
  return {
    id:         row.id as string,
    post_id:    row.post_id as string,
    author: {
      id:           author.id,
      user_id:      author.user_id,
      display_name: author.display_name,
      username:     author.username,
      avatar_url:   author.avatar_url ?? null,
      tier:         (author.tier as TierId) ?? 'starter',
    },
    content:    row.content as string,
    parent_id:  (row.parent_id as string | null) ?? null,
    is_hidden:  (row.is_hidden as boolean) ?? false,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// ─── Likes ───────────────────────────────────────────────────────────────────

/**
 * Toggle like on a post. Returns the new like state.
 * Uses upsert + delete pattern — idempotent.
 * Self-likes are blocked server-side.
 */
export async function likePost(
  postId: string
): Promise<InteractionResult<{ liked: boolean; like_count: number }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

  const supabase = await createClient();

  // Check post exists and is not hidden; also check self-like
  const { data: post } = await supabase
    .from('feed_posts')
    .select('id, author_id, like_count')
    .eq('id', postId)
    .eq('is_hidden', false)
    .single();

  if (!post) return { error: 'Post not found', code: 'NOT_FOUND' };
  if ((post as { author_id: string }).author_id === profile.id) {
    return { error: 'Cannot like your own post', code: 'UNAUTHORIZED' };
  }

  // Check if already liked
  const { count } = await supabase
    .from('feed_likes')
    .select('post_id', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('user_id', profile.id);

  const alreadyLiked = (count ?? 0) > 0;

  if (alreadyLiked) {
    await supabase.from('feed_likes').delete().eq('post_id', postId).eq('user_id', profile.id);
  } else {
    await supabase.from('feed_likes').upsert({ post_id: postId, user_id: profile.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
    await createNotification({
      recipientProfileId: (post as { author_id: string }).author_id,
      actorProfileId: profile.id,
      type: 'like',
      postId,
    });
  }

  // Fetch updated like_count (maintained by DB trigger)
  const { data: updated } = await supabase
    .from('feed_posts')
    .select('like_count')
    .eq('id', postId)
    .single();

  return {
    data: {
      liked: !alreadyLiked,
      like_count: (updated as { like_count: number })?.like_count ?? 0,
    },
  };
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
      author:author_id (id, user_id, display_name, username, avatar_url, tier)
    `)
    .eq('post_id', postId)
    .eq('is_hidden', false)
    .is('parent_id', null) // top-level only; replies fetched separately or nested
    .order('created_at', { ascending: true })
    .limit(limit + 1);

  if (cursor) query = query.gt('created_at', cursor);

  const { data, error } = await query;
  if (error) { console.error('[getComments]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as Record<string, unknown>[];
  return {
    items: rows.slice(0, limit).map(mapCommentRow),
    nextCursor: rows.length > limit ? (rows[limit - 1].created_at as string) : null,
    hasMore: rows.length > limit,
  };
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
    .select('id, author_id, is_hidden')
    .eq('id', postId)
    .single();

  if (!post || (post as { is_hidden: boolean }).is_hidden) {
    return { error: 'Post not found', code: 'NOT_FOUND' };
  }

  const { data: created, error } = await supabase
    .from('feed_comments')
    .insert({
      post_id:   postId,
      author_id: profile.id,
      content:   content.trim(),
      parent_id: parentId ?? null,
    })
    .select(`*, author:author_id (id, user_id, display_name, username, avatar_url, tier)`)
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

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from('feed_comments')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('author_id', profile.id)
    .select(`*, author:author_id (id, user_id, display_name, username, avatar_url, tier)`)
    .single();

  if (error || !updated) {
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

export async function reportContent(
  reason: string,
  opts: { postId?: string; commentId?: string }
): Promise<InteractionResult<{ id: string }>> {
  if (!opts.postId && !opts.commentId) {
    return { error: 'Must provide postId or commentId', code: 'LIMIT_EXCEEDED' };
  }

  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };

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
      reason,
    })
    .select('id')
    .single();

  if (error || !created) {
    console.error('[reportContent] error:', error);
    return { error: 'Failed to submit report', code: 'DB_ERROR' };
  }

  return { data: { id: (created as { id: string }).id } };
}
