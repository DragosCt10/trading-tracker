/**
 * csvColumnMatcher.ts
 *
 * Value-based CSV column → database field matcher.
 *
 * Analyses sample cell values from each CSV column and scores them against
 * known patterns for each required trade field — with zero AI calls.
 * Designed to run client-side as a fast first pass before falling back to the
 * AI route for low-confidence or missing columns.
 *
 * Usage:
 *   const result = matchCsvColumns(columnSamples);
 *   // or, from raw rows:
 *   const result = matchCsvRows(rows);
 */

import { MARKET_MIN_LENGTH, MARKET_MAX_LENGTH } from '@/constants/tradingDefaults';

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface ColumnMatch {
  field: string;
  confidence: number;
}

export interface ColumnSuggestion {
  csvColumn: string;
  possibleFields: string[];
  reason: string;
}

export interface ColumnMatchResult {
  /** CSV column header → best-matched DB field + confidence score (0–1). */
  matches: Record<string, ColumnMatch>;
  /** CSV columns that could not be confidently mapped to any DB field. */
  unmappedColumns: string[];
  /** Required DB fields that have no matched CSV column. */
  missingRequired: string[];
  /** Edge-case hints (e.g. combined date/time columns). */
  suggestions: ColumnSuggestion[];
}

// ─── Required Fields ──────────────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  'trade_date',
  'trade_time',
  'market',
  'direction',
  'trade_outcome',
  'risk_per_trade',
  'risk_reward_ratio',
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

/**
 * Minimum value-based score for a match to be considered valid.
 * Columns below this for every required field will appear in missingRequired.
 */
const MIN_CONFIDENCE = 0.25;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clean(val: string): string {
  return val.trim().replace(/^["']|["']$/g, '');
}

/**
 * Extract up to `max` non-empty sample values per column from CSV rows.
 */
export function extractColumnSamples(
  rows: Record<string, string>[],
  max = 20,
): Record<string, string[]> {
  const samples: Record<string, string[]> = {};
  for (const row of rows) {
    for (const [col, val] of Object.entries(row)) {
      if (!(col in samples)) samples[col] = [];
      const v = clean(String(val ?? ''));
      if (v && samples[col].length < max) samples[col].push(v);
    }
  }
  return samples;
}

// ─── Pattern Detectors ────────────────────────────────────────────────────────

// — Date ——————————————————————————————————————————————————————————————————————

const DATE_PATTERNS: RegExp[] = [
  /^\d{4}-\d{2}-\d{2}$/,             // YYYY-MM-DD
  /^\d{2}\/\d{2}\/\d{4}$/,           // DD/MM/YYYY or MM/DD/YYYY
  /^\d{2}-\d{2}-\d{4}$/,             // DD-MM-YYYY
  /^\d{2}\.\d{2}\.\d{4}$/,           // DD.MM.YYYY
  /^\d{4}\/\d{2}\/\d{2}$/,           // YYYY/MM/DD
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,    // M/D/YY or M/D/YYYY
  /^\d{1,2}-\d{1,2}-\d{2,4}$/,      // M-D-YY
  /^\d{1,2}\.\d{1,2}\.\d{2,4}$/,    // M.D.YY
  /^\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}$/, // 1 Jan 2025
  /^[A-Za-z]{3,}\s+\d{1,2},?\s+\d{4}$/, // Jan 1, 2025
];

function hasTimeComponent(val: string): boolean {
  // HH:MM anywhere in the string
  return /\d{1,2}:\d{2}/.test(val);
}

function scoreDate(samples: string[]): number {
  const valid = samples.filter((s) => s !== '');
  if (valid.length === 0) return 0;
  const matched = valid.filter((s) => {
    if (hasTimeComponent(s)) return false; // combined datetime → skip pure date scoring
    return DATE_PATTERNS.some((p) => p.test(s));
  });
  return matched.length / valid.length;
}

// — Time ——————————————————————————————————————————————————————————————————————

const TIME_PATTERNS: RegExp[] = [
  /^\d{1,2}:\d{2}$/,                      // HH:MM
  /^\d{1,2}:\d{2}:\d{2}$/,               // HH:MM:SS
  /^\d{1,2}:\d{2}\s*[APap][Mm]$/,        // HH:MM AM/PM
  /^\d{1,2}:\d{2}:\d{2}\s*[APap][Mm]$/, // HH:MM:SS AM/PM
];

function scoreTime(samples: string[]): number {
  const valid = samples.filter((s) => s !== '');
  if (valid.length === 0) return 0;
  const matched = valid.filter((s) => TIME_PATTERNS.some((p) => p.test(s)));
  return matched.length / valid.length;
}

// — Combined datetime (for suggestions only) ——————————————————————————————————

function isCombinedDatetime(samples: string[]): boolean {
  const valid = samples.filter((s) => s !== '');
  if (valid.length === 0) return false;
  // A combined column typically looks like "2025-01-15 09:30:00" or "15/01/2025T09:30"
  const count = valid.filter((s) => {
    const datePartCandidate = s.split(/[\sT]/)[0];
    const hasDate = DATE_PATTERNS.some((p) => p.test(datePartCandidate));
    return hasDate && hasTimeComponent(s);
  }).length;
  return count / valid.length >= 0.5;
}

// — Market/Symbol —————————————————————————————————————————————————————————————

// Standard symbol patterns
const MARKET_PLAIN_RE  = /^[A-Z][A-Z0-9]{1,9}$/;  // EURUSD, NAS100, XAUUSD
const MARKET_SLASH_RE  = /^[A-Z]{2,6}\/[A-Z]{2,4}$/; // EUR/USD
const MARKET_DASH_RE   = /^[A-Z]{2,6}-[A-Z]{2,4}$/;  // EUR-USD

const KNOWN_MARKETS = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF',
  'GBPJPY', 'EURJPY', 'EURGBP', 'EURAUD', 'GBPAUD', 'AUDJPY', 'CADJPY',
  'XAUUSD', 'XAGUSD', 'NAS100', 'NASDAQ', 'US30', 'SPX500', 'SP500',
  'GER30', 'GER40', 'UK100', 'FTSE', 'JP225', 'AU200', 'HK50',
  'BTCUSD', 'ETHUSD', 'CRUDE', 'OIL', 'BRENT', 'GOLD', 'SILVER',
  'DXY', 'VIX', 'USDX',
]);

