import type { Trade } from '@/types/trade';
import { formatTradeTimeForDisplay } from '@/utils/formatTradeTime';

/** CSV column headers for trade export (notes last). */
const EXPORT_HEADERS = [
  'trade_screens',
  'trade_time',
  'trade_date',
  'day_of_week',
  'market',
  'setup_type',
  'liquidity',
  'sl_size',
  'direction',
  'trade_outcome',
  'reentry',
  'news_related',
  'mss',
  'risk_reward',
  'potential_rr',
  'local_high_low',
  'risk_per_trade',
  'calculated_profit',
  'mode',
  'pnl_percentage',
  'quarter',
  'evaluation',
  'partials_taken',
  'executed',
  'launch_hour',
  'fvg_size',
  'trend',
  'confidence_at_entry',
  'mind_state_at_entry',
  'be_final_result',
  'news_name',
  'news_intensity',
  // Futures account fields — auto-omitted from the CSV when every exported
  // trade is from a standard account (the all-empty-column filter strips them).
  'num_contracts',
  'dollar_per_sl_unit_override',
  'calculated_risk_dollars',
  'spec_source',
  'notes',
] as const;

function escapeCSV(value: unknown): string {
  if (value == null) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function getExportValues(trade: Trade): string[] {
  const tradeScreens = trade.trade_screens ?? [];
  const tradeScreensStr = tradeScreens.filter(Boolean).join(',');
  const bool = (v: boolean | null | undefined) =>
    v === true ? 'true' : v === false ? 'false' : '';
  return [
    tradeScreensStr,
    formatTradeTimeForDisplay(trade.trade_time),
    trade.trade_date,
    trade.day_of_week,
    trade.market,
    trade.setup_type,
    trade.liquidity ?? '',
    String(trade.sl_size ?? ''),
    trade.direction,
    trade.trade_outcome,
    bool(trade.reentry ?? null),
    bool(trade.news_related ?? null),
    trade.mss,
    String(trade.risk_reward_ratio ?? ''),
    String(trade.risk_reward_ratio_long ?? ''),
    bool(trade.local_high_low ?? null),
    String(trade.risk_per_trade ?? ''),
    String(trade.calculated_profit ?? ''),
    trade.mode ?? '',
    String(trade.pnl_percentage ?? ''),
    trade.quarter ?? '',
    trade.evaluation ?? '',
    bool(trade.partials_taken ?? null),
    bool(trade.executed ?? null),
    bool(trade.launch_hour ?? null),
    String(trade.fvg_size ?? ''),
    trade.trend ?? '',
    String(trade.confidence_at_entry ?? ''),
    String(trade.mind_state_at_entry ?? ''),
    trade.be_final_result ?? '',
    trade.news_name ?? '',
    String(trade.news_intensity ?? ''),
    String(trade.num_contracts ?? ''),
    String(trade.dollar_per_sl_unit_override ?? ''),
    String(trade.calculated_risk_dollars ?? ''),
    trade.spec_source ?? '',
    trade.notes ?? '',
  ];
}

/** True if at least one export column has a non-empty value. */
function hasAnyExportValue(trade: Trade): boolean {
  const values = getExportValues(trade);
  return values.some((v) => String(v).trim() !== '');
}

/** Column indices that have at least one non-empty value across the given trades. */
function getNonEmptyColumnIndices(trades: Trade[]): number[] {
  if (trades.length === 0) return [];
  const numCols = EXPORT_HEADERS.length;
  const indices: number[] = [];
  for (let i = 0; i < numCols; i++) {
    const hasValue = trades.some((t) => {
      const v = getExportValues(t)[i];
      return String(v).trim() !== '';
    });
    if (hasValue) indices.push(i);
  }
  return indices;
}

/**
 * Build CSV content from an array of trades.
 * Trades with no values in any export column are omitted.
 * Columns that are empty for every trade are omitted (no header, no cells).
 */
export function buildTradesCsvContent(trades: Trade[]): string {
  const withData = trades.filter(hasAnyExportValue);
  const columnIndices = getNonEmptyColumnIndices(withData);
  if (columnIndices.length === 0) return '';

  const headerRow = columnIndices
    .map((i) => EXPORT_HEADERS[i])
    .map(escapeCSV)
    .join(',');
  const dataRows = withData.map((trade) => {
    const values = getExportValues(trade);
    return columnIndices
      .map((i) => values[i])
      .map(escapeCSV)
      .join(',');
  });
  return [headerRow, ...dataRows].join('\n');
}

export interface ExportTradesToCsvOptions {
  /** Trades to export */
  trades: Trade[];
  /** Filename without extension, e.g. "trades_2024-01-01_to_2024-12-31" */
  filename: string;
}

/**
 * Export trades to a CSV file and trigger download in the browser.
 */
export function exportTradesToCsv(options: ExportTradesToCsvOptions): void {
  const { trades, filename } = options;
  const csvContent = buildTradesCsvContent(trades);
  if (!csvContent) return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
