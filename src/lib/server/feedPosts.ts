'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from './session';
import { getCachedSocialProfile } from './socialProfile';
import { getCachedSubscription } from './subscription';
import { isPublicChannelReadOnlyForProfile } from './feedChannels';
import { checkPostMilestones } from './feedNotifications';
import { mapAuthorRow, isValidCursor } from './feedHelpers';
import type { AuthorRow } from './feedHelpers';
import type { FeedPost, TradeSnapshot, TradeSelectorItem, PaginatedResult } from '@/types/social';

// ─── Types ───────────────────────────────────────────────────────────────────

type PostResult<T> =
  | { data: T }
  | { error: string; code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'LIMIT_EXCEEDED' | 'DB_ERROR'; resetDate?: Date };

function mapPostRow(row: Record<string, unknown>, isLikedByMe: boolean): FeedPost {
  // The DB function / join can return `author: null` when the referenced profile
  // was deleted or is otherwise missing. Keep the client resilient by always
  // returning safe string fields.
  const rawAuthor = (row.author ?? row.social_profiles ?? {}) as Partial<AuthorRow>;
  return {
    id:             row.id as string,
    author: mapAuthorRow(rawAuthor),
    content:        row.content as string,
    post_type:      (row.post_type as 'text' | 'trade_share') ?? 'text',
    trade_snapshot: (row.trade_snapshot as TradeSnapshot | null) ?? null,
    channel_id:     (row.channel_id as string | null) ?? null,
    like_count:     (row.like_count as number) ?? 0,
    comment_count:  (row.comment_count as number) ?? 0,
    is_hidden:      (row.is_hidden as boolean) ?? false,
    created_at:     row.created_at as string,
    updated_at:     row.updated_at as string,
    is_liked_by_me: isLikedByMe,
  };
}

/** Next Monday 00:00 UTC — used to tell starter users when their limit resets. */
function nextMondayUtc(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 Sun … 6 Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilMonday);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

/** Monday 00:00 UTC of the current week. */
function currentWeekMondayUtc(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysBack = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysBack);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Today 00:00 UTC. */
function todayUtc(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

// ─── Base feed query ──────────────────────────────────────────────────────────

function buildFeedQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter: 'profile' | 'channel',
  opts: {
    profileId?: string;
    channelId?: string;
    cursor?: string;
    limit?: number;
  } = {}
) {
  const { cursor, limit = 20 } = opts;

  let query = supabase
    .from('feed_posts')
    .select(`
      id, author_id, content, post_type, channel_id,
      like_count, comment_count, is_hidden, created_at, updated_at,
      trade_snapshot,
      author:author_id (
        id, user_id, display_name, username, avatar_url, tier, is_public
      )
    `)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (filter === 'profile' && opts.profileId) {
    query = query.eq('author_id', opts.profileId);
  } else if (filter === 'channel' && opts.channelId) {
    query = query.eq('channel_id', opts.channelId);
  }

  if (cursor && isValidCursor(cursor)) query = query.lt('created_at', cursor);

  return query;
}

async function resolveIsLikedByMe(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postIds: string[],
  profileId: string | null
): Promise<Set<string>> {
  if (!profileId || postIds.length === 0) return new Set();
  const { data } = await supabase
    .from('feed_likes')
    .select('post_id')
    .in('post_id', postIds)
    .eq('user_id', profileId);
  return new Set((data ?? []).map((r: { post_id: string }) => r.post_id));
}

// ─── Public Feed ──────────────────────────────────────────────────────────────

