import type { Trade } from '@/types/trade';
import { formatTradeTimeForDisplay } from '@/utils/formatTradeTime';

const CSV_HEADERS = [
  'Date',
  'Time',
  'Day of Week',
  'Market',
  'Direction',
  'Setup',
  'Outcome',
  'Risk %',
  'Trade Screen 1',
  'Trade Screen 2',
  'Trade Screen 3',
  'Trade Screen 4',
  'Local High/Low',
  'News Related',
  'ReEntry',
  'Break Even',
  'MSS',
  'Risk:Reward Ratio',
  'Risk:Reward Ratio Long',
  'SL Size',
  'Calculated Profit',
  'P/L %',
  'Evaluation',
  'Notes',
  'Executed',
  'Trend',
  'FVG Size',
] as const;

function escapeCSV(value: unknown): string {
  if (value == null) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function tradeToCsvRow(trade: Trade): string {
  return [
    trade.trade_date,
    formatTradeTimeForDisplay(trade.trade_time),
    trade.day_of_week,
    trade.market,
    trade.direction,
    trade.setup_type,
    trade.trade_outcome,
    trade.risk_per_trade,
    trade.trade_screens?.[0] ?? '',
    trade.trade_screens?.[1] ?? '',
    trade.trade_screens?.[2] ?? '',
    trade.trade_screens?.[3] ?? '',
    trade.local_high_low ? 'Yes' : 'No',
    trade.news_related ? 'Yes' : 'No',
    trade.reentry ? 'Yes' : 'No',
    trade.break_even ? 'Yes' : 'No',
    trade.mss,
    trade.risk_reward_ratio,
    trade.risk_reward_ratio_long,
    trade.sl_size,
    trade.calculated_profit ?? '',
    trade.pnl_percentage ?? '',
    trade.evaluation ?? '',
    trade.notes ?? '',
    trade.executed ? 'Yes' : 'No',
    trade.trend ?? '',
    trade.fvg_size ?? '',
  ]
    .map(escapeCSV)
    .join(',');
}

/**
 * Build CSV content from an array of trades (same columns as Manage Trades export).
 */
export function buildTradesCsvContent(trades: Trade[]): string {
  const headerRow = CSV_HEADERS.map(escapeCSV).join(',');
  const dataRows = trades.map(tradeToCsvRow);
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
 * Uses the same column set as Manage Trades export.
 */
export function exportTradesToCsv(options: ExportTradesToCsvOptions): void {
  const { trades, filename } = options;
  if (trades.length === 0) return;

  const csvContent = buildTradesCsvContent(trades);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
