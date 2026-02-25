import { format, parseISO, getMonth, isValid } from 'date-fns';
import { isValidMarket, normalizeMarket } from '@/utils/validateMarket';
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

/** Split a CSV line respecting quoted fields (commas inside quotes are not delimiters) */
function splitCsvLine(line: string): string[] {
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
    } else if (char === ',' && !inQuotes) {
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
 * Strip emoji, icons, and any characters that are not letters, digits, or slash.
 * Handles markets like "GBPUSD🔥" or "EUR/USD✓".
 */
function sanitizeMarketInput(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[^A-Za-z0-9/]/g, '').toUpperCase();
}

/** Normalize direction: handles any casing and common abbreviations */
function normalizeDirection(value: string): 'Long' | 'Short' | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'long' || v === 'l' || v === 'buy' || v === 'b') return 'Long';
  if (v === 'short' || v === 's' || v === 'sell') return 'Short';
  return null;
}

/** Normalize outcome: handles any casing and common abbreviations */
function normalizeOutcome(value: string): 'Win' | 'Lose' | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'win' || v === 'w' || v === 'winner' || v === 'won') return 'Win';
  if (v === 'lose' || v === 'loss' || v === 'l' || v === 'loser' || v === 'lost') return 'Lose';
  return null;
}

function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'yes' || v === 'true' || v === '1';
}

