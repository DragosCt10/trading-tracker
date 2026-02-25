import { format, parseISO, getMonth, isValid } from 'date-fns';
import type { Trade } from '@/types/trade';
import { calculateTradePnl } from '@/utils/helpers/tradePnlCalculator';

export type ParsedTrade = Omit<Trade, 'id' | 'user_id' | 'account_id'>;

export interface RowError {
  rowIndex: number;
  field: string;
  message: string;
}

export interface ParseResult {
  rows: ParsedTrade[];
  errors: RowError[];
}

/** Parse a quoted CSV value: strips surrounding quotes and unescapes doubled quotes */
function parseValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

/** Trim and strip BOM / non-breaking space so " WIN " and similar normalize correctly */
function normalizeTrim(value: string): string {
  return value.replace(/\uFEFF/g, '').replace(/\u00A0/g, ' ').trim();
}

/**
 * Normalize numeric string: strip currency symbols, spaces, support EU (1.234,56) and US (1,234.56),
 * strip trailing R/k/K for risk:reward. Use before parseFloat.
 */
function normalizeNumericInput(raw: string): string {
  let s = normalizeTrim(raw).replace(/[\s€$£¥%]/g, '');
  // Strip trailing R, k, K (e.g. "1.5R" → "1.5")
  s = s.replace(/[rRkK]\s*$/, '');
  // EU style: dot = thousands, comma = decimal (e.g. 1.234,56 → 1234.56)
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(s)) {
    return s.replace(/\./g, '').replace(',', '.');
  }
  // US style or plain: remove thousands commas, then comma → dot
  s = s.replace(/,/g, '.');
  // If multiple dots, treat as thousands (e.g. 1.234.56 → 1234.56 for EU)
  const parts = s.split('.');
  if (parts.length > 2) {
    s = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }
  return s;
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
        i++; // skip escaped quote
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

/** Very flexible boolean: yes/no, 1/0, true/false, x, +, -, ok, positive/negative, on/off, etc. */
function parseBool(value: string | undefined): boolean {
  const v = normalizeTrim(value ?? '').toLowerCase().replace(/\s+/g, ' ');
  if (!v) return false;
  if (v === 'no' || v === 'n' || v === 'false' || v === '0' || v === '-' || v === 'off' ||
    v === 'negative' || v === 'nope' || v === 'none') return false;
  if (v === 'yes' || v === 'y' || v === 'true' || v === '1' || v === '+' || v === 'on' ||
    v === 'ok' || v === 'positive' || v === 'x' || v === 'check' || v === 'checked' ||
    v === 'affirmative' || v === 'correct') return true;
  return false;
}

function deriveQuarter(date: Date): string {
  const month = getMonth(date); // 0-indexed
  return `Q${Math.ceil((month + 1) / 3)}`;
}

/**
 * Parse date string flexibly: ISO, DD.MM.YYYY, DD/MM/YYYY, MM/DD/YYYY, MM-DD-YYYY,
 * D.M.YYYY, D/M/YYYY, M/D/YYYY, YYYY.MM.DD, and Excel-style YYYY-MM-DD with time.
 * Returns [normalizedDateStr, parsedDate] or [original, null] if invalid.
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

  // MM/DD/YYYY or MM-DD-YYYY (US): try if first segment <= 12 and second > 12
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

  return { normalized: dateTrimmed, parsed: null };
}

/**
 * Parse CSV text into an array of ParsedTrade objects using a column mapping.
 *
 * @param csvText   Raw CSV file content
 * @param mapping   Map from CSV header → Trade field name (null/missing = skip column)
 * @returns         Valid rows and per-row errors
 */