export async function getPublicFeed(
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<FeedPost>> {
  const [session, supabase] = await Promise.all([getCachedUserSession(), createClient()]);

  // Single round-trip: posts + author + is_liked_by_me joined in the DB function.
  const { data, error } = await supabase.rpc('get_public_feed', {
    p_cursor:  cursor ?? null,
    p_limit:   limit,
    p_user_id: session.user?.id ?? null,
  });

  if (error) { console.error('[getPublicFeed]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as Record<string, unknown>[];
  const items = rows.slice(0, limit).map((r) => mapPostRow(r, (r.is_liked_by_me as boolean) ?? false));

  return {
    items,
    nextCursor: rows.length > limit ? (rows[limit - 1].created_at as string) : null,
    hasMore: rows.length > limit,
  };
}

// ─── Timeline (following + own) ───────────────────────────────────────────────

export async function getTimeline(
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<FeedPost>> {
  const [session, supabase] = await Promise.all([getCachedUserSession(), createClient()]);
  if (!session.user) return { items: [], nextCursor: null, hasMore: false };

  // Single round-trip: DB function resolves the viewer's profile, JOINs follows,
  // and resolves is_liked_by_me — no IN(500 UUIDs) or serial round-trips.
  const { data, error } = await supabase.rpc('get_timeline', {
    p_user_id: session.user.id,
    p_cursor:  cursor ?? null,
    p_limit:   limit,
  });

  if (error) { console.error('[getTimeline]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as Record<string, unknown>[];
  const items = rows.slice(0, limit).map((r) => mapPostRow(r, (r.is_liked_by_me as boolean) ?? false));
  return {
    items,
    nextCursor: rows.length > limit ? (rows[limit - 1].created_at as string) : null,
    hasMore: rows.length > limit,
  };
}

// ─── Single Post ──────────────────────────────────────────────────────────────

export async function getPost(postId: string): Promise<FeedPost | null> {
  const session = await getCachedUserSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('feed_posts')
    .select(`
      id, author_id, content, post_type, channel_id,
      like_count, comment_count, is_hidden, created_at, updated_at,
      trade_snapshot,
      author:author_id (id, user_id, display_name, username, avatar_url, tier, is_public)
    `)
    .eq('id', postId)
    .eq('is_hidden', false)
    .single();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;

  // Block access to posts by private-profile authors unless the requester is the author
  const author = (row.author ?? {}) as { is_public: boolean; user_id: string };
  if (author && !author.is_public) {
    if (!session.user || author.user_id !== session.user.id) return null;
  }

  // S1: Block access to private-channel posts for non-members
  const channelId = (row.channel_id as string | null) ?? null;
  if (channelId) {
    const { data: channel } = await supabase
      .from('feed_channels')
      .select('is_public')
      .eq('id', channelId)
      .single();

    if (channel && !(channel as { is_public: boolean }).is_public) {
      if (!session.user) return null;
      const viewerProfile = await getCachedSocialProfile(session.user.id);
      if (!viewerProfile) return null;
      // Allow if the viewer is the post author (already a member by definition)
      const { count } = await supabase
        .from('channel_members')
        .select('channel_id', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .eq('user_id', viewerProfile.id);
      if ((count ?? 0) === 0) return null;
    }
  }

  // Use getCachedSocialProfile (request-level memoized) instead of a raw DB query —
  // eliminates one serial round trip.
  let liked = false;
  if (session.user) {
    const profile = await getCachedSocialProfile(session.user.id);
    if (profile) {
      const { count } = await supabase
        .from('feed_likes')
        .select('post_id', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('user_id', profile.id);
      liked = (count ?? 0) > 0;
    }
  }

  return mapPostRow(row, liked);
}

// ─── Posts by profile ─────────────────────────────────────────────────────────

export async function getPostsByProfile(
  profileId: string,
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<FeedPost>> {
  const session = await getCachedUserSession();
  const supabase = await createClient();

  // Privacy guard: only expose posts if target profile is public or viewer is the owner.
  const { data: targetProfile } = await supabase
    .from('social_profiles')
    .select('is_public, user_id')
    .eq('id', profileId)
    .single();
  if (!targetProfile) return { items: [], nextCursor: null, hasMore: false };
  const _tp = targetProfile as { is_public: boolean; user_id: string };
  if (!_tp.is_public && session.user?.id !== _tp.user_id) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  // getCachedSocialProfile uses React cache() — no extra DB round trip if already fetched.
  const ownProfile = session.user ? await getCachedSocialProfile(session.user.id) : null;
  const ownProfileId = ownProfile?.id ?? null;

  const query = buildFeedQuery(supabase, 'profile', { profileId, cursor, limit });
  const { data, error } = await query;
  if (error) { console.error('[getPostsByProfile]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as Record<string, unknown>[];
  const postIds = rows.slice(0, limit).map((r) => r.id as string);
  const likedSet = await resolveIsLikedByMe(supabase, postIds, ownProfileId);

  return {
    items: rows.slice(0, limit).map((r) => mapPostRow(r, likedSet.has(r.id as string))),
    nextCursor: rows.length > limit ? (rows[limit - 1].created_at as string) : null,
    hasMore: rows.length > limit,
  };
}

// ─── Weekly post count ────────────────────────────────────────────────────────

export async function getWeeklyPostCount(knownProfileId?: string): Promise<{ used: number; resetDate: Date }> {
  const session = await getCachedUserSession();
  if (!session.user) return { used: 0, resetDate: nextMondayUtc() };

  const supabase = await createClient();
  // If the caller already has the profile (e.g. createPost), skip the extra lookup.
  let profileId = knownProfileId;
  if (!profileId) {
    const { data: profile } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single();
    if (!profile) return { used: 0, resetDate: nextMondayUtc() };
    profileId = profile.id;
  }
  const monday = currentWeekMondayUtc();
  const { count } = await supabase
    .from('feed_posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', profileId)
    .gte('created_at', monday.toISOString());

  return { used: count ?? 0, resetDate: nextMondayUtc() };
}

// ─── Trades for posting (trade selector) ─────────────────────────────────────

export async function getUserTradesForPosting(startDate?: string, endDate?: string): Promise<TradeSelectorItem[]> {
  const session = await getCachedUserSession();
  if (!session.user) return [];

  const supabase = await createClient();
  const uid = session.user!.id;

  const FIELDS = 'id, market, direction, trade_outcome, risk_reward_ratio, risk_per_trade, calculated_profit, trade_date, trade_screens, trade_screen_timeframes';

  const buildQuery = (table: 'live_trades' | 'demo_trades' | 'backtesting_trades') => {
    let q = supabase.from(table).select(FIELDS).eq('user_id', uid).eq('executed', true).order('trade_date', { ascending: false });
    if (startDate) q = q.gte('trade_date', startDate);
    if (endDate) q = q.lte('trade_date', endDate);
    return q.limit(100);
  };

  const [live, demo, bt] = await Promise.all([
    buildQuery('live_trades'),
    buildQuery('demo_trades'),
    buildQuery('backtesting_trades'),
  ]);

  type RawTrade = {
    id: string; market: string; direction: string; trade_outcome: string;
    risk_reward_ratio: number | null; risk_per_trade: number | null;
    calculated_profit: number | null; trade_date: string | null;
    trade_screens: string[] | null; trade_screen_timeframes: string[] | null;
  };

  const mapTrade = (mode: 'live' | 'demo' | 'backtesting') => (t: RawTrade): TradeSelectorItem => {
    const screens = (t.trade_screens ?? [])
      .map((url: string, i: number) => ({ url, tf: t.trade_screen_timeframes?.[i] }))
      .filter((s) => !!s.url);

    const outcomeRaw = (t.trade_outcome ?? '').toLowerCase();
    const outcome =
      outcomeRaw.includes('win') ? 'win' :
      outcomeRaw.includes('loss') ? 'loss' : 'be';

    return {
      id: t.id,
      market: t.market,
      direction: t.direction.toLowerCase(),
      outcome,
      rr: Number(t.risk_reward_ratio ?? 0),
      riskPct: Number(t.risk_per_trade ?? 0),
      pnl: Number(t.calculated_profit ?? 0),
      currency: 'USD', // resolved from account_settings in a richer flow
      entryDate: t.trade_date ?? new Date().toISOString().slice(0, 10),
      mode,
      screens: screens.length > 0 ? screens : undefined,
    };
  };

  const all: TradeSelectorItem[] = [
    ...(live.data  ?? []).map(mapTrade('live')),
    ...(demo.data  ?? []).map(mapTrade('demo')),
    ...(bt.data    ?? []).map(mapTrade('backtesting')),
  ];

  // Sort by entry date desc, keep top 50
  all.sort((a, b) => (b.entryDate > a.entryDate ? 1 : -1));
  return all.slice(0, 50);
}

// ─── Create Post ──────────────────────────────────────────────────────────────

export async function createPost(input: {
  content: string;
  tradeId?: string;
  tradeMode?: 'live' | 'demo' | 'backtesting';
  channelId?: string;
}): Promise<PostResult<FeedPost>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Social profile not found', code: 'NOT_FOUND' };
  if (profile.is_banned) return { error: 'Account is banned', code: 'UNAUTHORIZED' };

  const subscription = await getCachedSubscription(session.user!.id);
  const def = subscription.definition;
  const limits = def.limits;
  const features = def.features;
  const supabase = await createClient();

  if (input.channelId) {
    if (await isPublicChannelReadOnlyForProfile(profile.id, input.channelId)) {
      return {
        error: 'You were removed from this channel by the owner. You cannot post here until they add you back.',
        code: 'UNAUTHORIZED',
      };
    }

    const { count } = await supabase
      .from('channel_members')
      .select('channel_id', { count: 'exact', head: true })
      .eq('channel_id', input.channelId)
      .eq('user_id', profile.id);
    if ((count ?? 0) === 0) {
      return { error: 'You must be a member of this channel to post.', code: 'UNAUTHORIZED' };
    }
  }

  // ── Content length check
  if (input.content.length > limits.maxPostContentLength) {
    return { error: `Post exceeds ${limits.maxPostContentLength} characters`, code: 'LIMIT_EXCEEDED' };
  }
  if (input.content.trim().length === 0) {
    return { error: 'Post content cannot be empty', code: 'LIMIT_EXCEEDED' };
  }

  // ── Advisory lock: prevents concurrent requests from the same user bypassing
  //    the rate-limit check (see apply-fixes.sql for acquire_post_lock function).
  //    Returns false if another request from this profile is mid-flight.
  const { data: lockAcquired } = await supabase.rpc('acquire_post_lock', {
    p_profile_id: profile.id,
  });
  if (!lockAcquired) {
    return { error: 'Another post is being submitted. Please wait.', code: 'LIMIT_EXCEEDED' };
  }

  // ── Posting rate limits
  if (limits.maxPostsPerWeek !== null) {
    const { used, resetDate } = await getWeeklyPostCount(profile.id);
    if (used >= limits.maxPostsPerWeek) {
      return {
        error: `Weekly post limit reached (${limits.maxPostsPerWeek}/week). Resets ${resetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.`,
        code: 'LIMIT_EXCEEDED',
        resetDate,
      };
    }
  } else if (limits.maxPostsPerDay !== null) {
    const today = todayUtc();
    const { count } = await supabase
      .from('feed_posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .gte('created_at', today.toISOString());

    if ((count ?? 0) >= limits.maxPostsPerDay) {
      return { error: `Daily post limit reached (${limits.maxPostsPerDay}/day).`, code: 'LIMIT_EXCEEDED' };
    }
  }

  // ── Trade attachment (PRO only)
  let tradeSnapshot: TradeSnapshot | null = null;
  let postType: 'text' | 'trade_share' = 'text';

  if (input.tradeId && input.tradeMode) {
    if (!features.socialFeedTradeAttach) {
      return { error: 'Trade attachment requires PRO', code: 'UNAUTHORIZED' };
    }

    const table = `${input.tradeMode}_trades` as 'live_trades' | 'demo_trades' | 'backtesting_trades';
    const { data: trade } = await supabase
      .from(table)
      .select('id, market, direction, trade_outcome, risk_reward_ratio, risk_per_trade, calculated_profit, trade_date, trade_screens, trade_screen_timeframes')
      .eq('id', input.tradeId)
      .eq('user_id', session.user!.id)
      .single();

    if (!trade) return { error: 'Trade not found or does not belong to you', code: 'UNAUTHORIZED' };

    const t = trade as {
      id: string; market: string; direction: string; trade_outcome: string;
      risk_reward_ratio: number | null; risk_per_trade: number | null;
      calculated_profit: number | null; trade_date: string | null;
      trade_screens: string[] | null; trade_screen_timeframes: string[] | null;
    };

    const outcomeRaw = (t.trade_outcome ?? '').toLowerCase();
    const outcome = outcomeRaw.includes('win') ? 'win' : outcomeRaw.includes('loss') ? 'loss' : 'be';

    const screens = (t.trade_screens ?? [])
      .map((url: string, i: number) => ({ url, tf: t.trade_screen_timeframes?.[i] }))
      .filter((s: { url: string }) => !!s.url);

    tradeSnapshot = {
      id:        t.id,
      market:    t.market,
      direction: t.direction.toLowerCase() as 'long' | 'short',
      outcome,
      rr:        Number(t.risk_reward_ratio ?? 0),
      riskPct:   Number(t.risk_per_trade ?? 0),
      pnl:       Number(t.calculated_profit ?? 0),
      currency:  'USD',
      entryDate: t.trade_date ?? new Date().toISOString().slice(0, 10),
      mode:      input.tradeMode,
      screens:   screens.length > 0 ? screens : undefined,
    };
    postType = 'trade_share';
  }

  const { data: created, error } = await supabase
    .from('feed_posts')
    .insert({
      author_id:      profile.id,
      content:        input.content,
      post_type:      postType,
      trade_id:       input.tradeId ?? null,
      trade_mode:     input.tradeMode ?? null,
      trade_snapshot: tradeSnapshot,
      channel_id:     input.channelId ?? null,
    })
    .select(`*, author:author_id (id, user_id, display_name, username, avatar_url, tier, is_public)`)
    .single();

  if (error || !created) {
    console.error('[createPost] error:', error);
    return { error: 'Failed to create post', code: 'DB_ERROR' };
  }

  checkPostMilestones(profile.id).catch((e) => console.error('[createPost] milestone:', e));

  return { data: mapPostRow(created as Record<string, unknown>, false) };
}

// ─── Update Post (PRO only) ───────────────────────────────────────────────────

export async function updatePost(
  postId: string,
  content: string
): Promise<PostResult<FeedPost>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };
  if (profile.is_banned) return { error: 'Account is banned', code: 'UNAUTHORIZED' };

  const subscription = await getCachedSubscription(session.user!.id);
  if (!subscription.definition.features.socialFeedEditPosts) {
    return { error: 'Editing posts requires PRO', code: 'UNAUTHORIZED' };
  }

  const maxLen = subscription.definition.limits.maxPostContentLength;
  if (content.length > maxLen) return { error: `Exceeds ${maxLen} characters`, code: 'LIMIT_EXCEEDED' };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from('feed_posts')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('author_id', profile.id)
    .select(`*, author:author_id (id, user_id, display_name, username, avatar_url, tier, is_public)`)
    .single();

  if (error || !updated) {
    console.error('[updatePost] error:', error);
    return { error: 'Failed to update post', code: 'DB_ERROR' };
  }

  return { data: mapPostRow(updated as Record<string, unknown>, false) };
}

// ─── Delete Post ──────────────────────────────────────────────────────────────

export async function deletePost(postId: string): Promise<PostResult<{ id: string }>> {
  const session = await getCachedUserSession();
  if (!session.user) return { error: 'Not authenticated', code: 'UNAUTHORIZED' };

  const profile = await getCachedSocialProfile(session.user!.id);
  if (!profile) return { error: 'Profile not found', code: 'NOT_FOUND' };
  if (profile.is_banned) return { error: 'Account is banned', code: 'UNAUTHORIZED' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('feed_posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', profile.id);

  if (error) {
    console.error('[deletePost] error:', error);
    return { error: 'Failed to delete post', code: 'DB_ERROR' };
  }

  return { data: { id: postId } };
}

// ─── Channel Feed ──────────────────────────────────────────────────────────────

export async function getChannelFeed(
  channelId: string,
  cursor?: string,
  limit = 20
): Promise<PaginatedResult<FeedPost>> {
  const [session, supabase] = await Promise.all([getCachedUserSession(), createClient()]);

  // Single round-trip: same pattern as get_public_feed, filtered to one channel.
  const { data, error } = await supabase.rpc('get_channel_feed', {
    p_channel_id: channelId,
    p_cursor:     cursor ?? null,
    p_limit:      limit,
    p_user_id:    session.user?.id ?? null,
  });

  if (error) { console.error('[getChannelFeed]', error); return { items: [], nextCursor: null, hasMore: false }; }

  const rows = (data ?? []) as Record<string, unknown>[];
  return {
    items: rows.slice(0, limit).map((r) => mapPostRow(r, (r.is_liked_by_me as boolean) ?? false)),
    nextCursor: rows.length > limit ? (rows[limit - 1].created_at as string) : null,
    hasMore: rows.length > limit,
  };
}
