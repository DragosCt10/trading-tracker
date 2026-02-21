/**
 * Market format validation: only letters, numbers, and optionally one slash for pairs.
 * Allowed: EURUSD, EUR/USD, DE30EU. No dots, spaces, or other special characters.
 */
const MARKET_FORMAT_REGEX = /^[A-Z0-9]+(\/[A-Z0-9]+)?$/;
const MIN_LENGTH = 2;
const MAX_LENGTH = 10;

export function normalizeMarket(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidMarket(value: string): boolean {
  const normalized = normalizeMarket(value);
  if (normalized.length < MIN_LENGTH || normalized.length > MAX_LENGTH) return false;
  return MARKET_FORMAT_REGEX.test(normalized);
}

export function getMarketValidationError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Market is required.';
  const normalized = normalizeMarket(value);
  if (normalized.length < MIN_LENGTH) return 'Market must be at least 2 characters.';
  if (normalized.length > MAX_LENGTH) return 'Market must be at most 10 characters.';
  if (!MARKET_FORMAT_REGEX.test(normalized)) {
    return 'Use only letters and numbers, or a pair with one slash (e.g. EURUSD, EUR/USD, DE30EU). No spaces, dots or other special characters.';
  }
  return null;
}
