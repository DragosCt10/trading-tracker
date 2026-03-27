import type { TierId } from './subscription';

export type PostType = 'text' | 'trade_share';
export type NotificationType = 'like' | 'comment' | 'follow' | 'account_ban' | 'account_unban' | 'channel_added' | 'channel_removed' | 'private_channel_added' | 'private_channel_removed' | 'pro_3mo_discount' | 'trade_milestone_10' | 'post_milestone';
export type ChannelMemberRole = 'owner' | 'moderator' | 'member';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

// ─── TradeSnapshot ──────────────────────────────────────────────────────────
// Strict type snapshotted at post time. Feed never joins trade tables.

export interface TradeSnapshot {
  id: string;
  market: string;
  direction: 'long' | 'short';
  outcome: 'win' | 'loss' | 'be';
  rr: number;
  riskPct: number;
  pnl: number;
  currency: string;
  entryDate: string;
  mode: 'live' | 'demo' | 'backtesting';
  /** Chart screenshots with optional timeframe label. Snapshotted at post time. */
  screens?: { url: string; tf?: string }[];
}

// ─── SocialProfile ──────────────────────────────────────────────────────────

export interface SocialProfile {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
  is_banned: boolean;
  follower_count: number;
  following_count: number;
  /** Denormalized from subscriptions. */
  tier: TierId;
  created_at: string;
  updated_at: string;
}

// ─── FeedPost ───────────────────────────────────────────────────────────────

export interface FeedPost {
  id: string;
  author: Pick<SocialProfile, 'id' | 'user_id' | 'display_name' | 'username' | 'avatar_url' | 'tier' | 'is_public'>;
  content: string;
  post_type: PostType;
  trade_snapshot: TradeSnapshot | null;
  channel_id: string | null;
  like_count: number;
  comment_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  /** Computed via LEFT JOIN on feed_likes for the current user — not a DB column. */
  is_liked_by_me: boolean;
}

// ─── FeedComment ────────────────────────────────────────────────────────────

export interface FeedComment {
  id: string;
  post_id: string;
  author: Pick<SocialProfile, 'id' | 'user_id' | 'display_name' | 'username' | 'avatar_url' | 'tier' | 'is_public'>;
  content: string;
  parent_id: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  /** Denormalized count of direct replies. Populated by getComments, not stored in DB. */
  reply_count?: number;
  replies?: FeedComment[];
}

// ─── FeedNotification ───────────────────────────────────────────────────────

export interface FeedNotification {
  id: string;
  recipient_id: string;
  actor: Pick<SocialProfile, 'id' | 'display_name' | 'username' | 'avatar_url'>;
  type: NotificationType;
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── FeedChannel ────────────────────────────────────────────────────────────

export interface FeedChannel {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

// ─── ChannelMember ──────────────────────────────────────────────────────────

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  role: ChannelMemberRole;
  joined_at: string;
  profile?: Pick<SocialProfile, 'id' | 'display_name' | 'username' | 'avatar_url' | 'tier' | 'is_public'>;
}

// ─── ChannelInvite ───────────────────────────────────────────────────────────

export interface ChannelInvite {
  id: string;
  channel_id: string;
  created_by: string;
  token: string;
  label: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Paginated result helper ─────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─── Trade selector (for AttachTradeModal) ───────────────────────────────────

export interface TradeSelectorItem {
  id: string;
  market: string;
  direction: string;
  outcome: string;
  rr: number;
  riskPct: number;
  pnl: number;
  currency: string;
  entryDate: string;
  mode: 'live' | 'demo' | 'backtesting';
  screens?: { url: string; tf?: string }[];
}
