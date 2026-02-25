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

/** Truthy trimmed value → true (no text normalization). */
function parseBool(value: string | undefined): boolean {
  return !!normalizeTrim(value ?? '');
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

    // --- trade_date: only normalize when present; error only on invalid format ---
    const rawDate = fieldValues['trade_date'] ?? '';
    const dateTrimmed = normalizeTrim(rawDate);
    let parsedDate: Date | null = null;
    let normalizedDate = dateTrimmed;
    if (dateTrimmed) {
      const dateResult = parseDateFlexible(dateTrimmed);
      parsedDate = dateResult.parsed;
      normalizedDate = dateResult.normalized;
      if (!parsedDate) {
        rowErrors.push({ rowIndex, field: 'trade_date', message: `Invalid date: "${dateTrimmed}" (try YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, or MM/DD/YYYY)` });
      }
    }

    // --- Optional text: trim only (no "missing" errors) ---
    const marketTrimmed = normalizeTrim(fieldValues['market'] ?? '');
    const directionTrimmed = normalizeTrim(fieldValues['direction'] ?? '');
    const outcomeTrimmed = normalizeTrim(fieldValues['trade_outcome'] ?? '');

    // --- Numerics: trim only; use defaults when empty, error only on invalid format ---
    const rawRisk = fieldValues['risk_per_trade'] ?? '';
    const riskTrimmed = normalizeTrim(rawRisk);
    const riskPerTrade = riskTrimmed !== '' ? parseFloat(riskTrimmed) : (defaults?.risk_per_trade ?? 0);
    if (riskTrimmed !== '' && isNaN(riskPerTrade)) {
      rowErrors.push({ rowIndex, field: 'risk_per_trade', message: `Risk % must be a number, got: "${rawRisk}"` });
    }

    const rawRR = fieldValues['risk_reward_ratio'] ?? '';
    const rrTrimmed = normalizeTrim(rawRR);
    const rrRatio = rrTrimmed !== '' ? parseFloat(rrTrimmed) : (defaults?.risk_reward_ratio ?? 0);
    if (rrTrimmed !== '' && isNaN(rrRatio)) {
      rowErrors.push({ rowIndex, field: 'risk_reward_ratio', message: `Risk:Reward Ratio must be a number, got: "${rawRR}"` });
    }

    const rawSL = fieldValues['sl_size'] ?? '';
    const slTrimmed = normalizeTrim(rawSL);
    const slSize = slTrimmed === '' ? 0 : parseFloat(slTrimmed);
    if (slTrimmed !== '' && isNaN(slSize)) {
      rowErrors.push({ rowIndex, field: 'sl_size', message: `SL Size must be a number, got: "${rawSL}"` });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    // Build the trade (only date is normalized to YYYY-MM-DD when present; rest trim only, empty allowed)
    const tradeDate = normalizedDate;
    const rawTime = normalizeTrim(fieldValues['trade_time'] ?? '');
    const tradeTime = rawTime || '00:00:00';
    const dayOfWeek = parsedDate ? format(parsedDate, 'EEEE') : normalizeTrim(fieldValues['day_of_week'] ?? '');
    const quarter = parsedDate ? deriveQuarter(parsedDate) : normalizeTrim(fieldValues['quarter'] ?? '');

    const rawRRLong = fieldValues['risk_reward_ratio_long'] ?? '';
    const rrLongTrimmed = normalizeTrim(rawRRLong);
    const isLose = /^(lose|loss|l)$/i.test(outcomeTrimmed);
    const rrLong = rrLongTrimmed !== '' ? parseFloat(rrLongTrimmed) : (isLose ? 0 : rrRatio);

    const rawCalcProfit = fieldValues['calculated_profit'] ?? '';
    const calcProfitTrimmed = normalizeTrim(rawCalcProfit);
    const csvCalcProfit = calcProfitTrimmed !== '' ? parseFloat(calcProfitTrimmed) : undefined;

    const rawPnl = fieldValues['pnl_percentage'] ?? '';
    const pnlTrimmed = normalizeTrim(rawPnl);
    const csvPnlPct = pnlTrimmed !== '' ? parseFloat(pnlTrimmed) : undefined;

    const rawDisplace = fieldValues['displacement_size'] ?? '';
    const displaceTrimmed = normalizeTrim(rawDisplace);
    const displacementSize = displaceTrimmed !== '' ? parseFloat(displaceTrimmed) : 0;

    const rawFvgSize = fieldValues['fvg_size'] ?? '';
    const fvgTrimmed = normalizeTrim(rawFvgSize);
    const fvgSize = fvgTrimmed !== '' ? parseFloat(fvgTrimmed) : null;

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
