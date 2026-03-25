import type { TierId } from '@/types/subscription';

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
};

export function mapAuthorRow(raw: Partial<AuthorRow>): {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  tier: TierId;
  is_public: boolean;
} {
  return {
    id:           typeof raw.id === 'string' && raw.id ? raw.id : 'unknown_author',
    user_id:      typeof raw.user_id === 'string' && raw.user_id ? raw.user_id : 'unknown_user',
    display_name: typeof raw.display_name === 'string' && raw.display_name ? raw.display_name : 'Unknown trader',
    username:     typeof raw.username === 'string' && raw.username ? raw.username : 'unknown',
    avatar_url:   typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
    tier:         (raw.tier as TierId) ?? 'starter',
    is_public:    typeof raw.is_public === 'boolean' ? raw.is_public : true,
  };
}
