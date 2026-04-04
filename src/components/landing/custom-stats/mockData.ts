import type { EquityPoint } from '@/components/dashboard/analytics/EquityCurveChart';
import type { Trade } from '@/types/trade';

/* Mock equity data for the card chart */
export const MOCK_EQUITY: EquityPoint[] = [
  { date: '2026-01-06T09:00:00', profit: 0 },
  { date: '2026-01-07T10:00:00', profit: 420 },
  { date: '2026-01-08T11:00:00', profit: 280 },
  { date: '2026-01-09T14:00:00', profit: 860 },
  { date: '2026-01-13T09:30:00', profit: 1100 },
  { date: '2026-01-14T10:00:00', profit: 980 },
  { date: '2026-01-15T11:00:00', profit: 1450 },
  { date: '2026-01-16T14:00:00', profit: 1900 },
  { date: '2026-01-20T09:00:00', profit: 2200 },
  { date: '2026-01-21T10:30:00', profit: 2050 },
  { date: '2026-01-22T11:00:00', profit: 2600 },
  { date: '2026-01-23T14:00:00', profit: 2800 },
  { date: '2026-01-27T09:30:00', profit: 3200 },
];

export const CARD_PILLS = ['Long', 'DAX', 'London', 'Win', 'Q1'];

function placeholderSvg(label: string) {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect fill='%231e293b' width='640' height='360'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' font-weight='600' fill='%2364748b'%3E${encodeURIComponent(label)}%3C/text%3E%3C/svg%3E`;
}

export const MOCK_DASHBOARD_TRADES: Trade[] = [
  { id: 'm1', trade_date: '2026-01-06', trade_time: '09:30', market: 'DAX', direction: 'Long', trade_outcome: 'Win', calculated_profit: 420, risk_reward: 2.5, risk_percentage: 0.5, executed: true, break_even: false, trade_screens: [placeholderSvg('Image 1'), placeholderSvg('Image 2')], trade_screen_timeframes: ['4H', '1H'], strategy_id: '', user_id: '', created_at: '', updated_at: '' },
  { id: 'm2', trade_date: '2026-01-07', trade_time: '10:15', market: 'DAX', direction: 'Long', trade_outcome: 'Lose', calculated_profit: -150, risk_reward: 0, risk_percentage: 0.5, executed: true, break_even: false, trade_screens: [placeholderSvg('Image 1'), placeholderSvg('Image 2'), placeholderSvg('Image 3'), placeholderSvg('Image 4')], trade_screen_timeframes: ['15m', '5m', '1H', '4H'], strategy_id: '', user_id: '', created_at: '', updated_at: '' },
  { id: 'm3', trade_date: '2026-01-08', trade_time: '09:45', market: 'DAX', direction: 'Long', trade_outcome: 'Win', calculated_profit: 580, risk_reward: 3.2, risk_percentage: 0.5, executed: true, break_even: false, trade_screens: [placeholderSvg('Image 1'), placeholderSvg('Image 2'), placeholderSvg('Image 3')], trade_screen_timeframes: ['1H', '15m', '5m'], strategy_id: '', user_id: '', created_at: '', updated_at: '' },
  { id: 'm4', trade_date: '2026-01-09', trade_time: '10:00', market: 'DAX', direction: 'Long', trade_outcome: 'Win', calculated_profit: 300, risk_reward: 1.8, risk_percentage: 0.5, executed: true, break_even: false, trade_screens: [placeholderSvg('Image 1'), placeholderSvg('Image 2')], trade_screen_timeframes: ['4H', '15m'], strategy_id: '', user_id: '', created_at: '', updated_at: '' },
] as unknown as Trade[];

export const DASHBOARD_CARD_CLASS = 'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm';
