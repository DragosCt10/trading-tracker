'use server';

import { createClient } from '@/utils/supabase/server';
import type { FeedPost, SocialProfile, PaginatedResult } from '@/types/social';
import type { TierId } from '@/types/subscription';

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
    .select(`*, author:author_id (id, user_id, display_name, username, avatar_url, tier)`)
    .eq('is_hidden', false)
    .textSearch('content', tsQuery, { type: 'websearch', config: 'english' })
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) q = q.lt('created_at', cursor);

  const { data, error } = await q;
  if (error) { console.error('[searchPosts]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as Record<string, unknown>[];
  const items = rows.slice(0, limit).map((row) => {
    const author = (row.author ?? {}) as { id: string; user_id: string; display_name: string; username: string; avatar_url: string | null; tier: TierId };
    return {
      id: row.id as string,
      author: { id: author.id, user_id: author.user_id, display_name: author.display_name, username: author.username, avatar_url: author.avatar_url ?? null, tier: author.tier ?? 'starter' as TierId },
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
    } satisfies FeedPost;
  });

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
  // Strip characters that break PostgREST filter parsing (comma, dot, parens)
  const sanitized = query.trim().replace(/[,%.()\s]+/g, ' ').trim();
  if (!sanitized) return [];
  const pattern = `%${sanitized}%`;

  const { data, error } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('is_public', true)
    .eq('is_banned', false)
    .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
    .limit(limit);

  if (error) { console.error('[searchProfiles]', error); return []; }

  return (data ?? []).map((r) => r as unknown as SocialProfile);
}