export function parseCsvTrades(
  csvText: string,
  mapping: Record<string, string | null>,
  defaults?: { risk_per_trade?: number; risk_reward_ratio?: number; account_balance?: number }
): ParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { rows: [], errors: [{ rowIndex: 0, field: 'file', message: 'CSV file has no data rows.' }] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const csvHeaders = splitCsvLine(lines[0], delimiter).map((h) => parseValue(h));
  const rows: ParsedTrade[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowIndex = i; // 1-based for display
    const values = splitCsvLine(lines[i], delimiter);

    // Build a lookup: tradeField → raw string value from this row
    const fieldValues: Record<string, string> = {};
    csvHeaders.forEach((header, colIdx) => {
      const tradeField = mapping[header];
      if (tradeField) {
        fieldValues[tradeField] = parseValue(values[colIdx] ?? '');
      }
    });

    // Skip rows where all mapped fields are empty (e.g. stats rows to the right of trade data)
    if (Object.values(fieldValues).every((v) => v === '')) continue;

    const rowErrors: RowError[] = [];

    // --- Required: trade_date (flexible formats: ISO, DD.MM.YYYY, MM/DD/YYYY, etc.) ---
    const rawDate = fieldValues['trade_date'] ?? '';
    const dateTrimmed = normalizeTrim(rawDate);
    let parsedDate: Date | null = null;
    let normalizedDate = rawDate;
    if (!dateTrimmed) {
      rowErrors.push({ rowIndex, field: 'trade_date', message: 'Missing required field: Date' });
    } else {
      const dateResult = parseDateFlexible(dateTrimmed);
      parsedDate = dateResult.parsed;
      normalizedDate = dateResult.normalized;
      if (!parsedDate) {
        rowErrors.push({ rowIndex, field: 'trade_date', message: `Invalid date: "${dateTrimmed}" (try YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, or MM/DD/YYYY)` });
      }
    }

    // --- Required: market (trim only; no format validation) ---
    const rawMarket = fieldValues['market'] ?? '';
    const marketTrimmed = normalizeTrim(rawMarket);
    if (!marketTrimmed) {
      rowErrors.push({ rowIndex, field: 'market', message: 'Missing required field: Market' });
    }

    // --- Required: direction (trim only; pass through as-is) ---
    const rawDirection = fieldValues['direction'] ?? '';
    const directionTrimmed = normalizeTrim(rawDirection);
    if (!directionTrimmed) {
      rowErrors.push({ rowIndex, field: 'direction', message: 'Missing required field: Direction' });
    }

    // --- Required: trade_outcome (trim only; pass through as-is) ---
    const rawOutcome = fieldValues['trade_outcome'] ?? '';
    const outcomeTrimmed = normalizeTrim(rawOutcome);
    if (!outcomeTrimmed) {
      rowErrors.push({ rowIndex, field: 'trade_outcome', message: 'Missing required field: Outcome' });
    }

    // --- Required numerics (normalize string first; error only when empty or still not a number) ---
    const rawRisk = fieldValues['risk_per_trade'] ?? '';
    const riskNormalized = normalizeNumericInput(rawRisk);
    const riskPerTrade = riskNormalized !== '' ? parseFloat(riskNormalized) : (defaults?.risk_per_trade ?? NaN);
    if (riskNormalized !== '' && isNaN(riskPerTrade)) {
      rowErrors.push({ rowIndex, field: 'risk_per_trade', message: `Risk % must be a number, got: "${rawRisk}"` });
    } else if (riskNormalized === '' && (defaults?.risk_per_trade == null || isNaN(defaults.risk_per_trade))) {
      rowErrors.push({ rowIndex, field: 'risk_per_trade', message: 'Missing required field: Risk % (or set a default in the previous step)' });
    }

    const rawRR = fieldValues['risk_reward_ratio'] ?? '';
    const rrNormalized = normalizeNumericInput(rawRR);
    const rrRatio = rrNormalized !== '' ? parseFloat(rrNormalized) : (defaults?.risk_reward_ratio ?? NaN);
    if (!rrNormalized && (defaults?.risk_reward_ratio == null || isNaN(defaults.risk_reward_ratio))) {
      rowErrors.push({ rowIndex, field: 'risk_reward_ratio', message: 'Missing required field: Risk:Reward Ratio (or set a default in the previous step)' });
    } else if (rrNormalized !== '' && isNaN(rrRatio)) {
      rowErrors.push({ rowIndex, field: 'risk_reward_ratio', message: `Risk:Reward Ratio must be a number, got: "${rawRR}"` });
    }

    const rawSL = fieldValues['sl_size'] ?? '';
    const slNormalized = normalizeNumericInput(rawSL);
    const slSize = slNormalized === '' ? 0 : parseFloat(slNormalized);
    if (slNormalized !== '' && isNaN(slSize)) {
      rowErrors.push({ rowIndex, field: 'sl_size', message: `SL Size must be a number, got: "${rawSL}"` });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    // All required fields valid — build the trade (only date is normalized; rest pass-through trimmed)
    const tradeDate = normalizedDate;
    const rawTime = normalizeTrim(fieldValues['trade_time'] ?? '');
    const tradeTime = rawTime || '00:00:00';
    const dayOfWeek = parsedDate ? format(parsedDate, 'EEEE') : normalizeTrim(fieldValues['day_of_week'] ?? '');
    const quarter = parsedDate ? deriveQuarter(parsedDate) : normalizeTrim(fieldValues['quarter'] ?? '');

    const rawRRLong = fieldValues['risk_reward_ratio_long'] ?? '';
    const rrLongNorm = normalizeNumericInput(rawRRLong);
    const isLose = /^(lose|loss|l)$/i.test(outcomeTrimmed);
    const rrLong = rrLongNorm !== '' ? parseFloat(rrLongNorm) : (isLose ? 0 : rrRatio);

    const rawCalcProfit = fieldValues['calculated_profit'] ?? '';
    const calcProfitNorm = normalizeNumericInput(rawCalcProfit);
    const csvCalcProfit = calcProfitNorm !== '' ? parseFloat(calcProfitNorm) : undefined;

    const rawPnl = fieldValues['pnl_percentage'] ?? '';
    const pnlNorm = normalizeNumericInput(rawPnl);
    const csvPnlPct = pnlNorm !== '' ? parseFloat(pnlNorm) : undefined;

    const rawDisplace = fieldValues['displacement_size'] ?? '';
    const displaceNorm = normalizeNumericInput(rawDisplace);
    const displacementSize = displaceNorm !== '' ? parseFloat(displaceNorm) : 0;

    const rawFvgSize = fieldValues['fvg_size'] ?? '';
    const fvgNorm = normalizeNumericInput(rawFvgSize);
    const fvgSize = fvgNorm !== '' ? parseFloat(fvgNorm) : null;

    const breakEven = parseBool(fieldValues['break_even']);

    // If CSV doesn't supply profit/pnl, calculate using the same formula as NewTradeModal (derive Win/Lose from outcome text for formula only)
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
      market: marketTrimmed,
      direction: directionTrimmed,
      setup_type: normalizeTrim(fieldValues['setup_type'] ?? ''),
      trade_outcome: outcomeTrimmed,
      risk_per_trade: riskPerTrade,
      risk_reward_ratio: rrRatio,
      risk_reward_ratio_long: isNaN(rrLong) ? 0 : rrLong,
      sl_size: slSize,
      break_even: breakEven,
      reentry: parseBool(fieldValues['reentry']),
      news_related: parseBool(fieldValues['news_related']),
      local_high_low: parseBool(fieldValues['local_high_low']),
      partials_taken: parseBool(fieldValues['partials_taken']),
      executed: fieldValues['executed'] !== undefined ? parseBool(fieldValues['executed']) : true,
      launch_hour: parseBool(fieldValues['launch_hour']),
      mss: normalizeTrim(fieldValues['mss'] ?? ''),
      liquidity: normalizeTrim(fieldValues['liquidity'] ?? ''),
      trade_link: normalizeTrim(fieldValues['trade_link'] ?? ''),
      liquidity_taken: normalizeTrim(fieldValues['liquidity_taken'] ?? ''),
      evaluation: normalizeTrim(fieldValues['evaluation'] ?? ''),
      notes: normalizeTrim(fieldValues['notes'] ?? '') || undefined,
      quarter,
      displacement_size: isNaN(displacementSize) ? 0 : displacementSize,
      calculated_profit: csvCalcProfit ?? computedPnl?.calculated_profit,
      pnl_percentage: csvPnlPct ?? computedPnl?.pnl_percentage,
      strategy_id: undefined,
      trend: normalizeTrim(fieldValues['trend'] ?? '') || null,
      fvg_size: fvgSize !== null && !isNaN(fvgSize) ? fvgSize : null,
      confidence_at_entry: undefined,
      mind_state_at_entry: undefined,
    };

    rows.push(trade);
  }

  return { rows, errors };
}

/** Extract only the header row from a CSV string (auto-detects comma vs semicolon delimiter). */
export function extractCsvHeaders(csvText: string): string[] {
  const firstLine = csvText.split(/\r?\n/)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  return splitCsvLine(firstLine, delimiter).map((h) => parseValue(h));
}
