'use server';

import { createClient } from '@/utils/supabase/server';
import { mapAuthorRow, isValidCursor } from './feedHelpers';
import type { AuthorRow } from './feedHelpers';
import type { FeedPost, SocialProfile, PaginatedResult } from '@/types/social';

// ─── Search Posts (full-text via GIN index) ────────────────────────────────

export async function searchPosts(
  query: string,
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<FeedPost>> {
  if (!query.trim()) return { items: [], nextCursor: null, hasMore: false };

  const supabase = await createClient();

  // Sanitize query for to_tsquery: replace non-word chars, join tokens with &
  const tsQuery = query
    .trim()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' & ');

  if (!tsQuery) return { items: [], nextCursor: null, hasMore: false };

  let q = supabase
    .from('feed_posts')
    .select(`id, content, post_type, like_count, comment_count, created_at, updated_at, author:author_id (id, user_id, display_name, username, avatar_url, tier, is_public)`)
    .eq('is_hidden', false)
    .textSearch('content', tsQuery, { type: 'websearch', config: 'english' })
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor && isValidCursor(cursor)) q = q.lt('created_at', cursor);

  const { data, error } = await q;
  if (error) { console.error('[searchPosts]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as Record<string, unknown>[];
  // Privacy filter: exclude posts from private-profile authors.
  const pageRows = rows
    .slice(0, limit)
    .filter((row) => {
      const a = (row.author ?? {}) as Partial<AuthorRow>;
      return a.is_public !== false;
    });
  const items: FeedPost[] = pageRows.map((row) => ({
    id: row.id as string,
    author: mapAuthorRow((row.author ?? {}) as Partial<AuthorRow>),
    content: row.content as string,
    post_type: (row.post_type as 'text' | 'trade_share') ?? 'text',
    trade_snapshot: null,
    channel_id: null,
    like_count: (row.like_count as number) ?? 0,
    comment_count: (row.comment_count as number) ?? 0,
    is_hidden: false,
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

// ─── Search Profiles ────────────────────────────────────────────────────────

export async function searchProfiles(
  query: string,
  limit = 20
): Promise<SocialProfile[]> {
  if (!query.trim()) return [];

  const supabase = await createClient();
  // Strip characters that could break PostgREST filter parsing or act as LIKE wildcards.
  const sanitized = query.trim().replace(/[,%.()\s'"`;=!]+/g, ' ').trim();
  if (!sanitized) return [];
  // Escape LIKE wildcards in user input so only our wrapping % acts as wildcard.
  const escaped = sanitized.replace(/[%_]/g, '\\$&');
  const pattern = `%${escaped}%`;

  const { data, error } = await supabase
    .from('social_profiles')
    .select('id, user_id, display_name, username, bio, avatar_url, is_public, is_banned, follower_count, following_count, tier, created_at, updated_at')
    .eq('is_public', true)
    .eq('is_banned', false)
    .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
    .limit(limit);

  if (error) { console.error('[searchProfiles]', error); return []; }

  return (data ?? []).map((r) => r as unknown as SocialProfile);
}
