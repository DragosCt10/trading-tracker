import type { ExtraCardKey } from '@/constants/extraCards';
import type { CustomStatConfig } from '@/types/customStats';
import type { SavedTag } from '@/types/saved-tag';

/** Favourite/pinned combobox items per kind. Max 10 per kind. */
export type SavedFavouritesKind =
  | 'setup'
  | 'liquidity'
  | 'market'
  | 'news'
  | 'tags'
  | 'displacement'
  | 'sl_size'
  | 'risk_per_trade'
  | 'rr_ratio';
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
  /** Numeric saved pools for the four NewTradeModal numeric comboboxes. Stored as strings to keep the merge/edit logic identical to the text-based pools. */
  saved_displacement_sizes: string[];
  saved_sl_sizes: string[];
  saved_risk_per_trades: string[];
  saved_rr_ratios: string[];
  /** Pinned items for combobox suggestions (setup, liquidity, market, news, numeric pools). */
  saved_favourites?: SavedFavourites | null;
  /** User-defined custom stat filter combinations. */
  saved_custom_stats?: CustomStatConfig[] | null;
  /** Strategy-level tag vocabulary with optional colors (lowercase, trimmed). */
  saved_tags: SavedTag[];
}
