import { Trade } from '@/types/trade';

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  HKD: 'HK$',
  NZD: 'NZ$',
} as const;

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getCurrencySymbolFromAccount(
  account?: { currency?: string | null }
): string {
  if (!account?.currency) return '$';
  return (
    CURRENCY_SYMBOLS[account.currency as keyof typeof CURRENCY_SYMBOLS] ??
    account.currency
  );
}

// Compute monthly stats from trades array (for account overview profit only)
export function computeMonthlyStatsFromTrades(
  trades: Trade[],
): { [key: string]: { profit: number } } {
  const monthlyData: { [key: string]: { profit: number } } = {};

  trades.forEach((trade) => {
    const tradeDate = new Date(trade.trade_date);
    const monthName = MONTHS[tradeDate.getMonth()];
    const profit = trade.calculated_profit || 0;

    if (!monthlyData[monthName]) {
      monthlyData[monthName] = { profit: 0 };
    }

    monthlyData[monthName].profit += profit;
  });

  return monthlyData;
}

export function calculateTotalYearProfit(
  monthlyStats: { [month: string]: { profit: number } }
): number {
  return Object.values(monthlyStats).reduce(
    (sum, s) => sum + (s.profit || 0),
    0
  );
}

export function calculateUpdatedBalance(
  accountBalance: number | null | undefined,
  totalYearProfit: number
): number {
  return (accountBalance ?? 0) + totalYearProfit;
}

/** Normalized account balance for overview PnL % (avoids division by zero). */
export function getAccountBalanceForOverview(
  accountBalance: number | null | undefined
): number {
  return accountBalance || 1;
}

/** PnL % for overview: (totalYearProfit / accountBalance) * 100. */
export function calculatePnlPercentFromOverview(
  totalYearProfit: number,
  accountBalance: number | null | undefined
): number {
  return (totalYearProfit / getAccountBalanceForOverview(accountBalance)) * 100;
}
