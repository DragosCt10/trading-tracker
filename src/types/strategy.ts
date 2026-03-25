import type { ExtraCardKey } from '@/constants/extraCards';
import type { CustomStatConfig } from '@/types/customStats';

/** Favourite/pinned combobox items per kind. Max 10 per kind. */
export type SavedFavouritesKind = 'setup' | 'liquidity' | 'market' | 'news' | 'tags';
export type SavedFavourites = Partial<Record<SavedFavouritesKind, string[]>>;

export interface Strategy {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  extra_cards: ExtraCardKey[];
  saved_setup_types: string[];
  saved_liquidity_types: string[];
  /** Pinned items for combobox suggestions (setup, liquidity, market, news). */
  saved_favourites?: SavedFavourites | null;
  /** User-defined custom stat filter combinations. */
  saved_custom_stats?: CustomStatConfig[] | null;
  /** Strategy-level tag vocabulary (lowercase, trimmed). */
  saved_tags: string[];
}
