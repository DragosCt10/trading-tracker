import { isSafeUrl } from '@/utils/isSafeUrl';

const MAX_NOTES_LENGTH = 5000;
const MAX_TEXT_FIELD_LENGTH = 100;
const MAX_URL_LENGTH = 2048;

const TRADE_TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/** Validates trade text field lengths and URL protocols. Returns error message or null. */
export function validateTradeFields(trade: Record<string, unknown>): string | null {
  if (typeof trade.notes === 'string' && trade.notes.length > MAX_NOTES_LENGTH) {
    return `Notes must be ${MAX_NOTES_LENGTH} characters or fewer`;
  }
  for (const field of ['setup_type', 'liquidity', 'news_name'] as const) {
    if (typeof trade[field] === 'string' && (trade[field] as string).length > MAX_TEXT_FIELD_LENGTH) {
      return `${field} must be ${MAX_TEXT_FIELD_LENGTH} characters or fewer`;
    }
  }
  if (typeof trade.trade_time === 'string' && trade.trade_time !== '' && !TRADE_TIME_FORMAT.test(trade.trade_time)) {
    return 'trade_time must be HH:MM format (00:00–23:59).';
  }
  if (Array.isArray(trade.trade_screens)) {
    for (const url of trade.trade_screens) {
      if (typeof url === 'string' && url !== '') {
        if (url.length > MAX_URL_LENGTH) {
          return `Trade screen URL must be ${MAX_URL_LENGTH} characters or fewer`;
        }
        if (!isSafeUrl(url)) {
          return 'Trade screen URLs must use http:// or https://';
        }
      }
    }
  }
  return null;
}
