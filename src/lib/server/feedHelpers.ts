import type { TierId } from '@/types/subscription';

// ─── Cursor validation ────────────────────────────────────────────────────────
/** Returns true only for valid ISO-8601 date strings (cursor format). */
export function isValidCursor(cursor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(cursor) && !isNaN(Date.parse(cursor));
}

// ─── Shared author select fields ─────────────────────────────────────────────
// Single source of truth for the PostgREST join on social_profiles (author).
// Used across feedPosts, feedSearch, feedInteractions, feedModeration, feedChannels.

/** PostgREST select fragment for author join: `author:author_id (...)` */
export const AUTHOR_SELECT_FIELDS = 'id, user_id, display_name, username, avatar_url, tier, is_public, trade_badge';

/** PostgREST select fragment for channel member profile join: `profile:social_profiles!...(...)` */
export const PROFILE_SELECT_FIELDS = 'id, display_name, username, avatar_url, tier, is_public, trade_badge';

// ─── Shared author mapping ────────────────────────────────────────────────────
// Used by feedPosts.ts and feedInteractions.ts to avoid duplicating this logic.

export type AuthorRow = {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  tier: TierId;
  is_public: boolean;
  trade_badge: string | null;
};

export function mapAuthorRow(raw: Partial<AuthorRow>): {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  tier: TierId;
  is_public: boolean;
  trade_badge: string | null;
} {
  return {
    id:           typeof raw.id === 'string' && raw.id ? raw.id : 'unknown_author',
    user_id:      typeof raw.user_id === 'string' && raw.user_id ? raw.user_id : 'unknown_user',
    display_name: typeof raw.display_name === 'string' && raw.display_name ? raw.display_name : 'Unknown trader',
    username:     typeof raw.username === 'string' && raw.username ? raw.username : 'unknown',
    avatar_url:   typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
    tier:         (raw.tier as TierId) ?? 'starter',
    is_public:    typeof raw.is_public === 'boolean' ? raw.is_public : true,
    trade_badge:  typeof raw.trade_badge === 'string' ? raw.trade_badge : null,
  };
}

// ─── Date utilities ───────────────────────────────────────────────────────────
// Used by feedPosts.ts for rate-limit windows. Exported for unit testing.

/** Next Monday 00:00 UTC — when the weekly post limit resets for starter users. */
export function nextMondayUtc(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 Sun … 6 Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilMonday);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

/** Monday 00:00 UTC of the current ISO week. */
export function currentWeekMondayUtc(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysBack = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysBack);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Today 00:00 UTC — used as the daily rate-limit window start. */
export function todayUtc(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

// ─── Trade outcome ────────────────────────────────────────────────────────────

/**
 * Normalizes a raw trade_outcome string to one of the three canonical values.
 * Matches the DB enum semantics: anything containing 'win' → 'win',
 * anything containing 'loss' → 'loss', everything else → 'be' (break-even).
 */
export function normalizeTradeOutcome(raw: string): 'win' | 'loss' | 'be' {
  const lower = (raw ?? '').toLowerCase();
  if (lower.includes('win')) return 'win';
  if (lower.includes('loss')) return 'loss';
  return 'be';
}

// ─── Invite token ─────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true only for well-formed UUID v4 tokens (case-insensitive). */
export function isValidInviteToken(token: string): boolean {
  return UUID_RE.test(token);
}

/** Returns true if the invite has passed its expiry date. */
export function isInviteExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/** Returns true if the invite has hit or exceeded its max-use cap. */
export function isInviteAtMaxUses(useCount: number, maxUses: number | null): boolean {
  if (maxUses === null) return false;
  return useCount >= maxUses;
}

// ─── Post content validation ──────────────────────────────────────────────────

/**
 * Pure post-content validator. Returns `{ valid: true }` or `{ valid: false, reason }`.
 * Mirrors the checks inside `createPost` and `updatePost`.
 */
export function validatePostContent(
  content: string,
  maxLen: number,
): { valid: true } | { valid: false; reason: string } {
  if (content.trim().length === 0) return { valid: false, reason: 'Post content cannot be empty' };
  if (content.length > maxLen) return { valid: false, reason: `Post exceeds ${maxLen} characters` };
  return { valid: true };
}
