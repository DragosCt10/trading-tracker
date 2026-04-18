/**
 * Performance Benchmark — server-side Trade Ledger PDF generation.
 *
 * Validates that 20k trades render well below the Vercel 60s function limit.
 * Targets (p95, Node local, M-class hardware):
 *   100  trades → < 500 ms, PDF < 80 KB
 *   1k   trades → < 2 s,    PDF < 300 KB
 *   5k   trades → < 8 s,    PDF < 1.2 MB
 *   10k  trades → < 18 s,   PDF < 2.5 MB
 *   20k  trades → < 30 s,   PDF < 5 MB
 *
 * Run:
 *   npm run bench
 */

import { bench, describe } from 'vitest';
import { renderReport } from '@/lib/server/tradeLedger/renderReport';
import { defaultReportConfig } from '@/lib/tradeLedger/reportConfig';
import type { Trade } from '@/types/trade';

const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

function makeDeterministicTrades(count: number): Trade[] {
  // LCG for reproducibility across runs (no randomness means benchmarks compare apples to apples).
  let seed = 0x9E3779B1;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  };

  const markets = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'US500'];
  const directions = ['Long', 'Short'] as const;
  const setups = ['BOS', 'IFVG', 'MSS', 'Sweep'];
  const liquidities = ['Internal', 'External'];
  const mssVals = ['Normal', 'Aggressive', 'Wick', 'Internal'];

  const out: Trade[] = [];
  const start = new Date('2020-01-01').getTime();
  const end = new Date('2026-04-01').getTime();
  const span = end - start;

  for (let i = 0; i < count; i++) {
    const r = next();
    const win = (r & 1) === 0;
    const profit = win ? 50 + (r % 200) : -(50 + (r % 150));
    const day = new Date(start + ((r % 10000) / 10000) * span);

    out.push({
      id: `bench-${i.toString(16).padStart(8, '0')}`,
      user_id: '99999999-9999-9999-9999-999999999999',
      account_id: ACCOUNT_ID,
      trade_screens: ['', '', '', ''],
      trade_time: `${(r % 24).toString().padStart(2, '0')}:${((r >> 4) % 60).toString().padStart(2, '0')}:00`,
      trade_date: day.toISOString().slice(0, 10),
      day_of_week: day.toLocaleDateString('en-US', { weekday: 'long' }),
      market: markets[r % markets.length],
      setup_type: setups[r % setups.length],
      liquidity: liquidities[r % liquidities.length],
      sl_size: 5 + (r % 20),
      direction: directions[r % 2],
      trade_outcome: win ? 'Win' : 'Lose',
      session: 'London',
      mss: mssVals[r % mssVals.length],
      local_high_low: false,
      quarter: 'Q2',
      evaluation: 'A',
      partials_taken: false,
      executed: true,
      launch_hour: false,
      trend: null,
      calculated_profit: profit,
      risk_per_trade: 0.5,
      risk_reward_ratio: win ? 1 + (r % 3) : 0,
      break_even: false,
      reentry: false,
      news_related: false,
    });
  }

  return out;
}

const PERIOD = { start: '2020-01-01', end: '2026-04-01' };
const ACCOUNTS = [
  { id: ACCOUNT_ID, name: 'Bench Account', currency: 'USD', accountBalance: 100_000 },
];

async function runAt(count: number) {
  const cfg = defaultReportConfig(ACCOUNT_ID, 'live', PERIOD);
  cfg.sections.coreStatistics = { enabled: true, picks: ['total_profit', 'win_rate', 'total_trades'] };
  const trades = makeDeterministicTrades(count);
  const out = await renderReport({
    config: cfg,
    trades,
    accounts: ACCOUNTS,
    traderName: 'Bench Trader',
    context: { via: 'download' },
  });
  return out.pdf.byteLength;
}

describe('renderReport — scaling benchmarks', () => {
  bench('100 trades',    async () => { await runAt(100); },    { iterations: 5 });
  bench('1,000 trades',  async () => { await runAt(1_000); },  { iterations: 3 });
  bench('5,000 trades',  async () => { await runAt(5_000); },  { iterations: 2 });
  bench('10,000 trades', async () => { await runAt(10_000); }, { iterations: 2 });
  bench('20,000 trades', async () => { await runAt(20_000); }, { iterations: 1 });
});