function deriveQuarter(date: Date): string {
  const month = getMonth(date); // 0-indexed
  return `Q${Math.ceil((month + 1) / 3)}`;
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
  defaults?: { risk_per_trade?: number; account_balance?: number }
): ParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { rows: [], errors: [{ rowIndex: 0, field: 'file', message: 'CSV file has no data rows.' }] };
  }

  const csvHeaders = splitCsvLine(lines[0]).map((h) => parseValue(h));
  const rows: ParsedTrade[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowIndex = i; // 1-based for display
    const values = splitCsvLine(lines[i]);

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

    // --- Required: trade_date ---
    const rawDate = fieldValues['trade_date'] ?? '';
    let parsedDate: Date | null = null;
    let normalizedDate = rawDate;
    if (!rawDate) {
      rowErrors.push({ rowIndex, field: 'trade_date', message: 'Missing required field: Date' });
    } else {
      parsedDate = parseISO(rawDate);
      if (!isValid(parsedDate)) {
        // Try DD.MM.YYYY (European dot-separated format)
        const dotMatch = rawDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (dotMatch) {
          normalizedDate = `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
          parsedDate = parseISO(normalizedDate);
        }
      }
      if (!isValid(parsedDate)) {
        rowErrors.push({ rowIndex, field: 'trade_date', message: `Invalid date: "${rawDate}" (expected YYYY-MM-DD or DD.MM.YYYY)` });
        parsedDate = null;
      }
    }

    // --- Required: market ---
    const rawMarket = fieldValues['market'] ?? '';
    const sanitizedMarket = sanitizeMarketInput(rawMarket);
    if (!rawMarket) {
      rowErrors.push({ rowIndex, field: 'market', message: 'Missing required field: Market' });
    } else if (!isValidMarket(sanitizedMarket)) {
      rowErrors.push({ rowIndex, field: 'market', message: `Invalid market: "${rawMarket}"` });
    }

    // --- Required: direction ---
    const rawDirection = fieldValues['direction'] ?? '';
    const normalizedDirection = normalizeDirection(rawDirection);
    if (!rawDirection) {
      rowErrors.push({ rowIndex, field: 'direction', message: 'Missing required field: Direction' });
    } else if (normalizedDirection === null) {
      rowErrors.push({ rowIndex, field: 'direction', message: `Direction must be "Long" or "Short", got: "${rawDirection}"` });
    }

    // --- Required: trade_outcome ---
    const rawOutcome = fieldValues['trade_outcome'] ?? '';
    const normalizedOutcome = normalizeOutcome(rawOutcome);
    if (!rawOutcome) {
      rowErrors.push({ rowIndex, field: 'trade_outcome', message: 'Missing required field: Outcome' });
    } else if (normalizedOutcome === null) {
      rowErrors.push({ rowIndex, field: 'trade_outcome', message: `Outcome must be "Win" or "Lose", got: "${rawOutcome}"` });
    }

    // --- Required numerics ---
    const rawRisk = fieldValues['risk_per_trade'] ?? '';
    const riskPerTrade = rawRisk !== '' ? parseFloat(rawRisk) : (defaults?.risk_per_trade ?? NaN);
    if (isNaN(riskPerTrade)) {
      rowErrors.push({ rowIndex, field: 'risk_per_trade', message: `Risk % must be a number, got: "${rawRisk}"` });
    }

    const rawRR = fieldValues['risk_reward_ratio'] ?? '';
    const rrRatio = parseFloat(rawRR);
    if (rawRR === '' || isNaN(rrRatio)) {
      rowErrors.push({ rowIndex, field: 'risk_reward_ratio', message: `Risk:Reward Ratio must be a number, got: "${rawRR}"` });
    }

    const rawSL = fieldValues['sl_size'] ?? '';
    const slSize = rawSL === '' ? 0 : parseFloat(rawSL);
    if (rawSL !== '' && isNaN(slSize)) {
      rowErrors.push({ rowIndex, field: 'sl_size', message: `SL Size must be a number, got: "${rawSL}"` });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    // All required fields valid — build the trade
    const tradeDate = normalizedDate;
    const tradeTime = fieldValues['trade_time'] ?? '00:00:00';
    const dayOfWeek = parsedDate ? format(parsedDate, 'EEEE') : (fieldValues['day_of_week'] ?? '');
    const quarter = parsedDate ? deriveQuarter(parsedDate) : (fieldValues['quarter'] ?? '');

    const rawRRLong = fieldValues['risk_reward_ratio_long'] ?? '';
    const rrLong = rawRRLong !== '' ? parseFloat(rawRRLong) : (normalizedOutcome === 'Lose' ? 0 : rrRatio);

    const rawCalcProfit = fieldValues['calculated_profit'] ?? '';
    const csvCalcProfit = rawCalcProfit !== '' ? parseFloat(rawCalcProfit) : undefined;

    const rawPnl = fieldValues['pnl_percentage'] ?? '';
    const csvPnlPct = rawPnl !== '' ? parseFloat(rawPnl) : undefined;

    const rawDisplace = fieldValues['displacement_size'] ?? '';
    const displacementSize = rawDisplace !== '' ? parseFloat(rawDisplace) : 0;

    const rawFvgSize = fieldValues['fvg_size'] ?? '';
    const fvgSize = rawFvgSize !== '' ? parseFloat(rawFvgSize) : null;

    const breakEven = parseBool(fieldValues['break_even']);

    // If CSV doesn't supply profit/pnl, calculate using the same formula as NewTradeModal
    // Pure arithmetic — O(1) per row, safe for any import size.
    const computedPnl =
      (csvCalcProfit === undefined || csvPnlPct === undefined) && defaults?.account_balance
        ? calculateTradePnl(
            { trade_outcome: normalizedOutcome!, risk_per_trade: riskPerTrade, risk_reward_ratio: rrRatio, break_even: breakEven },
            defaults.account_balance
          )
        : null;

    const trade: ParsedTrade = {
      mode: undefined,
      trade_date: tradeDate,
      trade_time: tradeTime,
      day_of_week: dayOfWeek,
      market: normalizeMarket(sanitizedMarket),
      direction: normalizedDirection!,
      setup_type: fieldValues['setup_type'] ?? '',
      trade_outcome: normalizedOutcome!,
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
      mss: fieldValues['mss'] ?? '',
      liquidity: fieldValues['liquidity'] ?? '',
      trade_link: fieldValues['trade_link'] ?? '',
      liquidity_taken: fieldValues['liquidity_taken'] ?? '',
      evaluation: fieldValues['evaluation'] ?? '',
      notes: fieldValues['notes'] || undefined,
      quarter,
      displacement_size: isNaN(displacementSize) ? 0 : displacementSize,
      calculated_profit: csvCalcProfit ?? computedPnl?.calculated_profit,
      pnl_percentage: csvPnlPct ?? computedPnl?.pnl_percentage,
      strategy_id: undefined,
      trend: fieldValues['trend']?.trim() ?? null,
      fvg_size: fvgSize !== null && !isNaN(fvgSize) ? fvgSize : null,
    };

    rows.push(trade);
  }

  return { rows, errors };
}

/** Extract only the header row from a CSV string */
export function extractCsvHeaders(csvText: string): string[] {
  const firstLine = csvText.split(/\r?\n/)[0] ?? '';
  return splitCsvLine(firstLine).map((h) => parseValue(h));
}
