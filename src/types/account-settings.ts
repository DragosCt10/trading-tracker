import { AVAILABLE_CURRENCIES, TRADING_MODES } from '@/constants/accountSettings';

export { AVAILABLE_CURRENCIES, TRADING_MODES };

export type Currency = typeof AVAILABLE_CURRENCIES[number] | string; // support custom/unknown future currencies
export type TradingMode = typeof TRADING_MODES[number] | string; // string fallback for DB/new/unlisted values

export interface SavedNewsItem {
  /** Stable UUID assigned at first save */
  id: string;
  /** Canonical (first/normalised) name for this news event */
  name: string;
  /** Impact rating: 1 = Low, 2 = Medium, 3 = High */
  intensity: number;
  /** Alternative spellings / names fuzzily merged into this entry */
  aliases?: string[];
}

export interface AccountSettings {
  id: string;                         // uuid
  user_id: string;                    // uuid
  account_balance: number;            // numeric(15, 2)
  currency: Currency;                 // string, max 10 chars
  created_at: string;                 // ISO timestamp string
  updated_at: string;                 // ISO timestamp string
  name: string;                       // max 255 chars
  mode: TradingMode;                  // max 50 chars
  is_active: boolean;
  description: string | null;
  /** Per-account news event library for autocomplete */
  saved_news?: SavedNewsItem[];
}
