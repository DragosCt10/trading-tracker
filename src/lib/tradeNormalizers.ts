/**
 * Deterministic trade value normalizers.
 *
 * These functions complement `tradeImportParser.ts` by providing rule-based
 * normalization that works without an AI API call.
 *
 * Primary export: `buildAutoNormalizations(fieldMapping, columnSamples)`
 * → produces an `AiNormalizations` object you can pass directly to
 *   `parseCsvTradesWithNorm()` as a zero-cost alternative to the OpenAI route.
 */

import type { AiNormalizations } from '@/utils/tradeImportParser';

// ─── Market / symbol ──────────────────────────────────────────────────────────

/**
 * Common commodity / index aliases that MT5 may label differently.
 * Key = lowercase stripped form; value = canonical symbol.
 */
const MARKET_ALIASES: Record<string, string> = {
  // Metals
  gold: 'XAUUSD',
  xauusd: 'XAUUSD',
  silver: 'XAGUSD',
  xagusd: 'XAGUSD',
  // Energy
  oil: 'USOIL',
  usoil: 'USOIL',
  crude: 'USOIL',
  crudeoil: 'USOIL',
  brent: 'UKOIL',
  ukoil: 'UKOIL',
  // Crypto
  bitcoin: 'BTCUSD',
  btc: 'BTCUSD',
  btcusd: 'BTCUSD',
  ethereum: 'ETHUSD',
  eth: 'ETHUSD',
  ethusd: 'ETHUSD',
  // US indices
  us30: 'US30',
  dj30: 'US30',
  dow: 'US30',
  dowjones: 'US30',
  djia: 'US30',
  nas100: 'NAS100',
  nasdaq: 'NAS100',
  ndx: 'NAS100',
  spx500: 'SPX500',
  sp500: 'SPX500',
  spx: 'SPX500',
  us500: 'SPX500',
  // EU indices
  ger30: 'GER30',
  ger40: 'GER40',
  dax: 'GER40',
  // UK indices
  uk100: 'UK100',
  ftse: 'UK100',
  ftse100: 'UK100',
};

/**
 * Normalize a raw market/symbol string:
 * 1. Strip emoji (flag characters included)
 * 2. Remove slashes, spaces, dashes, and other non-alphanumeric chars
 * 3. Uppercase
 * 4. Apply alias lookup (e.g. "Gold" → "XAUUSD")
 *
 * Examples:
 *   "EUR/USD"       → "EURUSD"
 *   "GBP/USD 🇬🇧"  → "GBPUSD"
 *   "Gold"          → "XAUUSD"
 *   "NAS100"        → "NAS100"
 */
export function normalizeMarket(raw: string): string {
  const cleaned = raw
    // Strip surrogate pairs (emoji, flag emojis, supplemental symbols)
    .replace(/[\uD800-\uDFFF]/g, '')
    // Strip BMP symbol/emoji blocks (U+2600–U+27BF)
    .replace(/[\u2600-\u27BF]/g, '')
    // Remove everything that isn't a letter or digit
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .trim();

  const alias = MARKET_ALIASES[cleaned.toLowerCase()];
  return alias ?? cleaned;
}

// ─── Direction ────────────────────────────────────────────────────────────────

const DIRECTION_LONG = new Set([
  'buy', 'b', 'long', 'l', 'bull', 'bullish', 'call', 'up',
  'buy limit', 'buy stop', 'buylimit', 'buystop',
]);
const DIRECTION_SHORT = new Set([
  'sell', 's', 'short', 'bear', 'bearish', 'put', 'down',
  'sell limit', 'sell stop', 'selllimit', 'sellstop',
]);

/**
 * Normalize a direction value.
 * Returns `'Long'` | `'Short'` | `null` (unrecognised).
 *
 * Handles: BUY / SELL, B / S, Long / Short, Buy Limit, etc.
 */
export function normalizeDirection(raw: string): 'Long' | 'Short' | null {
  const key = raw.trim().toLowerCase();
  if (DIRECTION_LONG.has(key)) return 'Long';
  if (DIRECTION_SHORT.has(key)) return 'Short';
  return null;
}

// ─── Trade outcome ────────────────────────────────────────────────────────────

