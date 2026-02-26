import { format, parse, parseISO, getMonth, isValid } from 'date-fns';
import Papa from 'papaparse';
import type { Trade } from '@/types/trade';
import { calculateTradePnl } from '@/utils/helpers/tradePnlCalculator';

/** CSV parser to use: PapaParse (default) or built-in. */
export type CsvParser = 'default' | 'papaparse';

/** Parsed trade for import; trade_date may be null when CSV date is empty. */
export type ParsedTrade = Omit<Trade, 'id' | 'user_id' | 'account_id' | 'trade_date'> & { trade_date: string | null };

export interface RowError {
  rowIndex: number;
  field: string;
  message: string;
}

export interface ParseResult {
  rows: ParsedTrade[];
  errors: RowError[];
}

/** AI-provided value normalizations for required and boolean fields. */
export interface AiNormalizations {
  direction?: Record<string, string>;
  trade_outcome?: Record<string, string>;
  market?: Record<string, string>;
  /** Per boolean field: maps every unique raw CSV value to true or false. */
  booleans?: Record<string, Record<string, boolean>>;
}

/** Parse a quoted CSV value: strips surrounding quotes and unescapes doubled quotes */
function parseValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

/** Trim and strip BOM / non-breaking space */
function normalizeTrim(value: string): string {
  return value.replace(/\uFEFF/g, '').replace(/\u00A0/g, ' ').trim();
}

