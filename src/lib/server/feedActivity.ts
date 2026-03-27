'use server';

import { createAdminClient } from './supabaseAdmin';

export async function getUserActivityCount(profileId: string): Promise<{ posts: number; comments: number; total: number }> {
  const supabase = createAdminClient();

  const [{ count: posts }, { count: comments }] = await Promise.all([
    supabase
      .from('feed_posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profileId)
      .eq('is_hidden', false),
    supabase
      .from('feed_comments')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profileId)
      .eq('is_hidden', false),
  ]);

  const p = posts ?? 0;
  const c = comments ?? 0;
  return { posts: p, comments: c, total: p + c };
}
