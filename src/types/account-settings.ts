import { AVAILABLE_CURRENCIES, TRADING_MODES } from '@/constants/accountSettings';

export { AVAILABLE_CURRENCIES, TRADING_MODES };

export type Currency = typeof AVAILABLE_CURRENCIES[number] | string; // support custom/unknown future currencies
export type TradingMode = typeof TRADING_MODES[number] | string; // string fallback for DB/new/unlisted values

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
}