/** Detect CSV delimiter from first line: use semicolon if it has more semicolons than commas (EU style). */
function detectDelimiter(firstLine: string): ',' | ';' {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

/** Split a CSV line respecting quoted fields. Delimiter can be comma or semicolon. */
function splitCsvLine(line: string, delimiter: ',' | ';' = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse a numeric value from a CSV cell, handling common formatting:
 * - Trailing % sign:   "0.7%"  → 0.7
 * - Currency symbols:  "$1.5"  → 1.5
 * - European decimals: "0,7"   → 0.7  (only when pattern is clearly X,YY not a thousands separator)
 * - Thousands commas:  "1,000" → 1000
 * Returns null if the value is empty or cannot be parsed.
 */
function parseCSVNumber(raw: string): number | null {
  let s = normalizeTrim(raw);
  if (!s) return null;

  // Strip common non-numeric suffixes/prefixes
  s = s.replace(/%$/, '').replace(/^[$€£¥]/, '').trim();
  if (!s) return null;

  // European decimal: "0,7" or "1,75" (comma followed by 1-2 digits at end, no other dot)
  if (/^-?\d+,\d{1,2}$/.test(s) && !s.includes('.')) {
    s = s.replace(',', '.');
  } else {
    // Thousands separator commas: "1,000" or "1,000.5" — remove them
    s = s.replace(/,(\d{3})/g, '$1');
  }

  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Parse a CSV boolean value: "yes", "true", "1", "x", "✓" → true; "no", "false", "0", "" → false */
function parseBool(value: string | undefined): boolean {
  const v = normalizeTrim(value ?? '').toLowerCase();
  if (!v) return false;
  return /^(yes|true|1|x|✓|checked|on)$/.test(v);
}

function deriveQuarter(date: Date): string {
  const month = getMonth(date);
  return `Q${Math.ceil((month + 1) / 3)}`;
}

/**
 * Parse date string flexibly: ISO, DD.MM.YYYY, DD/MM/YYYY, MM/DD/YYYY, MM-DD-YYYY,
 * D.M.YYYY, D/M/YYYY, M/D/YYYY, YYYY.MM.DD, and Excel-style YYYY-MM-DD with time.
 */
function parseDateFlexible(dateTrimmed: string): { normalized: string; parsed: Date | null } {
  if (!dateTrimmed) return { normalized: dateTrimmed, parsed: null };
  let parsed = parseISO(dateTrimmed);
  let normalized = dateTrimmed;

  const patterns: Array<{ regex: RegExp; toISO: (m: RegExpMatchArray) => string }> = [
    { regex: /^(\d{2})\.(\d{2})\.(\d{4})$/, toISO: (m) => `${m[3]}-${m[2]}-${m[1]}` },
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, toISO: (m) => `${m[3]}-${m[2]}-${m[1]}` },
    { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, toISO: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, toISO: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
    { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})/, toISO: (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
    { regex: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, toISO: (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
  ];

  if (isValid(parsed)) return { normalized: dateTrimmed.slice(0, 10), parsed };

  for (const { regex, toISO } of patterns) {
    const m = dateTrimmed.match(regex);
    if (m) {
      normalized = toISO(m);
      parsed = parseISO(normalized);
      if (isValid(parsed)) return { normalized, parsed };
    }
  }

  const usSlash = dateTrimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usSlash) {
    const [, a, b, y] = usSlash;
    const m1 = parseInt(a, 10);
    const m2 = parseInt(b, 10);
    if (m1 >= 1 && m1 <= 12 && m2 >= 1 && m2 <= 31) {
      const asDDMM = `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      const asMMDD = `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
      const p1 = parseISO(asDDMM);
      const p2 = parseISO(asMMDD);
      if (isValid(p1)) return { normalized: asDDMM, parsed: p1 };
      if (isValid(p2)) return { normalized: asMMDD, parsed: p2 };
    }
  }

  const usDash = dateTrimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (usDash) {
    const [, a, b, y] = usDash;
    const asMMDD = `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
    parsed = parseISO(asMMDD);
    if (isValid(parsed)) return { normalized: asMMDD, parsed };
  }

  // Long/short month name formats: "January 6, 2026", "Jan 6, 2026", "6 January 2026", "6 Jan 2026"
  const namedMonthFormats = [
    'MMMM d, yyyy',   // January 6, 2026
    'MMM d, yyyy',    // Jan 6, 2026
    'MMMM dd, yyyy',  // January 06, 2026
    'MMM dd, yyyy',   // Jan 06, 2026
    'd MMMM yyyy',    // 6 January 2026
    'd MMM yyyy',     // 6 Jan 2026
    'dd MMMM yyyy',   // 06 January 2026
    'dd MMM yyyy',    // 06 Jan 2026
    'MMMM d yyyy',    // January 6 2026 (no comma)
    'MMM d yyyy',     // Jan 6 2026 (no comma)
  ];
  for (const fmt of namedMonthFormats) {
    try {
      const p = parse(dateTrimmed, fmt, new Date());
      if (isValid(p)) {
        const iso = format(p, 'yyyy-MM-dd');
        return { normalized: iso, parsed: p };
      }
    } catch {
      // try next format
    }
  }

  return { normalized: dateTrimmed, parsed: null };
}

/**
 * Look up a raw value in an AI normalization map, case-insensitively.
 * Returns the normalized value if found, otherwise the raw value unchanged.
 */
function applyNorm(normMap: Record<string, string> | undefined, rawValue: string): string {
  if (!normMap || !rawValue) return rawValue;
  if (rawValue in normMap) return normMap[rawValue];
  const lower = rawValue.toLowerCase();
  for (const [k, v] of Object.entries(normMap)) {
    if (k.toLowerCase() === lower) return v;
  }
  return rawValue;
}

/**
 * Look up a boolean field value using the AI-provided booleans normalization map.
 * Falls back to parseBool when AI has no mapping for this field or value.
 */
function applyBoolNorm(
  booleans: Record<string, Record<string, boolean>> | undefined,
  fieldName: string,
  rawValue: string,
): boolean {
  const fieldMap = booleans?.[fieldName];
  if (!fieldMap) return parseBool(rawValue);
  // Exact match
  if (rawValue in fieldMap) return fieldMap[rawValue];
  // Case-insensitive fallback
  const lower = rawValue.toLowerCase();
  for (const [k, v] of Object.entries(fieldMap)) {
    if (k.toLowerCase() === lower) return v;
  }
  // If value not found in AI map, fall back to parseBool
  return parseBool(rawValue);
}

/**
 * Extract up to 15 unique non-empty sample values per CSV column.
 * Used to give the AI enough context to build normalization mappings.
 */
export function extractColumnSamples(csvText: string, parser: CsvParser = 'papaparse'): Record<string, string[]> {
  const raw = parseCsvRaw(csvText, parser);
  const result: Record<string, string[]> = {};
  for (const header of raw.headers) {
    const seen = new Set<string>();
    for (const row of raw.rows) {
      const val = normalizeTrim(row[header] ?? '');
      if (val) seen.add(val);
      if (seen.size >= 15) break;
    }
    result[header] = Array.from(seen);
  }
  return result;
}

/**
 * Parse CSV text into an array of ParsedTrade objects using AI-provided field mapping
 * and value normalizations. Direction, outcome and market values are normalized via
 * the AI normalization maps; date parsing remains deterministic.
 * Default parser is PapaParse (https://www.papaparse.com/). Pass 'default' for the built-in parser.
 */
export function parseCsvTradesWithNorm(
  csvText: string,
  fieldMapping: Record<string, string>,
  normalizations: AiNormalizations,
  defaults?: { risk_per_trade?: number; risk_reward_ratio?: number; account_balance?: number },
  parser: CsvParser = 'papaparse'
): ParseResult {
  const raw = parseCsvRaw(csvText, parser);
  if (raw.headers.length === 0 || raw.rows.length === 0) {
    return { rows: [], errors: [{ rowIndex: 0, field: 'file', message: 'CSV file has no data rows.' }] };
  }

  const rows: ParsedTrade[] = [];
  const errors: RowError[] = [];

  for (let i = 0; i < raw.rows.length; i++) {
    const rowIndex = i + 1;
    const row = raw.rows[i];

    // Build lookup: tradeField → raw string value from this row
    const fieldValues: Record<string, string> = {};
    raw.headers.forEach((header) => {
      const tradeField = fieldMapping[header];
      if (tradeField) {
        fieldValues[tradeField] = row[header] ?? '';
      }
    });

    // Skip fully-empty rows
    if (Object.values(fieldValues).every((v) => v === '')) continue;

    const rowErrors: RowError[] = [];

    // --- trade_date ---
    const rawDate = fieldValues['trade_date'] ?? '';
    const dateTrimmed = normalizeTrim(rawDate);
    let parsedDate: Date | null = null;
    let normalizedDate = dateTrimmed;
    if (dateTrimmed) {
      const dateResult = parseDateFlexible(dateTrimmed);
      parsedDate = dateResult.parsed;
      normalizedDate = dateResult.normalized;
      if (!parsedDate) {
        rowErrors.push({ rowIndex, field: 'trade_date', message: `Invalid date: "${dateTrimmed}"` });
      }
    }

    // --- AI-normalized required fields ---
    const rawMarket = normalizeTrim(fieldValues['market'] ?? '');
    const market = applyNorm(normalizations.market, rawMarket);

    const rawDirection = normalizeTrim(fieldValues['direction'] ?? '');
    const direction = applyNorm(normalizations.direction, rawDirection);

    const rawOutcome = normalizeTrim(fieldValues['trade_outcome'] ?? '');
    const tradeOutcome = applyNorm(normalizations.trade_outcome, rawOutcome);
    const isLose = tradeOutcome === 'Lose';

    // --- Numerics ---
    const rawRisk = fieldValues['risk_per_trade'] ?? '';
    const parsedRisk = parseCSVNumber(rawRisk);
    const riskPerTrade = parsedRisk !== null ? parsedRisk : (defaults?.risk_per_trade ?? 0);
    if (rawRisk.trim() !== '' && parsedRisk === null) {
      rowErrors.push({ rowIndex, field: 'risk_per_trade', message: `Risk % must be a number, got: "${rawRisk}"` });
    }

    const rawRR = fieldValues['risk_reward_ratio'] ?? '';
    const parsedRR = parseCSVNumber(rawRR);
    const rrRatio = parsedRR !== null ? parsedRR : (defaults?.risk_reward_ratio ?? 0);
    if (rawRR.trim() !== '' && parsedRR === null) {
      rowErrors.push({ rowIndex, field: 'risk_reward_ratio', message: `RR Ratio must be a number, got: "${rawRR}"` });
    }

    const rawSL = fieldValues['sl_size'] ?? '';
    const parsedSL = parseCSVNumber(rawSL);
    const slSize = parsedSL ?? 0;
    if (rawSL.trim() !== '' && parsedSL === null) {
      rowErrors.push({ rowIndex, field: 'sl_size', message: `SL Size must be a number, got: "${rawSL}"` });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    const tradeDate: string | null = dateTrimmed ? normalizedDate : null;
    const rawTime = normalizeTrim(fieldValues['trade_time'] ?? '');
    const tradeTime = rawTime || '00:00:00';
    const dayOfWeek = parsedDate ? format(parsedDate, 'EEEE') : normalizeTrim(fieldValues['day_of_week'] ?? '');
    const quarter = parsedDate ? deriveQuarter(parsedDate) : normalizeTrim(fieldValues['quarter'] ?? '');

    const rrLong = parseCSVNumber(fieldValues['risk_reward_ratio_long'] ?? '') ?? (isLose ? 0 : rrRatio);
    const csvCalcProfit = parseCSVNumber(fieldValues['calculated_profit'] ?? '') ?? undefined;
    const csvPnlPct = parseCSVNumber(fieldValues['pnl_percentage'] ?? '') ?? undefined;
    const displacementSize = parseCSVNumber(fieldValues['displacement_size'] ?? '') ?? 0;
    const fvgSize = parseCSVNumber(fieldValues['fvg_size'] ?? '') ?? null;

    const breakEven = applyBoolNorm(normalizations.booleans, 'break_even', fieldValues['break_even'] ?? '');

    const outcomeForPnl = isLose ? 'Lose' : 'Win';
    const computedPnl =
      (csvCalcProfit === undefined || csvPnlPct === undefined) && defaults?.account_balance
        ? calculateTradePnl(
            { trade_outcome: outcomeForPnl, risk_per_trade: riskPerTrade, risk_reward_ratio: rrRatio, break_even: breakEven },
            defaults.account_balance
          )
        : null;

    const trade: ParsedTrade = {
      mode: undefined,
      trade_date: tradeDate,
      trade_time: tradeTime,
      day_of_week: dayOfWeek,
      market,
      direction,
      setup_type: normalizeTrim(fieldValues['setup_type'] ?? ''),
      trade_outcome: tradeOutcome,
      risk_per_trade: riskPerTrade,
      risk_reward_ratio: rrRatio,
      risk_reward_ratio_long: rrLong,
      sl_size: slSize,
      break_even: breakEven,
      reentry: applyBoolNorm(normalizations.booleans, 'reentry', fieldValues['reentry'] ?? ''),
      news_related: applyBoolNorm(normalizations.booleans, 'news_related', fieldValues['news_related'] ?? ''),
      local_high_low: applyBoolNorm(normalizations.booleans, 'local_high_low', fieldValues['local_high_low'] ?? ''),
      partials_taken: applyBoolNorm(normalizations.booleans, 'partials_taken', fieldValues['partials_taken'] ?? ''),
      executed: fieldValues['executed'] !== undefined ? applyBoolNorm(normalizations.booleans, 'executed', fieldValues['executed']) : true,
      launch_hour: applyBoolNorm(normalizations.booleans, 'launch_hour', fieldValues['launch_hour'] ?? ''),
      mss: normalizeTrim(fieldValues['mss'] ?? ''),
      liquidity: normalizeTrim(fieldValues['liquidity'] ?? ''),
      trade_link: normalizeTrim(fieldValues['trade_link'] ?? ''),
      liquidity_taken: normalizeTrim(fieldValues['liquidity_taken'] ?? ''),
      evaluation: normalizeTrim(fieldValues['evaluation'] ?? ''),
      notes: normalizeTrim(fieldValues['notes'] ?? '') || undefined,
      quarter,
      displacement_size: displacementSize,
      calculated_profit: csvCalcProfit ?? computedPnl?.calculated_profit,
      pnl_percentage: csvPnlPct ?? computedPnl?.pnl_percentage,
      strategy_id: undefined,
      trend: normalizeTrim(fieldValues['trend'] ?? '') || null,
      fvg_size: fvgSize,
      confidence_at_entry: undefined,
      mind_state_at_entry: undefined,
    };

    rows.push(trade);
  }

  return { rows, errors };
}

/** Extract only the header row from a CSV string (default: PapaParse; pass 'default' for built-in delimiter detection). */
export function extractCsvHeaders(csvText: string, parser: CsvParser = 'papaparse'): string[] {
  if (parser === 'papaparse') {
    const raw = parseCsvRaw(csvText, 'papaparse');
    return raw.headers;
  }
  const firstLine = csvText.split(/\r?\n/)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  return splitCsvLine(firstLine, delimiter).map((h) => parseValue(h));
}

/** Result of parsing CSV to raw data (no column mapping). */
export interface RawCsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

/**
 * Parse CSV with PapaParse: header row becomes keys, each row an object.
 * Applies normalizeTrim to header names and cell values for consistency with default parser.
 */
function parseCsvWithPapaParse(csvText: string): RawCsvParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normalizeTrim(h),
    transform: (value) => normalizeTrim(value ?? ''),
  });
  console.log('[PapaParse]', result);
  const headers = result.meta.fields ?? [];
  const rows = result.data.filter((row) => Object.values(row).some((v) => v !== ''));
  return { headers, rows, rowCount: rows.length };
}

/**
 * Parse CSV text into headers and rows of key-value objects.
 * Default is PapaParse (https://www.papaparse.com/). Pass 'default' for the built-in delimiter/quoted-field parser.
 */
export function parseCsvRaw(csvText: string, parser: CsvParser = 'papaparse'): RawCsvParseResult {
  if (parser === 'papaparse') {
    return parseCsvWithPapaParse(csvText);
  }
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) {
    return { headers: [], rows: [], rowCount: 0 };
  }
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h) => parseValue(h));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, colIdx) => {
      row[header] = parseValue(values[colIdx] ?? '');
    });
    rows.push(row);
  }
  return { headers, rows, rowCount: rows.length };
}
