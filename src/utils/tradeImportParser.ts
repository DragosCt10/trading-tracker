import { format, parseISO, getMonth, isValid } from 'date-fns';
import { isValidMarket, normalizeMarket } from '@/utils/validateMarket';
import type { Trade } from '@/types/trade';

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
  mapping: Record<string, string | null>
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

    const rowErrors: RowError[] = [];

    // --- Required: trade_date ---
    const rawDate = fieldValues['trade_date'] ?? '';
    let parsedDate: Date | null = null;
    if (!rawDate) {
      rowErrors.push({ rowIndex, field: 'trade_date', message: 'Missing required field: Date' });
    } else {
      parsedDate = parseISO(rawDate);
      if (!isValid(parsedDate)) {
        rowErrors.push({ rowIndex, field: 'trade_date', message: `Invalid date: "${rawDate}" (expected YYYY-MM-DD)` });
        parsedDate = null;
      }
    }

    // --- Required: market ---
    const rawMarket = fieldValues['market'] ?? '';
    if (!rawMarket) {
      rowErrors.push({ rowIndex, field: 'market', message: 'Missing required field: Market' });
    } else if (!isValidMarket(rawMarket)) {
      rowErrors.push({ rowIndex, field: 'market', message: `Invalid market format: "${rawMarket}"` });
    }

    // --- Required: direction ---
    const rawDirection = fieldValues['direction'] ?? '';
    if (rawDirection !== 'Long' && rawDirection !== 'Short') {
      rowErrors.push({ rowIndex, field: 'direction', message: `Direction must be "Long" or "Short", got: "${rawDirection}"` });
    }

    // --- Required: trade_outcome ---
    const rawOutcome = fieldValues['trade_outcome'] ?? '';
    if (rawOutcome !== 'Win' && rawOutcome !== 'Lose') {
      rowErrors.push({ rowIndex, field: 'trade_outcome', message: `Outcome must be "Win" or "Lose", got: "${rawOutcome}"` });
    }

    // --- Required numerics ---
    const rawRisk = fieldValues['risk_per_trade'] ?? '';
    const riskPerTrade = parseFloat(rawRisk);
    if (rawRisk === '' || isNaN(riskPerTrade)) {
      rowErrors.push({ rowIndex, field: 'risk_per_trade', message: `Risk % must be a number, got: "${rawRisk}"` });
    }

    const rawRR = fieldValues['risk_reward_ratio'] ?? '';
    const rrRatio = parseFloat(rawRR);
    if (rawRR === '' || isNaN(rrRatio)) {
      rowErrors.push({ rowIndex, field: 'risk_reward_ratio', message: `Risk:Reward Ratio must be a number, got: "${rawRR}"` });
    }

    const rawSL = fieldValues['sl_size'] ?? '';
    const slSize = parseFloat(rawSL);
    if (rawSL === '' || isNaN(slSize)) {
      rowErrors.push({ rowIndex, field: 'sl_size', message: `SL Size must be a number, got: "${rawSL}"` });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    // All required fields valid — build the trade
    const tradeDate = rawDate;
    const tradeTime = fieldValues['trade_time'] ?? '00:00:00';
    const dayOfWeek = parsedDate ? format(parsedDate, 'EEEE') : (fieldValues['day_of_week'] ?? '');
    const quarter = parsedDate ? deriveQuarter(parsedDate) : (fieldValues['quarter'] ?? '');

    const rawRRLong = fieldValues['risk_reward_ratio_long'] ?? '';
    const rrLong = rawRRLong !== '' ? parseFloat(rawRRLong) : (rawOutcome === 'Lose' ? 0 : rrRatio);

    const rawCalcProfit = fieldValues['calculated_profit'] ?? '';
    const calcProfit = rawCalcProfit !== '' ? parseFloat(rawCalcProfit) : undefined;

    const rawPnl = fieldValues['pnl_percentage'] ?? '';
    const pnlPct = rawPnl !== '' ? parseFloat(rawPnl) : undefined;

    const rawDisplace = fieldValues['displacement_size'] ?? '';
    const displacementSize = rawDisplace !== '' ? parseFloat(rawDisplace) : 0;

    const trade: ParsedTrade = {
      mode: undefined,
      trade_date: tradeDate,
      trade_time: tradeTime,
      day_of_week: dayOfWeek,
      market: normalizeMarket(rawMarket),
      direction: rawDirection as 'Long' | 'Short',
      setup_type: fieldValues['setup_type'] ?? '',
      trade_outcome: rawOutcome as 'Win' | 'Lose',
      risk_per_trade: riskPerTrade,
      risk_reward_ratio: rrRatio,
      risk_reward_ratio_long: isNaN(rrLong) ? 0 : rrLong,
      sl_size: slSize,
      break_even: parseBool(fieldValues['break_even']),
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
      calculated_profit: calcProfit,
      pnl_percentage: pnlPct,
      strategy_id: undefined,
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
