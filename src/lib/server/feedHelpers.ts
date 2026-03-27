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