const OUTCOME_WIN = new Set([
  'win', 'w', 'won', 'profit', 'tp', 'take profit', 'takeprofit',
  'green', '1', '✓', 'yes', 'y', 'winner', 'profitable', '+',
]);
const OUTCOME_LOSE = new Set([
  'lose', 'loss', 'l', 'lost', 'sl', 'stop loss', 'stoploss',
  'red', '0', '✗', 'no', 'n', 'loser', '-', 'stopped',
]);
const OUTCOME_BE = new Set([
  'be', 'b/e', 'break even', 'breakeven', 'break-even', 'be hit',
]);

/**
 * Normalize a trade outcome value.
 * Returns `'Win'` | `'Lose'` | `'BE'` | `null` (unrecognised).
 */
export function normalizeOutcome(raw: string): 'Win' | 'Lose' | 'BE' | null {
  const key = raw.trim().toLowerCase();
  if (OUTCOME_WIN.has(key)) return 'Win';
  if (OUTCOME_LOSE.has(key)) return 'Lose';
  if (OUTCOME_BE.has(key)) return 'BE';
  return null;
}

// ─── Boolean ──────────────────────────────────────────────────────────────────

const BOOL_TRUE = new Set([
  'yes', 'y', 'true', '1', 'x', '✓', 'checked', 'on',
  // Multilingual: French, Spanish, German, Portuguese, Russian, Romanian
  'oui', 'sí', 'si', 'ja', 'да', 'da', 'sim',
]);
const BOOL_FALSE = new Set([
  'no', 'n', 'false', '0', '✗', 'unchecked', 'off',
  'non', 'nein', 'нет', 'niet', 'não', 'nao',
]);

/**
 * Normalize a boolean-ish CSV string.
 * Returns `true` / `false` (defaults to false for empty / unrecognised).
 */
export function normalizeBoolean(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (!v) return false;
  if (BOOL_TRUE.has(v)) return true;
  if (BOOL_FALSE.has(v)) return false;
  // Fallback: treat any truthy-looking value as true
  return /^(yes|true|1|x|✓)$/.test(v);
}

// ─── Auto-build AiNormalizations ─────────────────────────────────────────────

const BOOLEAN_DB_FIELDS = new Set([
  'break_even', 'reentry', 'news_related', 'local_high_low',
  'partials_taken', 'executed', 'launch_hour',
]);

/**
 * Build an `AiNormalizations` object from column samples using deterministic rules.
 * Pass this directly to `parseCsvTradesWithNorm()` to skip the AI API call.
 *
 * Coverage:
 * - `market`       → `normalizeMarket()`
 * - `direction`    → `normalizeDirection()`
 * - `trade_outcome`→ `normalizeOutcome()`
 * - boolean fields → `normalizeBoolean()`
 *
 * @param fieldMapping    CSV header → DB field key (from `toFieldMapping()`)
 * @param columnSamples   CSV header → array of unique raw sample values
 */
export function buildAutoNormalizations(
  fieldMapping: Record<string, string>,
  columnSamples: Record<string, string[]>,
): AiNormalizations {
  const result: AiNormalizations = {};

  for (const [csvHeader, dbField] of Object.entries(fieldMapping)) {
    const samples = columnSamples[csvHeader] ?? [];

    if (dbField === 'market') {
      result.market = {};
      for (const raw of samples) {
        const normalized = normalizeMarket(raw);
        // Only include in map when there's an actual transformation
        if (normalized && normalized !== raw) {
          result.market[raw] = normalized;
        }
      }
      if (Object.keys(result.market).length === 0) delete result.market;
      continue;
    }

    if (dbField === 'direction') {
      result.direction = {};
      for (const raw of samples) {
        const normalized = normalizeDirection(raw);
        if (normalized) result.direction[raw] = normalized;
      }
      if (Object.keys(result.direction).length === 0) delete result.direction;
      continue;
    }

    if (dbField === 'trade_outcome') {
      result.trade_outcome = {};
      for (const raw of samples) {
        const normalized = normalizeOutcome(raw);
        if (normalized) result.trade_outcome[raw] = normalized;
      }
      if (Object.keys(result.trade_outcome).length === 0) delete result.trade_outcome;
      continue;
    }

    if (BOOLEAN_DB_FIELDS.has(dbField)) {
      if (!result.booleans) result.booleans = {};
      result.booleans[dbField] = {};
      for (const raw of samples) {
        result.booleans[dbField][raw] = normalizeBoolean(raw);
      }
    }
  }

  return result;
}

/**
 * Convenience: strip emojis from any string (useful for quick header cleaning).
 */
export function stripEmojis(s: string): string {
  return s
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .trim();
}