/** Strip slashes/dashes/spaces and uppercase — produces canonical form. */
export function normalizeMarket(val: string): string {
  // Remove flag emojis (U+1F1E0–U+1F1FF range), then strip separators
  return val
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .toUpperCase()
    .replace(/[\\/\-\s]+/g, '');
}

/** Apply common alias normalizations (Gold → XAUUSD, etc.). */
export function resolveMarketAlias(val: string): string {
  const norm = normalizeMarket(val);
  const aliases: Record<string, string> = {
    GOLD: 'XAUUSD',
    SILVER: 'XAGUSD',
    OIL: 'USOIL',
    CRUDE: 'USOIL',
  };
  return aliases[norm] ?? norm;
}

function scoreMarket(samples: string[]): number {
  const valid = samples.filter((s) => s !== '');
  if (valid.length === 0) return 0;
  let score = 0;
  for (const s of valid) {
    const norm = normalizeMarket(s);
    const upper = s.toUpperCase().trim();
    const len = norm.length;
    if (len < MARKET_MIN_LENGTH || len > MARKET_MAX_LENGTH) continue;
    if (KNOWN_MARKETS.has(norm)) {
      score += 1;
    } else if (
      MARKET_PLAIN_RE.test(upper) ||
      MARKET_SLASH_RE.test(upper) ||
      MARKET_DASH_RE.test(upper)
    ) {
      score += 0.75;
    }
  }
  return score / valid.length;
}

// — Direction —————————————————————————————————————————————————————————————————

const DIRECTION_LONG  = new Set(['long', 'buy', 'l', 'b', 'bto', 'bo', 'long position', 'buy limit', 'buy stop', 'compra']);
const DIRECTION_SHORT = new Set(['short', 'sell', 's', 'st', 'sto', 'so', 'short position', 'sell limit', 'sell stop', 'venta']);

function isDirection(val: string): boolean {
  return DIRECTION_LONG.has(val.toLowerCase().trim()) || DIRECTION_SHORT.has(val.toLowerCase().trim());
}

function scoreDirection(samples: string[]): number {
  const valid = samples.filter((s) => s !== '');
  if (valid.length === 0) return 0;
  // Strong signal: all unique values must be direction values (tight set)
  const unique = new Set(valid.map((s) => s.toLowerCase().trim()));
  if ([...unique].every(isDirection) && unique.size <= 4) return 1;
  const matched = valid.filter(isDirection);
  return matched.length / valid.length;
}

/** Normalise a raw direction CSV value to "Long" | "Short". */
export function normalizeDirection(val: string): 'Long' | 'Short' | null {
  const lower = val.toLowerCase().trim();
  if (DIRECTION_LONG.has(lower))  return 'Long';
  if (DIRECTION_SHORT.has(lower)) return 'Short';
  return null;
}

