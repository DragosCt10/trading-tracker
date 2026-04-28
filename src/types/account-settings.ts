import { ACCOUNT_TYPES, AVAILABLE_CURRENCIES, TRADING_MODES } from '@/constants/accountSettings';

export { ACCOUNT_TYPES, AVAILABLE_CURRENCIES, TRADING_MODES };

export type Currency = typeof AVAILABLE_CURRENCIES[number] | string; // support custom/unknown future currencies
export type TradingMode = typeof TRADING_MODES[number] | string; // string fallback for DB/new/unlisted values
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface CustomFuturesSpec {
  /** Symbol, normalized to upper-case, e.g. "MES" */
  symbol: string;
  /** Optional display label, e.g. "Micro E-mini S&P 500" */
  label?: string;
  /** Dollar amount per 1 unit of sl_size (e.g. ES = 50 means $50 per point) */
  dollarPerSlUnit: number;
  /** Human-readable unit description, e.g. "point", "tick (1/32)", "cent", "pip" */
  slUnitLabel: string;
  /** ISO timestamp of when this entry was first saved */
  createdAt: string;
}

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
  /** Asset class flag: 'standard' (forex/stocks/crypto via risk %) or 'futures' (contracts × multiplier). Defaults to 'standard'. */
  account_type?: AccountType;
  /** Per-account news event library for autocomplete */
  saved_news?: SavedNewsItem[];
}