// — Trade Outcome —————————————————————————————————————————————————————————————

const OUTCOME_WIN  = new Set(['win', 'won', 'w', 'profit', 'tp', 'take profit', 'winner', '✓', 'ganada', 'profitable']);
const OUTCOME_LOSE = new Set(['loss', 'lose', 'l', 'sl', 'stop', 'stop loss', 'loser', 'stopped out', '✗', 'perdida', 'lost']);
const OUTCOME_BE   = new Set(['break-even', 'breakeven', 'be', 'b/e', 'break even', 'scratch', 'empate']);

function isOutcome(val: string): boolean {
  const lower = val.toLowerCase().trim();
  return OUTCOME_WIN.has(lower) || OUTCOME_LOSE.has(lower) || OUTCOME_BE.has(lower);
}

function scoreOutcome(samples: string[]): number {
  const valid = samples.filter((s) => s !== '');
  if (valid.length === 0) return 0;
  const unique = new Set(valid.map((s) => s.toLowerCase().trim()));
  if ([...unique].every(isOutcome) && unique.size <= 5) return 1;
  const matched = valid.filter(isOutcome);
  return matched.length / valid.length;
}

/** Normalise a raw trade outcome CSV value to "Win" | "Lose" | "Break-Even". */
export function normalizeOutcome(val: string): 'Win' | 'Lose' | 'Break-Even' | null {
  const lower = val.toLowerCase().trim();
  if (OUTCOME_WIN.has(lower))  return 'Win';
  if (OUTCOME_LOSE.has(lower)) return 'Lose';
  if (OUTCOME_BE.has(lower))   return 'Break-Even';
  return null;
}

// — Risk Per Trade (%) ————————————————————————————————————————————————————————

function parseNumeric(val: string): number {
  return parseFloat(val.replace(/%/g, '').replace(/,/g, '').trim());
}

function scoreRiskPerTrade(samples: string[]): number {
  const valid = samples.filter((s) => s !== '');
  if (valid.length === 0) return 0;
  let score = 0;
  let hasPercent = false;
  for (const s of valid) {
    if (s.includes(':')) continue; // ratio format → not risk %
    if (s.includes('%')) hasPercent = true;
    const num = parseNumeric(s);
    if (!isNaN(num) && num >= 0.05 && num <= 20) {
      score += num >= 0.25 && num <= 10 ? 1 : 0.5;
    }
  }
  const base = score / valid.length;
  return hasPercent ? Math.min(1, base + 0.2) : base;
}

/**
 * Convert a raw risk value string to a numeric percentage.
 * e.g. "1.5%" → 1.5, "2" → 2
 */
export function parseRiskValue(val: string): number | null {
  const num = parseNumeric(val);
  return isNaN(num) ? null : num;
}

// — Risk / Reward Ratio ———————————————————————————————————————————————————————

/**
 * Parse ratio strings to a single numeric value.
 * "1:3" → 3.0  |  "2:1" → 0.5  |  "2.5" → 2.5
 */
export function parseRatioValue(val: string): number | null {
  const s = val.trim();
  const colon = s.indexOf(':');
  if (colon !== -1) {
    const left  = parseFloat(s.slice(0, colon));
    const right = parseFloat(s.slice(colon + 1));
    if (!isNaN(left) && !isNaN(right) && left !== 0) return right / left;
    return null;
  }
  const num = parseNumeric(s);
  return isNaN(num) ? null : num;
}

function scoreRiskRewardRatio(samples: string[]): number {
  const valid = samples.filter((s) => s !== '');
  if (valid.length === 0) return 0;
  let score = 0;
  let hasColonFormat = false;
  for (const s of valid) {
    if (s.includes('%')) continue; // percentage → not RR
    if (s.includes(':')) hasColonFormat = true;
    const num = parseRatioValue(s);
    if (num !== null && num >= 0.1 && num <= 20) {
      score += num >= 0.5 && num <= 10 ? 1 : 0.5;
    }
  }
  const base = score / valid.length;
  return hasColonFormat ? Math.min(1, base + 0.2) : base;
}

// ─── Header Hint (secondary signal for tie-breaking) ─────────────────────────

const HEADER_HINTS: Record<RequiredField, string[]> = {
  trade_date:         ['date', 'fecha', 'datum', 'dat', 'day'],
  trade_time:         ['time', 'hour', 'heure', 'zeit', 'entry time', 'open time'],
  market:             ['market', 'pair', 'symbol', 'instrument', 'asset', 'currency', 'ticker'],
  direction:          ['direction', 'side', 'type', 'action', 'buy', 'sell', 'position'],
  trade_outcome:      ['outcome', 'result', 'win', 'loss', 'pnl result', 'w/l'],
  risk_per_trade:     ['risk', '% risk', 'risk %', 'risk_pct', 'risk amount', '%'],
  risk_reward_ratio:  ['rr', 'r/r', 'r:r', 'ratio', 'reward', 'risk reward', 'rr ratio'],
};

function headerHint(col: string, field: RequiredField): number {
  const lower = col.toLowerCase();
  return HEADER_HINTS[field].some((h) => lower.includes(h)) ? 0.1 : 0;
}

// ─── Detector Map ─────────────────────────────────────────────────────────────

type FieldDetector = (samples: string[]) => number;

const DETECTORS: Record<RequiredField, FieldDetector> = {
  trade_date:        scoreDate,
  trade_time:        scoreTime,
  market:            scoreMarket,
  direction:         scoreDirection,
  trade_outcome:     scoreOutcome,
  risk_per_trade:    scoreRiskPerTrade,
  risk_reward_ratio: scoreRiskRewardRatio,
};

// ─── Main Functions ───────────────────────────────────────────────────────────

/**
 * Match CSV column headers to database trade fields based on sample values.
 *
 * @param columnSamples - Map of CSV header → array of sample cell values.
 * @returns ColumnMatchResult
 */
export function matchCsvColumns(
  columnSamples: Record<string, string[]>,
): ColumnMatchResult {
  const csvColumns = Object.keys(columnSamples);

  // 1. Score every (column × field) pair
  type Triple = { col: string; field: RequiredField; score: number };
  const triples: Triple[] = [];

  for (const col of csvColumns) {
    const samples = columnSamples[col];
    for (const field of REQUIRED_FIELDS) {
      const valueScore  = DETECTORS[field](samples);
      const headerBonus = headerHint(col, field);
      const score = Math.min(1, valueScore + (valueScore > 0 ? headerBonus : 0));
      if (score > 0) triples.push({ col, field, score });
    }
  }

  // 2. Detect combined date+time columns → add to suggestions
  const suggestions: ColumnSuggestion[] = [];
  for (const col of csvColumns) {
    if (isCombinedDatetime(columnSamples[col])) {
      suggestions.push({
        csvColumn:      col,
        possibleFields: ['trade_date', 'trade_time'],
        reason:         'Column contains both date and time values — consider splitting into separate columns',
      });
    }
  }

  // 3. Greedy assignment: highest composite score first, one-to-one
  triples.sort((a, b) => b.score - a.score);

  const assignedCols   = new Set<string>();
  const assignedFields = new Set<RequiredField>();
  const matches: Record<string, ColumnMatch> = {};

  for (const { col, field, score } of triples) {
    if (assignedCols.has(col) || assignedFields.has(field)) continue;
    if (score < MIN_CONFIDENCE) continue;

    matches[col] = { field, confidence: Math.round(score * 100) / 100 };
    assignedCols.add(col);
    assignedFields.add(field);
  }

  // 4. Classify remaining columns
  const unmappedColumns  = csvColumns.filter((col) => !(col in matches));
  const matchedFields    = new Set(Object.values(matches).map((m) => m.field as RequiredField));
  const missingRequired  = REQUIRED_FIELDS.filter((f) => !matchedFields.has(f));

  // 5. Hint for near-miss situations: multiple columns could serve a missing field
  for (const field of missingRequired) {
    const candidates = triples
      .filter((t) => t.field === field && !assignedCols.has(t.col))
      .slice(0, 3);

    if (candidates.length > 1) {
      suggestions.push({
        csvColumn:      candidates.map((c) => c.col).join(' / '),
        possibleFields: [field],
        reason:         `Multiple columns are possible matches for "${field}" — please select one manually`,
      });
    }
  }

  return { matches, unmappedColumns, missingRequired, suggestions };
}

/**
 * Convenience wrapper: accepts raw CSV rows and runs the full matcher.
 *
 * @param rows       - Array of row objects (CSV parsed to JS objects).
 * @param maxSamples - Max sample values to inspect per column (default 20).
 */
export function matchCsvRows(
  rows: Record<string, string>[],
  maxSamples = 20,
): ColumnMatchResult {
  return matchCsvColumns(extractColumnSamples(rows, maxSamples));
}
